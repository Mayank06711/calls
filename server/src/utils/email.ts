import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import {
  getTemplate,
  replaceTemplateVariables,
} from "./getTemplates";
import { EmailOptions } from "../interface/interface";
const sendEmails = async (options: EmailOptions) => {
  // create a transporter
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOSTNAME!,
      port: Number(process.env.EMAIL_PORT!), // Ensure the port is a number
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USERNAME!, // generated ethereal user
        pass: process.env.EMAIL_USERNAME_PASSWORD!, // generated ethereal password
      },
    } as SMTPTransport.Options);

    // Get template
    const template = getTemplate(options.templateCode || "EMAIL_VERIFICATION");
    if (!template || (template.type !== "email" && template.type !== "both")) {
      throw new Error("Invalid email template");
    }

    const contentType = options.contentType || template.contentType || "both";

    // Prepare email content based on contentType
    let emailContent: { text?: string; html?: string } = {};

    // Include message in template variables if provided
    const templateVariables = {
      ...options.data,
      ...(options.message && { message: options.message }),
    };

    if (contentType === "both" || contentType === "html") {
      if (template.content.html) {
        emailContent.html = replaceTemplateVariables(
          template.content.html,
          templateVariables
        );
      }
    }

    if (contentType === "both" || contentType === "text") {
      if (template.content.text) {
        emailContent.text = replaceTemplateVariables(
          template.content.text,
          templateVariables
        );
      }
    }

    // Validate that we have at least one content type
    if (!emailContent.html && !emailContent.text) {
      throw new Error(`No ${contentType} content available in template`);
    }

    const emailOption = {
      from: "XYZ-PVT.LMT support<support@xyz.com>",
      to: options.email,
      subject: options.subject || template.subject,
      ...emailContent,
    };

    await transporter.sendMail(emailOption);
    console.log("Email sent successfully  \n");
    return true;

    // Emit event after sending email
    // EmitEvents.createEvent(
    //   OK_EMAIL_SENT,
    //   {
    //     req: options.req,
    //     data: options.data,
    //     message: "Email sent successfully",
    //   },
    //   PRIORITY.OK_EMAIL_SENT
    // );
  } catch (error: any) {
    console.log(error, "Error sending email-> \n");
    throw error;
    // Emit event on error
    // EmitEvents.createEvent(
    //   EMAIL_FAILED,
    //   {
    //     req: options.req,
    //     data: options.data,
    //     message: error.message,
    //   },
    //   PRIORITY.REJECT
    // );

    // throw new ApiError(500, "Nodemailer error", error.message);
  }
};

export { sendEmails };
