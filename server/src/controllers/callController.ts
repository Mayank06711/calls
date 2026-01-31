import { Socket } from "socket.io";
import { SocketManager } from "../socket";
import { RedisManager } from "../utils/redisClient";
import { CallModel } from "../models/callModel";
import { UserModel } from "../models/userModel";
import { SubscriptionModel } from "../models/subscriptionModel";
import { SubscriptionHistoryModel } from "../models/subscriptionHistoryModel";
import { ServiceModel } from "../models/callsModel";
import { SUBSCRIPTION_CONFIG, CALL_CONFIG, SubscriptionTier } from "../helper/constants";
import { Types } from "mongoose";

class CallController {
  private static instance: CallController | null = null;
  private readonly socketManager: SocketManager;

  // Active ring timeouts: callId → timeout handle
  private ringTimeouts: Map<string, NodeJS.Timeout> = new Map();
  // Active call duration timeouts: callId → [warning1, warning2, autoEnd]
  private callTimers: Map<string, NodeJS.Timeout[]> = new Map();

  private readonly RING_TIMEOUT_MS = CALL_CONFIG.RING_TIMEOUT_SECONDS * 1000;

  private readonly REDIS_BUSY_GROUP = "call:busy";
  private readonly REDIS_BUSY_TTL = 3600; // 1 hour max (cleaned up on call end)
  private readonly REDIS_PERMISSION_GROUP = "call:permission";
  private readonly REDIS_PERMREQ_GROUP = "call:permreq";
  private readonly REDIS_PERM_COOLDOWN_GROUP = "call:permcooldown";
  private readonly PERM_COOLDOWN_SECONDS = 60; // 60s cooldown after decline

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
    REQUEST_PERMISSION: "call:request-permission",
    PERMISSION_REQUEST: "call:permission-request",
    PERMISSION_RESPONSE: "call:permission-response",
    PERMISSION_GRANTED: "call:permission-granted",
    PERMISSION_DENIED: "call:permission-denied",
    TIME_WARNING: "call:time-warning",
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
    userId: string,
    isExpertCall: boolean
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Admin or Expert bypass — no limits
      const user = await UserModel.findById(userId).select("isAdmin isExpert").lean();
      if (user && ((user as any).isAdmin || (user as any).isExpert)) {
        return { allowed: true };
      }

      // Get user's active subscription
      const subscription = await SubscriptionModel.findOne({
        userId: new Types.ObjectId(userId),
        status: "Active",
        paymentStatus: "Completed",
      });

      // Default to Free tier if no active subscription
      const tier: SubscriptionTier = subscription?.type as SubscriptionTier || "Free";

      // User-to-user calls: unlimited for paid subscribers, limited for Free
      if (!isExpertCall) {
        if (!CALL_CONFIG.USER_CALL_LIMITS_APPLY && tier !== "Free") {
          return { allowed: true };
        }
      }

      // Expert calls or Free tier: check monthly count limit
      const tierConfig = SUBSCRIPTION_CONFIG.TIERS[tier];
      const monthlyLimit = tierConfig.limits["Video Calls Per Month"] as number;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // For expert calls, only count calls involving an expert
      // For Free tier user-to-user, count all calls
      let filter: any = {
        $or: [
          { caller: new Types.ObjectId(userId) },
          { callee: new Types.ObjectId(userId) },
        ],
        status: { $in: ["completed", "accepted", "ringing"] },
        createdAt: { $gte: startOfMonth },
      };

      const callsThisMonth = await CallModel.countDocuments(filter);

      if (callsThisMonth >= monthlyLimit) {
        return {
          allowed: false,
          reason: isExpertCall
            ? `Monthly expert call limit reached (${monthlyLimit} for ${tier} tier)`
            : `Monthly video call limit reached (${monthlyLimit} calls for ${tier} tier)`,
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
      const ratePerMinute = CALL_CONFIG.EXPERT_RATE_PER_MINUTE;
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

      // Increment expert's totalCustomersHandled counter (non-blocking)
      import("../models/expertModel").then(({ ExpertModel }) =>
        ExpertModel.findOneAndUpdate(
          { user: new Types.ObjectId(expertId) },
          { $inc: { totalCustomersHandled: 1 } }
        ).catch((err: any) =>
          console.error("[CallController] Expert counter increment error:", err)
        )
      );

      // Link call to user's subscription history consultations (non-blocking)
      SubscriptionHistoryModel.findOne({ userId: new Types.ObjectId(userId) })
        .then((history) => {
          if (!history || !history.subscriptions?.length) return;
          const lastSub = history.subscriptions[history.subscriptions.length - 1];
          if (lastSub) {
            if (!lastSub.consultations) lastSub.consultations = [];
            lastSub.consultations.push({
              date: new Date(),
              stylistId: new Types.ObjectId(expertId),
              status: "Completed",
              duration: Math.ceil(duration / 60),
              sessionType: "video",
            } as any);
            return history.save();
          }
        })
        .catch((err: any) =>
          console.error("[CallController] consultation history push error:", err)
        );

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

    // ── Expert permission flow ──
    socket.on(
      this.CALL_EVENTS.REQUEST_PERMISSION,
      async (data: { userId: string }, callback?: Function) => {
        try {
          const result = await this.handleRequestPermission(userId, data.userId);
          if (callback) callback(result);
        } catch (error) {
          console.error("[CallController] requestPermission error:", error);
          if (callback)
            callback({ status: "error", message: "Failed to request permission" });
        }
      }
    );

    socket.on(
      this.CALL_EVENTS.PERMISSION_RESPONSE,
      async (data: { expertId: string; accepted: boolean }, callback?: Function) => {
        try {
          const result = await this.handlePermissionResponse(userId, data.expertId, data.accepted);
          if (callback) callback(result);
        } catch (error) {
          console.error("[CallController] permissionResponse error:", error);
          if (callback)
            callback({ status: "error", message: "Failed to respond to permission" });
        }
      }
    );

    // ── Handle disconnect during active call or pending permission ──
    socket.on("disconnect", async () => {
      await Promise.all([
        this.handleDisconnectDuringCall(userId),
        this.handleDisconnectDuringPermissionRequest(userId),
      ]);
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

    // Fetch caller role info
    const callerUser = await UserModel.findById(callerId)
      .select("isAdmin isExpert fullName profilePhotoId")
      .lean();
    const isCallerAdmin = !!(callerUser as any)?.isAdmin;
    const isCallerExpert = !!(callerUser as any)?.isExpert;

    // Check callee online
    const calleeSocket = await this.socketManager.getSocketIdUsingUserId(calleeId);
    if (!calleeSocket) {
      return { status: "error", errorCode: "CALLEE_OFFLINE", message: "User is offline" };
    }

    // Admin bypass — skip busy/limit/permission checks
    if (!isCallerAdmin) {
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

      // Expert must have permission to call a non-admin user
      if (isCallerExpert) {
        const calleeUser = await UserModel.findById(calleeId).select("isAdmin").lean();
        const isCalleeAdmin = !!(calleeUser as any)?.isAdmin;
        if (!isCalleeAdmin) {
          const permKey = `${callerId}:${calleeId}`;
          const perm = await RedisManager.getDataFromGroup<{ granted: boolean }>(
            this.REDIS_PERMISSION_GROUP,
            permKey
          );
          if (!perm || !perm.granted) {
            return {
              status: "error",
              errorCode: "PERMISSION_REQUIRED",
              message: "You must request permission before calling this user",
            };
          }
          // Permission used — clear it
          await RedisManager.removeDataFromGroup(this.REDIS_PERMISSION_GROUP, permKey);
        }
      }

      // Determine if this is an expert call (either party is expert)
      const calleeUser2 = isCallerExpert
        ? null
        : await UserModel.findById(calleeId).select("isExpert").lean();
      const isExpertCall = isCallerExpert || !!(calleeUser2 as any)?.isExpert;

      // Check subscription video call limit
      const limitCheck = await this.checkVideoCallLimit(callerId, isExpertCall);
      if (!limitCheck.allowed) {
        return {
          status: "error",
          errorCode: "CALL_LIMIT_REACHED",
          message: limitCheck.reason,
        };
      }
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

    // Emit incoming call to callee with caller details (callerUser already fetched above)
    await this.emitToUser(calleeId, this.CALL_EVENTS.INCOMING, {
      callId,
      callerId,
      callerName: (callerUser as any)?.fullName || "Unknown",
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

    // Start server-side call duration timers (30-min hard cap)
    this.startCallTimers(callId, callerId, calleeId);

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

    // Clear call duration timers
    this.clearCallTimers(callId);

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
        const ringTimeout = this.ringTimeouts.get(callId);
        if (ringTimeout) {
          clearTimeout(ringTimeout);
          this.ringTimeouts.delete(callId);
        }

        // Clear call duration timers
        this.clearCallTimers(callId);

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

        // If callee disconnected during ringing (before answer), also fire call:missed
        // so the caller's UI shows "User went offline" instead of generic end
        if (call.status === "failed" && !call.answeredAt && userId === calleeId) {
          await this.emitToUser(callerId, this.CALL_EVENTS.MISSED, {
            callId,
            calleeId,
            reason: "callee_offline",
          });
        }

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

  // ─── Disconnect During Pending Permission Request ───────────────
  // When a user goes offline while an expert has a pending permission
  // request targeting them, immediately clear the request and notify
  // the expert so they don't wait for the full 60s TTL.

  private async handleDisconnectDuringPermissionRequest(userId: string): Promise<void> {
    try {
      // Scan all pending permission requests
      const allPermReqs = await RedisManager.getAllFromGroup(this.REDIS_PERMREQ_GROUP);
      if (!allPermReqs || allPermReqs.length === 0) return;

      // Keys are stored as "expertId:targetUserId"
      // Find any where the target (second part) is the disconnected user
      for (const entry of allPermReqs) {
        const key: string = entry.key;
        if (!key) continue;

        const parts = key.split(":");
        if (parts.length < 2) continue;

        const targetUserId = parts[parts.length - 1]; // last segment is the target user
        const expertId = parts.slice(0, parts.length - 1).join(":"); // everything before is expertId

        if (targetUserId !== userId) continue;

        // This user was the target of a pending permission request — clean it up
        await RedisManager.removeDataFromGroup(this.REDIS_PERMREQ_GROUP, key);

        // Notify the expert that the user went offline
        await this.emitToUser(expertId, this.CALL_EVENTS.PERMISSION_DENIED, {
          userId,
          reason: "user_offline",
          cooldownSeconds: 0, // no cooldown — user went offline, not a deliberate decline
        });

        console.log(
          `[CallController] Cleared pending permission request ${key} — user ${userId} went offline`
        );
      }
    } catch (error) {
      console.error("[CallController] handleDisconnectDuringPermissionRequest error:", error);
    }
  }

  // ─── Call Duration Timers ──────────────────────────────────────

  private startCallTimers(callId: string, callerId: string, calleeId: string): void {
    const maxDuration = CALL_CONFIG.MAX_CALL_DURATION_SECONDS * 1000;
    const timers: NodeJS.Timeout[] = [];

    // Warning timeouts
    for (const warnAtSeconds of CALL_CONFIG.WARNING_AT_SECONDS) {
      const remaining = CALL_CONFIG.MAX_CALL_DURATION_SECONDS - warnAtSeconds;
      const timer = setTimeout(async () => {
        await this.emitTimeWarning(callId, callerId, calleeId, remaining);
      }, warnAtSeconds * 1000);
      timers.push(timer);
    }

    // Auto-hangup at max duration
    const endTimer = setTimeout(async () => {
      await this.forceEndCall(callId, "time_limit");
    }, maxDuration);
    timers.push(endTimer);

    this.callTimers.set(callId, timers);
    console.log(
      `[CallController] Call ${callId}: duration timers set (max ${CALL_CONFIG.MAX_CALL_DURATION_SECONDS}s)`
    );
  }

  private clearCallTimers(callId: string): void {
    const timers = this.callTimers.get(callId);
    if (timers) {
      timers.forEach((t) => clearTimeout(t));
      this.callTimers.delete(callId);
    }
  }

  private async emitTimeWarning(
    callId: string,
    callerId: string,
    calleeId: string,
    remaining: number
  ): Promise<void> {
    const payload = { callId, remaining };
    await Promise.all([
      this.emitToUser(callerId, this.CALL_EVENTS.TIME_WARNING, payload),
      this.emitToUser(calleeId, this.CALL_EVENTS.TIME_WARNING, payload),
    ]);
    console.log(
      `[CallController] Call ${callId}: time warning — ${remaining}s remaining`
    );
  }

  private async forceEndCall(callId: string, reason: string): Promise<void> {
    try {
      this.clearCallTimers(callId);

      const call = await CallModel.findById(callId);
      if (!call || !["accepted", "ringing"].includes(call.status)) return;

      const callerId = call.caller.toString();
      const calleeId = call.callee.toString();

      let duration: number | undefined;
      if (call.answeredAt) {
        duration = Math.round((Date.now() - call.answeredAt.getTime()) / 1000);
      }

      call.status = "completed";
      call.endedAt = new Date();
      call.endReason = reason;
      if (duration !== undefined) call.duration = duration;
      await call.save();

      await Promise.all([
        this.clearUserBusy(callerId),
        this.clearUserBusy(calleeId),
      ]);

      const endPayload = { callId, reason, duration, endedBy: "server" };
      await Promise.all([
        this.emitToUser(callerId, this.CALL_EVENTS.ENDED, endPayload),
        this.emitToUser(calleeId, this.CALL_EVENTS.ENDED, endPayload),
      ]);

      // Post-call tasks
      if (duration !== undefined && duration > 0) {
        Promise.all([
          this.incrementVideoConsultationUsage(callerId),
          this.incrementVideoConsultationUsage(calleeId),
        ]).catch((err) =>
          console.error("[CallController] usage tracking error:", err)
        );

        this.createServiceRecord(callId, callerId, calleeId, duration, true).catch(
          (err) => console.error("[CallController] service record error:", err)
        );
      }

      console.log(
        `[CallController] Call ${callId} force-ended: ${reason} (${duration ?? 0}s)`
      );
    } catch (error) {
      console.error("[CallController] forceEndCall error:", error);
    }
  }

  // ─── Expert Permission Flow ──────────────────────────────────

  private async handleRequestPermission(
    expertId: string,
    userId: string
  ): Promise<any> {
    // Self check
    if (expertId === userId) {
      return { status: "error", errorCode: "SELF_CALL", message: "Cannot request yourself" };
    }

    // Verify caller is actually an expert
    const expertUser = await UserModel.findById(expertId)
      .select("isExpert fullName profilePhotoId")
      .lean();
    if (!(expertUser as any)?.isExpert) {
      return { status: "error", errorCode: "NOT_EXPERT", message: "Only experts can request call permission" };
    }

    // Check if user is online
    const userSocket = await this.socketManager.getSocketIdUsingUserId(userId);
    if (!userSocket) {
      return { status: "error", errorCode: "USER_OFFLINE", message: "User is offline" };
    }

    // Check if a request is already pending (prevent spam)
    const reqKey = `${expertId}:${userId}`;
    const existingReq = await RedisManager.getDataFromGroup<{ pending: boolean }>(
      this.REDIS_PERMREQ_GROUP,
      reqKey
    );
    if (existingReq) {
      return { status: "error", errorCode: "REQUEST_PENDING", message: "A request is already pending" };
    }

    // Check cooldown after previous decline
    const cooldownKey = `${expertId}:${userId}`;
    const cooldownData = await RedisManager.getDataFromGroup<{ since: number }>(
      this.REDIS_PERM_COOLDOWN_GROUP,
      cooldownKey
    );
    if (cooldownData) {
      const elapsed = Math.floor((Date.now() - cooldownData.since) / 1000);
      const remaining = Math.max(0, this.PERM_COOLDOWN_SECONDS - elapsed);
      return {
        status: "error",
        errorCode: "COOLDOWN",
        message: `Please wait ${remaining}s before requesting again`,
        cooldownRemaining: remaining,
      };
    }

    // Store pending request in Redis (60s TTL)
    await RedisManager.cacheDataInGroup(
      this.REDIS_PERMREQ_GROUP,
      reqKey,
      { pending: true, since: Date.now() },
      60
    );

    // Get expert qualification info
    const { ExpertModel } = await import("../models/expertModel");
    const expertDoc = await ExpertModel.findOne({ user: new Types.ObjectId(expertId) })
      .select("qualification")
      .lean();

    // Emit permission request to user
    await this.emitToUser(userId, this.CALL_EVENTS.PERMISSION_REQUEST, {
      expertId,
      expertName: (expertUser as any)?.fullName || "Expert",
      expertAvatar: (expertUser as any)?.profilePhotoId || null,
      expertQualification: (expertDoc as any)?.qualification || null,
    });

    console.log(`[CallController] Expert ${expertId} requested permission to call ${userId}`);
    return { status: "ok" };
  }

  private async handlePermissionResponse(
    userId: string,
    expertId: string,
    accepted: boolean
  ): Promise<any> {
    // Clear the pending request
    const reqKey = `${expertId}:${userId}`;
    await RedisManager.removeDataFromGroup(this.REDIS_PERMREQ_GROUP, reqKey);

    if (accepted) {
      // Grant permission — store in Redis with 5-min TTL
      const permKey = `${expertId}:${userId}`;
      await RedisManager.cacheDataInGroup(
        this.REDIS_PERMISSION_GROUP,
        permKey,
        { granted: true, since: Date.now() },
        CALL_CONFIG.EXPERT_PERMISSION_WINDOW_SECONDS
      );

      // Look up user info for the expert's UI
      const user = await UserModel.findById(userId)
        .select("fullName profilePhotoId")
        .lean();

      await this.emitToUser(expertId, this.CALL_EVENTS.PERMISSION_GRANTED, {
        userId,
        userName: (user as any)?.fullName || "User",
        userAvatar: (user as any)?.profilePhotoId || null,
        windowSeconds: CALL_CONFIG.EXPERT_PERMISSION_WINDOW_SECONDS,
      });

      console.log(`[CallController] User ${userId} granted call permission to expert ${expertId}`);
    } else {
      // Set 60s cooldown before expert can request this user again
      const cooldownKey = `${expertId}:${userId}`;
      await RedisManager.cacheDataInGroup(
        this.REDIS_PERM_COOLDOWN_GROUP,
        cooldownKey,
        { since: Date.now() },
        this.PERM_COOLDOWN_SECONDS
      );

      await this.emitToUser(expertId, this.CALL_EVENTS.PERMISSION_DENIED, {
        userId,
        cooldownSeconds: this.PERM_COOLDOWN_SECONDS,
      });

      console.log(`[CallController] User ${userId} denied call permission to expert ${expertId} (60s cooldown set)`);
    }

    return { status: "ok" };
  }
}

export { CallController };
