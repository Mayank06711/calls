import { Socket } from "socket.io";
import { SocketManager } from "../socket";
import { RedisManager } from "../utils/redisClient";
import { CallModel } from "../models/callModel";
import { UserModel } from "../models/userModel";
import { SubscriptionModel } from "../models/subscriptionModel";
import { SubscriptionHistoryModel } from "../models/subscriptionHistoryModel";
import { ServiceModel } from "../models/callsModel";
import { SUBSCRIPTION_CONFIG, SubscriptionTier } from "../helper/constants";
import { Types } from "mongoose";

class CallController {
  private static instance: CallController | null = null;
  private readonly socketManager: SocketManager;

  // Active ring timeouts: callId → timeout handle
  private ringTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private readonly RING_TIMEOUT_MS = 30_000; // 30 seconds

  private readonly REDIS_BUSY_GROUP = "call:busy";
  private readonly REDIS_BUSY_TTL = 3600; // 1 hour max (cleaned up on call end)

  private readonly CALL_EVENTS = {
    INITIATE: "call:initiate",
    INCOMING: "call:incoming",
    ACCEPT: "call:accept",
    ACCEPTED: "call:accepted",
    REJECT: "call:reject",
    REJECTED: "call:rejected",
    END: "call:end",
    ENDED: "call:ended",
    MISSED: "call:missed",
    MISSED_INCOMING: "call:missed-incoming",
    BUSY: "call:busy",
    OFFER: "call:offer",
    ANSWER: "call:answer",
    ICE_CANDIDATE: "call:ice-candidate",
    TOGGLE_VIDEO: "call:toggle-video",
    TOGGLE_AUDIO: "call:toggle-audio",
    MEDIA_STATE: "call:media-state",
  } as const;

  private constructor() {
    this.socketManager = SocketManager.getInstance();
    console.log("[CallController] Initialized");
  }

  public static getInstance(): CallController {
    if (!CallController.instance) {
      CallController.instance = new CallController();
    }
    return CallController.instance;
  }

  // ─── Redis busy helpers ───────────────────────────────────────

  private async setUserBusy(
    userId: string,
    callId: string
  ): Promise<void> {
    await RedisManager.cacheDataInGroup(
      this.REDIS_BUSY_GROUP,
      userId,
      { callId, since: Date.now() },
      this.REDIS_BUSY_TTL
    );
  }

  private async clearUserBusy(userId: string): Promise<void> {
    await RedisManager.removeDataFromGroup(this.REDIS_BUSY_GROUP, userId);
  }

  private async isUserBusy(
    userId: string
  ): Promise<{ busy: boolean; callId?: string }> {
    const data = await RedisManager.getDataFromGroup<{
      callId: string;
      since: number;
    }>(this.REDIS_BUSY_GROUP, userId);
    if (data && data.callId) {
      return { busy: true, callId: data.callId };
    }
    return { busy: false };
  }

  // ─── Emit to a specific user's socket ─────────────────────────

  private async emitToUser(
    userId: string,
    event: string,
    data: any
  ): Promise<boolean> {
    const userSocket = await this.socketManager.getSocketIdUsingUserId(userId);
    if (!userSocket) return false;

    await this.socketManager.emitEvent({
      event,
      data,
      targetSocketIds: [userSocket.socketId],
    });
    return true;
  }

  // ─── Check subscription video call limit ──────────────────────

  private async checkVideoCallLimit(
    userId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Get user's active subscription
      const subscription = await SubscriptionModel.findOne({
        userId: new Types.ObjectId(userId),
        status: "Active",
        paymentStatus: "Completed",
      });

      // Default to Free tier if no active subscription
      const tier: SubscriptionTier = subscription?.type as SubscriptionTier || "Free";
      const tierConfig = SUBSCRIPTION_CONFIG.TIERS[tier];
      const monthlyLimit = tierConfig.limits["Video Calls Per Month"] as number;

      // Count completed calls this month for this user (as caller or callee)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const callsThisMonth = await CallModel.countDocuments({
        $or: [
          { caller: new Types.ObjectId(userId) },
          { callee: new Types.ObjectId(userId) },
        ],
        status: { $in: ["completed", "accepted", "ringing"] },
        createdAt: { $gte: startOfMonth },
      });

      if (callsThisMonth >= monthlyLimit) {
        return {
          allowed: false,
          reason: `Monthly video call limit reached (${monthlyLimit} calls for ${tier} tier)`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error("[CallController] checkVideoCallLimit error:", error);
      // Allow call on error to not block users due to DB issues
      return { allowed: true };
    }
  }

  // ─── Track video consultation usage in subscription history ───

  private async incrementVideoConsultationUsage(userId: string): Promise<void> {
    try {
      // Find the user's subscription history and increment the active subscription's videoConsultationsUsed
      const history = await SubscriptionHistoryModel.findOne({
        userId: new Types.ObjectId(userId),
      });

      if (!history) return;

      // Find the active subscription entry
      const activeSub = history.subscriptions.find(
        (sub: any) => sub.status === "Active" && new Date(sub.endDate) > new Date()
      );

      if (activeSub && activeSub.features) {
        activeSub.features.videoConsultationsUsed =
          (activeSub.features.videoConsultationsUsed || 0) + 1;
      }

      // Also increment total in statistics
      if (history.statistics?.featureUsage) {
        history.statistics.featureUsage.totalVideoConsultations =
          (history.statistics.featureUsage.totalVideoConsultations || 0) + 1;
      }

      history.lastUpdated = new Date();
      await history.save();
    } catch (error) {
      console.error("[CallController] incrementVideoConsultationUsage error:", error);
    }
  }

  // ─── Create Service record for expert-user calls ──────────────

  private async createServiceRecord(
    callId: string,
    callerId: string,
    calleeId: string,
    duration: number,
    forcedEnd: boolean
  ): Promise<void> {
    try {
      // Check if either party is an expert
      const [callerUser, calleeUser] = await Promise.all([
        UserModel.findById(callerId).select("isExpert").lean(),
        UserModel.findById(calleeId).select("isExpert").lean(),
      ]);

      let userId: string | null = null;
      let expertId: string | null = null;

      if (callerUser && (callerUser as any).isExpert) {
        expertId = callerId;
        userId = calleeId;
      } else if (calleeUser && (calleeUser as any).isExpert) {
        expertId = calleeId;
        userId = callerId;
      }

      // Only create a Service record if one party is an expert
      if (!userId || !expertId) return;

      // Calculate amount based on duration (per-minute rate from consultation rules)
      // Using maxDuration of 45 minutes as baseline from VIDEO_CONSULTATION_RULES
      const durationMinutes = Math.ceil(duration / 60);
      const ratePerMinute = 5; // Base rate — can be configurable per expert later
      const amount = durationMinutes * ratePerMinute;

      await ServiceModel.create({
        user: new Types.ObjectId(userId),
        expert: new Types.ObjectId(expertId),
        callId: new Types.ObjectId(callId),
        duration,
        amount,
        forcedEnd,
        type: "expert",
      });

      console.log(
        `[CallController] Service record created for call ${callId}: user=${userId}, expert=${expertId}, duration=${duration}s, amount=${amount}`
      );
    } catch (error) {
      console.error("[CallController] createServiceRecord error:", error);
    }
  }

  // ─── Setup socket listeners for an authenticated socket ───────

  public setupAuthenticatedSocketListeners(socket: Socket): void {
    if (!socket.data.authenticated || !socket.data.userId) {
      console.log(
        `[CallController] Socket ${socket.id} not authenticated, skipping`
      );
      return;
    }

    const userId = socket.data.userId?.toString();
    console.log(
      `[CallController] Setting up call listeners for socket ${socket.id} (user ${userId})`
    );

    // ── call:initiate ──
    socket.on(
      this.CALL_EVENTS.INITIATE,
      async (data: { calleeId: string }, callback?: Function) => {
        try {
          const result = await this.handleCallInitiate(userId, data.calleeId);
          if (callback) callback(result);
        } catch (error) {
          console.error("[CallController] initiate error:", error);
          if (callback)
            callback({
              status: "error",
              errorCode: "SERVER_ERROR",
              message: "Failed to initiate call",
            });
        }
      }
    );

    // ── call:accept ──
    socket.on(
      this.CALL_EVENTS.ACCEPT,
      async (data: { callId: string }, callback?: Function) => {
        try {
          const result = await this.handleCallAccept(userId, data.callId);
          if (callback) callback(result);
        } catch (error) {
          console.error("[CallController] accept error:", error);
          if (callback)
            callback({ status: "error", message: "Failed to accept call" });
        }
      }
    );

    // ── call:reject ──
    socket.on(
      this.CALL_EVENTS.REJECT,
      async (data: { callId: string; reason?: string }, callback?: Function) => {
        try {
          const result = await this.handleCallReject(
            userId,
            data.callId,
            data.reason
          );
          if (callback) callback(result);
        } catch (error) {
          console.error("[CallController] reject error:", error);
          if (callback)
            callback({ status: "error", message: "Failed to reject call" });
        }
      }
    );

    // ── call:end ──
    socket.on(
      this.CALL_EVENTS.END,
      async (data: { callId: string; reason?: string }, callback?: Function) => {
        try {
          const result = await this.handleCallEnd(
            userId,
            data.callId,
            data.reason
          );
          if (callback) callback(result);
        } catch (error) {
          console.error("[CallController] end error:", error);
          if (callback)
            callback({ status: "error", message: "Failed to end call" });
        }
      }
    );

    // ── SDP / ICE relay events (fire-and-forget, no callback) ──
    socket.on(
      this.CALL_EVENTS.OFFER,
      async (data: { callId: string; sdp: any }) => {
        await this.handleRelayEvent(userId, data.callId, this.CALL_EVENTS.OFFER, {
          callId: data.callId,
          sdp: data.sdp,
        });
      }
    );

    socket.on(
      this.CALL_EVENTS.ANSWER,
      async (data: { callId: string; sdp: any }) => {
        await this.handleRelayEvent(
          userId,
          data.callId,
          this.CALL_EVENTS.ANSWER,
          { callId: data.callId, sdp: data.sdp }
        );
      }
    );

    socket.on(
      this.CALL_EVENTS.ICE_CANDIDATE,
      async (data: { callId: string; candidate: any }) => {
        await this.handleRelayEvent(
          userId,
          data.callId,
          this.CALL_EVENTS.ICE_CANDIDATE,
          { callId: data.callId, candidate: data.candidate }
        );
      }
    );

    // ── Media toggle relay ──
    socket.on(
      this.CALL_EVENTS.TOGGLE_VIDEO,
      async (data: { callId: string; enabled: boolean }) => {
        await this.handleToggleMedia(userId, data.callId, "video", data.enabled);
      }
    );

    socket.on(
      this.CALL_EVENTS.TOGGLE_AUDIO,
      async (data: { callId: string; enabled: boolean }) => {
        await this.handleToggleMedia(userId, data.callId, "audio", data.enabled);
      }
    );

    // ── Handle disconnect during active call ──
    socket.on("disconnect", async () => {
      await this.handleDisconnectDuringCall(userId);
    });
  }

  // ─── Call Initiation ──────────────────────────────────────────

  private async handleCallInitiate(
    callerId: string,
    calleeId: string
  ): Promise<any> {
    // Self-call check
    if (callerId === calleeId) {
      return { status: "error", errorCode: "SELF_CALL", message: "Cannot call yourself" };
    }

    // Check callee online
    const calleeSocket = await this.socketManager.getSocketIdUsingUserId(calleeId);
    if (!calleeSocket) {
      return { status: "error", errorCode: "CALLEE_OFFLINE", message: "User is offline" };
    }

    // Check caller busy
    const callerBusy = await this.isUserBusy(callerId);
    if (callerBusy.busy) {
      return { status: "error", errorCode: "CALLER_BUSY", message: "You are already in a call" };
    }

    // Check callee busy
    const calleeBusy = await this.isUserBusy(calleeId);
    if (calleeBusy.busy) {
      return { status: "error", errorCode: "CALLEE_BUSY", message: "User is busy" };
    }

    // Check subscription video call limit for caller
    const limitCheck = await this.checkVideoCallLimit(callerId);
    if (!limitCheck.allowed) {
      return {
        status: "error",
        errorCode: "CALL_LIMIT_REACHED",
        message: limitCheck.reason,
      };
    }

    // Create call document
    const call = await CallModel.create({
      caller: new Types.ObjectId(callerId),
      callee: new Types.ObjectId(calleeId),
      status: "ringing",
      callType: "video",
      startedAt: new Date(),
    });

    const callId = (call._id as Types.ObjectId).toString();

    // Mark both users as busy
    await Promise.all([
      this.setUserBusy(callerId, callId),
      this.setUserBusy(calleeId, callId),
    ]);

    // Look up caller info for the incoming call notification
    const callerUser = await UserModel.findById(callerId)
      .select("fullName profilePhotoId")
      .lean();

    // Emit incoming call to callee with caller details
    await this.emitToUser(calleeId, this.CALL_EVENTS.INCOMING, {
      callId,
      callerId,
      callerName: callerUser?.fullName || "Unknown",
      callerAvatar: (callerUser as any)?.profilePhotoId || null,
    });

    // Start ring timeout (30s)
    const timeout = setTimeout(async () => {
      this.ringTimeouts.delete(callId);
      await this.handleRingTimeout(callId, callerId, calleeId);
    }, this.RING_TIMEOUT_MS);

    this.ringTimeouts.set(callId, timeout);

    console.log(
      `[CallController] Call ${callId} initiated: ${callerId} → ${calleeId}`
    );

    return { status: "ok", callId };
  }

  // ─── Ring Timeout ─────────────────────────────────────────────

  private async handleRingTimeout(
    callId: string,
    callerId: string,
    calleeId: string
  ): Promise<void> {
    try {
      const call = await CallModel.findById(callId);
      if (!call || call.status !== "ringing") return; // Already handled

      call.status = "missed";
      call.endedAt = new Date();
      call.endReason = "timeout";
      await call.save();

      // Clear busy
      await Promise.all([
        this.clearUserBusy(callerId),
        this.clearUserBusy(calleeId),
      ]);

      // Look up caller name for the missed-incoming notification
      const callerUser = await UserModel.findById(callerId)
        .select("fullName")
        .lean();

      // Notify both
      await this.emitToUser(callerId, this.CALL_EVENTS.MISSED, {
        callId,
        calleeId,
      });
      await this.emitToUser(calleeId, this.CALL_EVENTS.MISSED_INCOMING, {
        callId,
        callerId,
        callerName: callerUser?.fullName || "Unknown",
      });

      console.log(`[CallController] Call ${callId} missed (timeout)`);
    } catch (error) {
      console.error("[CallController] handleRingTimeout error:", error);
    }
  }

  // ─── Call Accept ──────────────────────────────────────────────

  private async handleCallAccept(
    calleeId: string,
    callId: string
  ): Promise<any> {
    // Clear ring timeout
    const timeout = this.ringTimeouts.get(callId);
    if (timeout) {
      clearTimeout(timeout);
      this.ringTimeouts.delete(callId);
    }

    const call = await CallModel.findById(callId);
    if (!call || call.status !== "ringing") {
      return { status: "error", message: "Call not found or not ringing" };
    }

    call.status = "accepted";
    call.answeredAt = new Date();
    await call.save();

    const callerId = call.caller.toString();

    // Notify caller that callee accepted → caller creates SDP offer
    await this.emitToUser(callerId, this.CALL_EVENTS.ACCEPTED, {
      callId,
      calleeId,
    });

    console.log(`[CallController] Call ${callId} accepted by ${calleeId}`);

    return { status: "ok", callId };
  }

  // ─── Call Reject ──────────────────────────────────────────────

  private async handleCallReject(
    calleeId: string,
    callId: string,
    reason?: string
  ): Promise<any> {
    // Clear ring timeout
    const timeout = this.ringTimeouts.get(callId);
    if (timeout) {
      clearTimeout(timeout);
      this.ringTimeouts.delete(callId);
    }

    const call = await CallModel.findById(callId);
    if (!call || call.status !== "ringing") {
      return { status: "error", message: "Call not found or not ringing" };
    }

    const callerId = call.caller.toString();

    call.status = "rejected";
    call.endedAt = new Date();
    call.endReason = reason || "declined";
    call.endedBy = new Types.ObjectId(calleeId);
    await call.save();

    // Clear busy
    await Promise.all([
      this.clearUserBusy(callerId),
      this.clearUserBusy(calleeId),
    ]);

    // Notify caller
    await this.emitToUser(callerId, this.CALL_EVENTS.REJECTED, {
      callId,
      reason: reason || "declined",
    });

    console.log(`[CallController] Call ${callId} rejected by ${calleeId}`);

    return { status: "ok" };
  }

  // ─── Call End ─────────────────────────────────────────────────

  private async handleCallEnd(
    userId: string,
    callId: string,
    reason?: string
  ): Promise<any> {
    // Clear ring timeout if still ringing
    const timeout = this.ringTimeouts.get(callId);
    if (timeout) {
      clearTimeout(timeout);
      this.ringTimeouts.delete(callId);
    }

    const call = await CallModel.findById(callId);
    if (!call) {
      return { status: "error", message: "Call not found" };
    }

    const callerId = call.caller.toString();
    const calleeId = call.callee.toString();
    const otherUserId = userId === callerId ? calleeId : callerId;

    // Calculate duration if call was answered
    let duration: number | undefined;
    if (call.answeredAt) {
      duration = Math.round(
        (Date.now() - call.answeredAt.getTime()) / 1000
      );
    }

    call.status = "completed";
    call.endedAt = new Date();
    call.endedBy = new Types.ObjectId(userId);
    call.endReason = reason || "hangup";
    if (duration !== undefined) call.duration = duration;
    await call.save();

    // Clear busy
    await Promise.all([
      this.clearUserBusy(callerId),
      this.clearUserBusy(calleeId),
    ]);

    // Notify other party
    await this.emitToUser(otherUserId, this.CALL_EVENTS.ENDED, {
      callId,
      reason: reason || "hangup",
      duration,
      endedBy: userId,
    });

    // Post-call: track usage and create Service record (non-blocking)
    if (duration !== undefined && duration > 0) {
      // Increment video consultation usage for both parties
      Promise.all([
        this.incrementVideoConsultationUsage(callerId),
        this.incrementVideoConsultationUsage(calleeId),
      ]).catch((err) =>
        console.error("[CallController] usage tracking error:", err)
      );

      // Create Service record if one party is an expert
      this.createServiceRecord(
        callId,
        callerId,
        calleeId,
        duration,
        reason === "disconnect"
      ).catch((err) =>
        console.error("[CallController] service record error:", err)
      );
    }

    console.log(
      `[CallController] Call ${callId} ended by ${userId} (${duration ?? 0}s)`
    );

    return { status: "ok", duration };
  }

  // ─── SDP/ICE Relay ────────────────────────────────────────────

  private async handleRelayEvent(
    senderId: string,
    callId: string,
    event: string,
    payload: any
  ): Promise<void> {
    try {
      const call = await CallModel.findById(callId);
      if (!call) return;

      const callerId = call.caller.toString();
      const calleeId = call.callee.toString();
      const targetUserId = senderId === callerId ? calleeId : callerId;

      await this.emitToUser(targetUserId, event, payload);
    } catch (error) {
      console.error(`[CallController] relay ${event} error:`, error);
    }
  }

  // ─── Media Toggle Relay ───────────────────────────────────────

  private async handleToggleMedia(
    userId: string,
    callId: string,
    mediaType: "video" | "audio",
    enabled: boolean
  ): Promise<void> {
    try {
      const call = await CallModel.findById(callId);
      if (!call) return;

      const callerId = call.caller.toString();
      const calleeId = call.callee.toString();
      const targetUserId = userId === callerId ? calleeId : callerId;

      await this.emitToUser(targetUserId, this.CALL_EVENTS.MEDIA_STATE, {
        callId,
        userId,
        [mediaType]: enabled,
      });
    } catch (error) {
      console.error("[CallController] toggleMedia error:", error);
    }
  }

  // ─── Disconnect During Active Call ────────────────────────────

  private async handleDisconnectDuringCall(userId: string): Promise<void> {
    try {
      const busyData = await this.isUserBusy(userId);
      if (!busyData.busy || !busyData.callId) return;

      const callId = busyData.callId;
      const call = await CallModel.findById(callId);
      if (!call) {
        await this.clearUserBusy(userId);
        return;
      }

      // If call is still ringing or accepted/in-progress, end it
      if (["ringing", "accepted"].includes(call.status)) {
        const callerId = call.caller.toString();
        const calleeId = call.callee.toString();
        const otherUserId = userId === callerId ? calleeId : callerId;

        // Clear ring timeout
        const timeout = this.ringTimeouts.get(callId);
        if (timeout) {
          clearTimeout(timeout);
          this.ringTimeouts.delete(callId);
        }

        // Calculate duration
        let duration: number | undefined;
        if (call.answeredAt) {
          duration = Math.round(
            (Date.now() - call.answeredAt.getTime()) / 1000
          );
        }

        call.status = call.answeredAt ? "completed" : "failed";
        call.endedAt = new Date();
        call.endedBy = new Types.ObjectId(userId);
        call.endReason = "disconnect";
        if (duration !== undefined) call.duration = duration;
        await call.save();

        // Clear busy for both
        await Promise.all([
          this.clearUserBusy(callerId),
          this.clearUserBusy(calleeId),
        ]);

        // Notify other user
        await this.emitToUser(otherUserId, this.CALL_EVENTS.ENDED, {
          callId,
          reason: "disconnect",
          duration,
          endedBy: userId,
        });

        // Post-call: track usage and create Service record for completed calls
        if (duration !== undefined && duration > 0) {
          Promise.all([
            this.incrementVideoConsultationUsage(callerId),
            this.incrementVideoConsultationUsage(calleeId),
          ]).catch((err) =>
            console.error("[CallController] usage tracking error:", err)
          );

          this.createServiceRecord(
            callId,
            callerId,
            calleeId,
            duration,
            true // forcedEnd = true for disconnect
          ).catch((err) =>
            console.error("[CallController] service record error:", err)
          );
        }

        console.log(
          `[CallController] Call ${callId} ended due to disconnect by ${userId}`
        );
      }
    } catch (error) {
      console.error("[CallController] handleDisconnectDuringCall error:", error);
    }
  }
}

export { CallController };
