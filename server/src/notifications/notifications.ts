import nodemailer from "nodemailer";
import { sendEmails } from "../utils/email";

class Notification {
  static sendEmailNotification = async (message: any) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "admin@example.com", // replace with your admin's email
      subject: "Database Health Check Alert",
      message: message,
    };

    try {
      await sendEmails(mailOptions);
      console.log("Health check notification email sent successfully");
    } catch (error) {
      console.error("Error sending email notification:", error);
    }
  };
}
export default Notification;
