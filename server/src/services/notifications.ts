import { EventEmitter } from "events";
import { NotificationPayload } from "../interface/interface";

class NotificationService {
  private static instance: NotificationService | null = null;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public emitNotification(notification: NotificationPayload): void {
    console.log("from emitNotification line 20");
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
}

export default NotificationService;
