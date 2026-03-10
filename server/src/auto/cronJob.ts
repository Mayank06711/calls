import crons from "node-cron";
import { checkHealth } from "../db/index";
import Notification from "../services/notifications";
import { PaymentOrderModel } from "../models/paymentOrderModel";
import { SubscriptionModel } from "../models/subscriptionModel";

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

export { startStaleOrderCleanup };
export default cronSchuduler;
