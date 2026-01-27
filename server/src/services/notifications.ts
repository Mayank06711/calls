import { EventEmitter } from "events";
import { NotificationPayload } from "../interface/interface";
import {
  NotificationModel,
  INotification,
  NotificationType,
  NotificationSeverity,
} from "../models/notificationModel";
import { RedisManager } from "../utils/redisClient";

export interface BroadcastNotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  discount?: string;
  expiresIn?: string;
  description?: string;
  extLink?: string | null;
  stickyTime?: number;
  sentBy: { adminId: string; position: string };
}

export interface UserNotificationPayload {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  product?: INotification["product"];
  action?: string;
  user?: { name: string; avatar: string };
  content?: string | null;
  discount?: string;
  expiresIn?: string;
  description?: string;
  severity?: NotificationSeverity;
  extLink?: string | null;
  stickyTime?: number;
  sentBy?: { adminId: string; position: string };
}

class NotificationService {
  private static instance: NotificationService | null = null;
  private emitter: EventEmitter;

  private readonly NOTIFICATION_QUEUE_PREFIX = "notification_queue:";
  private readonly NOTIFICATION_QUEUE_TTL = 7 * 24 * 60 * 60; // 7 days

  private constructor() {
    this.emitter = new EventEmitter();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // ── Existing methods (backward compatible) ──

  public emitNotification(notification: NotificationPayload): void {
    console.log("[NotificationService] emitNotification (legacy)");
    this.emitter.emit("admin:notification", notification);
  }

  public onNotification(
    callback: (notification: NotificationPayload) => void
  ): void {
    this.emitter.on("admin:notification", callback);
  }

  public removeListener(
    callback: (notification: NotificationPayload) => void
  ): void {
    this.emitter.off("admin:notification", callback);
  }

  // ── Broadcast notifications (persist + emit) ──

  public async emitBroadcastNotification(
    payload: BroadcastNotificationPayload
  ): Promise<INotification> {
    const notification = await NotificationModel.create({
      recipientId: null,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      severity: payload.severity,
      discount: payload.discount,
      expiresIn: payload.expiresIn,
      description: payload.description,
      extLink: payload.extLink,
      stickyTime: payload.stickyTime || 1000,
      sentBy: payload.sentBy,
    });

    const notifId = (notification._id as any).toString();
    console.log("[NotificationService] Broadcast notification persisted:", notifId);

    // Emit via admin:notification so both ChatController (system:message)
    // and NotificationController (notification:new) pick it up
    this.emitter.emit("admin:notification", {
      ...notification.toObject(),
      id: notifId,
    });

    return notification;
  }

  // ── User-specific notifications (persist + emit) ──

  public async emitUserNotification(
    payload: UserNotificationPayload
  ): Promise<INotification> {
    const notification = await NotificationModel.create({
      recipientId: payload.recipientId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      product: payload.product,
      action: payload.action,
      user: payload.user,
      content: payload.content,
      discount: payload.discount,
      expiresIn: payload.expiresIn,
      description: payload.description,
      severity: payload.severity,
      extLink: payload.extLink,
      stickyTime: payload.stickyTime,
      sentBy: payload.sentBy,
    });

    const userNotifId = (notification._id as any).toString();
    console.log("[NotificationService] User notification persisted:", userNotifId, "for user:", payload.recipientId);

    this.emitter.emit("user:notification", {
      ...notification.toObject(),
      id: userNotifId,
    });

    return notification;
  }

  public onUserNotification(callback: (notification: any) => void): void {
    this.emitter.on("user:notification", callback);
  }

  // ── Redis offline queue ──

  public async queueNotificationForOfflineUser(
    userId: string,
    notificationId: string
  ): Promise<void> {
    const key = `${this.NOTIFICATION_QUEUE_PREFIX}${userId}`;
    await RedisManager.lpush(key, notificationId);
    await RedisManager.expire(key, this.NOTIFICATION_QUEUE_TTL);
    console.log(`[NotificationService] Queued notification ${notificationId} for offline user ${userId}`);
  }

  public async getQueuedNotificationIds(userId: string): Promise<string[]> {
    const key = `${this.NOTIFICATION_QUEUE_PREFIX}${userId}`;
    return await RedisManager.lrange(key, 0, -1);
  }

  public async clearNotificationQueue(userId: string): Promise<void> {
    const key = `${this.NOTIFICATION_QUEUE_PREFIX}${userId}`;
    await RedisManager.del(key);
  }

  // ── MongoDB queries ──

  public async getNotificationsForUser(
    userId: string,
    options: { limit?: number; skip?: number; type?: NotificationType } = {}
  ): Promise<INotification[]> {
    const { limit = 50, skip = 0, type } = options;

    const query: any = {
      $or: [{ recipientId: userId }, { recipientId: null }],
    };

    if (type) {
      query.type = type;
    }

    return NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  public async markNotificationRead(
    notificationId: string,
    userId: string
  ): Promise<void> {
    await NotificationModel.findByIdAndUpdate(notificationId, { read: true });
  }

  public async getUnreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({
      $or: [{ recipientId: userId }, { recipientId: null }],
      read: false,
    });
  }
}

export default NotificationService;
