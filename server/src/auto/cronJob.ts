import crons from "node-cron";
import moment from "moment-timezone";
import { checkHealth } from "../db/index";
import Notification from "../services/notifications";
import NotificationService from "../services/notifications";
import { PaymentOrderModel } from "../models/paymentOrderModel";
import { SubscriptionModel } from "../models/subscriptionModel";
import { BookingModel } from "../models/bookingModel";
import { UserModel } from "../models/userModel";

// Run health check every 5 minutes
const cronSchuduler = (cronTime: string) => {
  crons.schedule(cronTime, async () => {
    try {
      const health = await checkHealth();
      if (health) {
        console.log("Database is healthy");
      } else {
        console.error("Database is not healthy:", health);
        // await Notification.sendEmailNotification(
        //   "Database health check failed."
        // ); // Send notification
        process.exit(1);
      }
      console.log("Database health check result:", health);
    } catch (error) {
      console.error("Error running database health check:", error);
    }
  });
};

// Expire stale payment orders older than 30 minutes that were never paid.
// Runs every 30 minutes. Prevents "ghost" pending orders from blocking re-purchase.
const startStaleOrderCleanup = () => {
  crons.schedule("*/30 * * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      const result = await PaymentOrderModel.updateMany(
        { status: { $in: ["created", "attempted"] }, createdAt: { $lt: cutoff } },
        { status: "expired" }
      );

      if (result.modifiedCount > 0) {
        console.log(`[Cron] Expired ${result.modifiedCount} stale payment orders`);

        // Also revert their subscriptions back to "Pending" (from "Requested")
        // so the user can try again
        const staleOrders = await PaymentOrderModel.find({
          status: "expired",
          updatedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // just expired
        }).select("subscriptionId");

        const subscriptionIds = staleOrders.map((o) => o.subscriptionId);
        if (subscriptionIds.length > 0) {
          await SubscriptionModel.updateMany(
            { _id: { $in: subscriptionIds }, status: "Requested" },
            { status: "Pending" }
          );
        }
      }
    } catch (err: any) {
      console.error("[Cron] Stale order cleanup error:", err.message);
    }
  });

  console.log("[Cron] Stale payment order cleanup scheduled (every 30 min)");
};

// Send reminders for bookings starting in the next 15-30 minutes.
// Runs every 15 minutes.
const startBookingReminderCron = () => {
  crons.schedule("*/15 * * * *", async () => {
    try {
      const now = new Date();
      const from = new Date(now.getTime() + 15 * 60 * 1000); // 15 min from now
      const to = new Date(now.getTime() + 30 * 60 * 1000); // 30 min from now

      // Find confirmed bookings in the 15-30 min window that haven't been reminded yet
      const bookings = await BookingModel.find({
        status: "confirmed",
        date: {
          $gte: moment().startOf("day").toDate(),
          $lte: moment().endOf("day").toDate(),
        },
      }).lean();

      const notificationService = NotificationService.getInstance();
      let reminders = 0;

      for (const booking of bookings) {
        const tz = booking.timezone || "Asia/Kolkata";
        const sessionStart = moment.tz(
          moment(booking.date).format("YYYY-MM-DD") + " " + booking.startTime,
          "YYYY-MM-DD HH:mm",
          tz
        );

        // Check if session starts in 15-30 min window
        if (sessionStart.isAfter(moment(from)) && sessionStart.isBefore(moment(to))) {
          // Notify user
          const expert = await UserModel.findById(booking.expertUser).select("fullName").lean();
          await notificationService.emitUserNotification({
            recipientId: booking.user.toString(),
            type: "booking" as any,
            title: "Session Reminder",
            message: `Your session with ${expert?.fullName || "your expert"} starts in ~15 minutes at ${booking.startTime}`,
          });

          // Notify expert
          const user = await UserModel.findById(booking.user).select("fullName").lean();
          await notificationService.emitUserNotification({
            recipientId: booking.expertUser.toString(),
            type: "booking" as any,
            title: "Session Reminder",
            message: `Your session with ${user?.fullName || "a client"} starts in ~15 minutes at ${booking.startTime}`,
          });

          reminders++;
        }
      }

      if (reminders > 0) {
        console.log(`[Cron] Sent ${reminders} booking reminder(s)`);
      }
    } catch (err: any) {
      console.error("[Cron] Booking reminder error:", err.message);
    }
  });

  console.log("[Cron] Booking reminder cron scheduled (every 15 min)");
};

export { startStaleOrderCleanup, startBookingReminderCron };
export default cronSchuduler;
