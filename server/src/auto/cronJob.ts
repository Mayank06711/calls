import crons from "node-cron";
import { checkHealth } from "../db/index";
import Notification from "../notifications/notifications";
// Run health check every 5 minutes


const cronSchuduler = (cronTime: string) => {
  crons.schedule(cronTime, async () => {
    try {
      const health = await checkHealth();
      if (health) {
        console.log("Database is healthy");
      } else {
        console.error("Database is not healthy:", health.error);
        await Notification.sendEmailNotification(
          "Database health check failed."
        ); // Send notification
        process.exit(1);
      }
      console.log("Database health check result:", health);
    } catch (error) {
      console.error("Error running database health check:", error);
    }
  });
};

export default cronSchuduler;
