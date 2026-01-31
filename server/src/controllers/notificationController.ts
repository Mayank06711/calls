import { Socket } from "socket.io";
import { SocketManager } from "../socket";
import NotificationService from "../services/notifications";
import { NotificationModel } from "../models/notificationModel";
import { Types } from "mongoose";

// Strip internal fields before sending to clients
function sanitizeForClient(notif: any): any {
  const { sentBy, __v, ...rest } = notif;
  return rest;
}

class NotificationController {
  private static instance: NotificationController | null = null;
  private readonly socketManager: SocketManager;
  private readonly notificationService: NotificationService;

  private readonly NOTIFICATION_EVENTS = {
    NEW_NOTIFICATION: "notification:new",
    NOTIFICATION_BATCH: "notification:batch",
    NOTIFICATION_HISTORY: "notification:history",
    NOTIFICATION_MARK_READ: "notification:mark-read",
    NOTIFICATION_MARK_ALL_READ: "notification:mark-all-read",
    NOTIFICATION_DISMISS: "notification:dismiss",
    NOTIFICATION_DISMISS_BATCH: "notification:dismiss-batch",
    NOTIFICATION_UNREAD_COUNT: "notification:unread-count",
  } as const;

  private constructor() {
    this.socketManager = SocketManager.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.setupBroadcastListener();
    this.setupUserNotificationListener();
    console.log("[NotificationController] Initialized");
  }

  public static getInstance(): NotificationController {
    if (!NotificationController.instance) {
      NotificationController.instance = new NotificationController();
    }
    return NotificationController.instance;
  }

  // ── Broadcast listener: sends notification:new to ALL connected clients ──

  private setupBroadcastListener(): void {
    this.notificationService.onNotification(async (notificationData: any) => {
      try {
        const cleaned = sanitizeForClient(notificationData);
        await this.socketManager.emitEvent({
          event: this.NOTIFICATION_EVENTS.NEW_NOTIFICATION,
          data: {
            ...cleaned,
            id:
              notificationData._id?.toString() ||
              notificationData.id ||
              Date.now().toString(),
          },
        });
        console.log("[NotificationController] Broadcast notification:new sent to all clients");
      } catch (error) {
        console.error("[NotificationController] Error broadcasting notification:", error);
      }
    });
  }

  // ── User-specific listener: deliver to target user or queue for offline ──

  private setupUserNotificationListener(): void {
    this.notificationService.onUserNotification(async (notificationData: any) => {
      try {
        const recipientId = notificationData.recipientId?.toString();
        if (!recipientId) return;

        const recipientSocket =
          await this.socketManager.getSocketIdUsingUserId(recipientId);

        const cleaned = sanitizeForClient(notificationData);

        if (recipientSocket && recipientSocket.socketId) {
          await this.socketManager.emitEvent({
            event: this.NOTIFICATION_EVENTS.NEW_NOTIFICATION,
            data: {
              ...cleaned,
              id:
                notificationData._id?.toString() || notificationData.id,
            },
            targetSocketIds: [recipientSocket.socketId],
          });
          console.log(
            `[NotificationController] Delivered user notification to ${recipientId} (socket: ${recipientSocket.socketId})`
          );
        } else {
          const notifId =
            notificationData._id?.toString() || notificationData.id;
          await this.notificationService.queueNotificationForOfflineUser(
            recipientId,
            notifId
          );
          console.log(
            `[NotificationController] Queued notification ${notifId} for offline user ${recipientId}`
          );
        }
      } catch (error) {
        console.error("[NotificationController] Error handling user notification:", error);
      }
    });
  }

  // ── Per-socket event listeners (called after authentication) ──

  public setupAuthenticatedSocketListeners(socket: Socket): void {
    if (!socket.data.authenticated || !socket.data.userId) {
      return;
    }

    const userId = socket.data.userId;

    // notification:history — client requests past notifications
    socket.on(
      this.NOTIFICATION_EVENTS.NOTIFICATION_HISTORY,
      async (
        data: { limit?: number; skip?: number; type?: string },
        callback?: Function
      ) => {
        try {
          const notifications =
            await this.notificationService.getNotificationsForUser(userId, {
              limit: data?.limit || 50,
              skip: data?.skip || 0,
              type: data?.type as any,
            });

          const formatted = notifications.map((n: any) => ({
            ...sanitizeForClient(n),
            id: n._id?.toString() || n.id,
          }));

          if (callback) {
            callback({ status: "success", notifications: formatted });
          }
        } catch (error) {
          console.error("[NotificationController] Error fetching history:", error);
          if (callback) {
            callback({ status: "error", message: "Failed to fetch notifications" });
          }
        }
      }
    );

    // notification:mark-read — client marks a single notification as read
    socket.on(
      this.NOTIFICATION_EVENTS.NOTIFICATION_MARK_READ,
      async (data: { notificationId: string }, callback?: Function) => {
        try {
          if (!data?.notificationId) {
            if (callback) callback({ status: "error", message: "notificationId required" });
            return;
          }
          await this.notificationService.markNotificationRead(
            data.notificationId,
            userId
          );
          if (callback) callback({ status: "success" });
        } catch (error) {
          console.error("[NotificationController] Error marking read:", error);
          if (callback) callback({ status: "error", message: "Failed to mark as read" });
        }
      }
    );

    // notification:mark-all-read — client marks multiple notifications as read
    socket.on(
      this.NOTIFICATION_EVENTS.NOTIFICATION_MARK_ALL_READ,
      async (data: { notificationIds?: string[] }, callback?: Function) => {
        try {
          const ids = data?.notificationIds;
          if (ids && ids.length > 0) {
            const validIds = ids
              .filter((id) => Types.ObjectId.isValid(id))
              .map((id) => new Types.ObjectId(id));
            if (validIds.length > 0) {
              await NotificationModel.updateMany(
                { _id: { $in: validIds } },
                { $set: { read: true } }
              );
            }
          } else {
            // Mark all for this user as read
            await NotificationModel.updateMany(
              { $or: [{ recipientId: userId }, { recipientId: null }], read: false },
              { $set: { read: true } }
            );
          }
          if (callback) callback({ status: "success" });
        } catch (error) {
          console.error("[NotificationController] Error marking all read:", error);
          if (callback) callback({ status: "error", message: "Failed to mark all as read" });
        }
      }
    );

    // notification:dismiss — client deletes a single notification
    socket.on(
      this.NOTIFICATION_EVENTS.NOTIFICATION_DISMISS,
      async (data: { notificationId: string }, callback?: Function) => {
        try {
          if (!data?.notificationId) {
            if (callback) callback({ status: "error", message: "notificationId required" });
            return;
          }
          await NotificationModel.findByIdAndDelete(data.notificationId);
          if (callback) callback({ status: "success" });
        } catch (error) {
          console.error("[NotificationController] Error dismissing notification:", error);
          if (callback) callback({ status: "error", message: "Failed to dismiss" });
        }
      }
    );

    // notification:dismiss-batch — client deletes multiple notifications
    socket.on(
      this.NOTIFICATION_EVENTS.NOTIFICATION_DISMISS_BATCH,
      async (data: { notificationIds: string[] }, callback?: Function) => {
        try {
          const ids = data?.notificationIds;
          if (!ids || ids.length === 0) {
            if (callback) callback({ status: "error", message: "notificationIds required" });
            return;
          }
          const validIds = ids
            .filter((id) => Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id));
          if (validIds.length > 0) {
            await NotificationModel.deleteMany({ _id: { $in: validIds } });
          }
          if (callback) callback({ status: "success" });
        } catch (error) {
          console.error("[NotificationController] Error batch dismissing:", error);
          if (callback) callback({ status: "error", message: "Failed to dismiss" });
        }
      }
    );

    // notification:unread-count — client requests unread count
    socket.on(
      this.NOTIFICATION_EVENTS.NOTIFICATION_UNREAD_COUNT,
      async (_data: any, callback?: Function) => {
        try {
          const count = await this.notificationService.getUnreadCount(userId);
          if (callback) callback({ status: "success", unreadCount: count });
        } catch (error) {
          console.error("[NotificationController] Error getting unread count:", error);
          if (callback) callback({ status: "error", unreadCount: 0 });
        }
      }
    );

    console.log(`[NotificationController] Socket listeners set up for user ${userId} (socket: ${socket.id})`);
  }

  // ── Flush queued notifications on reconnect ──

  public async flushQueuedNotifications(
    socketId: string,
    userId: string
  ): Promise<void> {
    try {
      const notificationIds =
        await this.notificationService.getQueuedNotificationIds(userId);

      if (notificationIds.length === 0) {
        return;
      }

      const objectIds = notificationIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

      if (objectIds.length === 0) {
        await this.notificationService.clearNotificationQueue(userId);
        return;
      }

      const notifications = await NotificationModel.find({
        _id: { $in: objectIds },
      })
        .sort({ createdAt: -1 })
        .lean();

      await this.socketManager.emitEvent({
        event: this.NOTIFICATION_EVENTS.NOTIFICATION_BATCH,
        data: {
          notifications: notifications.map((n: any) => ({
            ...sanitizeForClient(n),
            id: n._id.toString(),
          })),
        },
        targetSocketIds: [socketId],
      });

      await this.notificationService.clearNotificationQueue(userId);

      console.log(
        `[NotificationController] Flushed ${notifications.length} queued notifications for user ${userId}`
      );
    } catch (error) {
      console.error("[NotificationController] Error flushing queued notifications:", error);
    }
  }
}

export { NotificationController };
