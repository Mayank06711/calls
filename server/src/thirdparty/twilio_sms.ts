import twilio from "twilio";
import { getTemplate, replaceTemplateVariables } from "../utils/getTemplates";

class SmsService {
  private static client: twilio.Twilio;

  // Initialize the Twilio client lazily
  private static initializeClient() {
    if (!SmsService.client) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      // console.log("Initializing Twilio with Account SID:", accountSid);
      // console.log("Initializing Twilio with Auth Token:", authToken);

      if (!accountSid || !authToken) {
        throw new Error(
          "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not set or invalid"
        );
      }

      SmsService.client = twilio(accountSid, authToken);
    }
  }

  public static async sendSMS(
    recipientNum: string,
    template_id: string = "PHONE_VERIFICATION",
    params: { [key: string]: string }
  ) {
    try {
      SmsService.initializeClient();
      const template = getTemplate(template_id);
      if (!template || !template.content.text) {
        throw new Error(`Template ${template_id} not found or invalid`);
      }
      // Replace variables in the template text
      const message = replaceTemplateVariables(template.content.text, params);
      const response = await SmsService.client.messages.create({
        to: recipientNum,
        from: process.env.TWILIO_SMS_NUMBER,
        body: message,
      });
      if (response.sid) {
        console.log("SMS sent successfully \n", response.sid);
        return {
          status: response.status,
          uuid: response.sid,
          message: message,
        };
      } else {
        return { status: "failed", uuid: null, message: "Failed To Send OTP" };
      }
    } catch (error: any) {
      console.error("Error sending SMS \n", error);
      throw error;
    }
  }
}

// const result = await SmsService.sendSMS('+1234567890', 'otp', { otp_code: '123456', validity_period: '5'

/*
With this implementation, the Twilio client is initialized only once,
no matter how many times you call the sendSMS method. 
This ensures efficient use of resources and avoids unnecessary
re-initialization.
 */

// since this class does not have construcrecipientNumr we do`t need recipientNum initiliase it

export default SmsService;
