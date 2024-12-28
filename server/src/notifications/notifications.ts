import { Request, Response } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { sendEmails } from "../utils/email";
import {generateTimestamps} from "../utils/generateTimeStamps"
import { dbQuery } from "../db/index";
import { sendMessageOnMobileNum, isSendOtpMessageResponse } from "../thirdparty/plivo";
import {sqlGenerateInsertQuery, sqlGenerateUpdateQuery} from "../utils/sql_query"
import SmsService from "../thirdparty/twilio_sms";
import {toE164Format} from "../utils/formatNum"


const otpLogPossibleKeys = [
  'mob_num', 'reference_id', 'unique_id', 'src', 'otp',
  'message_template_id', 'message_uuid', 'message_status_code',
  'status', 'actual_message', 'expiry_at', 'ip_address', 'app_version', 'device_id'
];
interface OtpLog {
  mob_num: string;
  otp: string;
  reference_id: string;
  unique_id:string,
  src?: string;
  message_template_id?: string;
  message_uuid?: string;
  message_status_code?: string;
  status?: string;
  actual_message?: string;
  expiry_at?: string|null;
  ip_address?: string;
  app_version?: string;
  device_id?: string;
}



class Notification {
  private static NODE_ENV: string | undefined;

  constructor(NODE_ENV:string='dev') {
    Notification.NODE_ENV = process.env.NODE_ENV || NODE_ENV;
  }

  // Helper methods
  private static errorResponse(statusCode: Number, message: string) {
    return {
      statusCode,
      body: JSON.stringify({
        status: "error",
        message,
      }),
    };
  }

  private static successResponse(data: Record<string, any>) {
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  }

  private  static getHeaderAsString(header: string | string[] | undefined): string | undefined {
    if (Array.isArray(header)) {
      return header[0]; // Use the first value in the array
    }
    return header || undefined;
  }
  

  // async encryptKeys(accessToken: string, refreshToken: string) {
  //   const params = {
  //     Names: [
  //       `authorization_token_decryption_key_${this.NODE_ENV}`,
  //       `body_decryption_key_${this.NODE_ENV}`,
  //       `verify_otp_encryption_key_${this.NODE_ENV}`,
  //     ],
  //   };

  //   const { Parameters } = await this.ssm.getParameters(params).promise();

  //   const keys = {
  //     header_secret_key: Parameters[0].Value,
  //     body_secret_key: Parameters[1].Value,
  //     access_token: accessToken,
  //     refresh_token: refreshToken,
  //   };

  //   const iv = crypto.randomBytes(16);
  //   const cipher = crypto.createCipheriv(
  //     "aes-256-cbc",
  //     Buffer.from(Parameters[2].Value),
  //     iv
  //   );

  //   let encrypted = cipher.update(JSON.stringify(keys), "utf8", "base64");
  //   encrypted += cipher.final("base64");

  //   return Buffer.concat([iv, Buffer.from(encrypted, "base64")]).toString(
  //     "base64"
  //   );
  // }

  private static generateOtpAndReferenceId() {
    const otp = Array(4)
      .fill(0)
      .map(() => Math.floor(Math.random() * 10))
      .join("");
    const referenceId = uuidv4().replace(/-/g, "").substring(0, 8);
    return { otp, referenceId };
  }

  private static async checkOtpRequestCount(mobNum: string) {
    const query = {
      text: `
            SELECT COUNT(*) AS otp_request_count 
            FROM otp_storage_${this.NODE_ENV} 
            WHERE mob_num = $1 
            AND created_at >= NOW() - INTERVAL '10 MINUTE'
            AND message_status_code = '202'
        `,
      values: [mobNum],
    };

    try {
      const result = await dbQuery(query);
      return result.rows[0].otp_request_count;
    } catch (error) {
      console.error("Error checking OTP request count:", error);
      throw error;
    }
  }


  public static async generateOtp(req: Request, res: Response) {
    const { mobNum } = req.body;
    const formattedRecipientNumber = toE164Format(mobNum);
    if (!formattedRecipientNumber) {
       return this.errorResponse(404, "Invalid Phone Number")
    }
    // Check OTP request count
    const requestCount = await this.checkOtpRequestCount(mobNum);
    if (requestCount >= 5) {
      return this.errorResponse(
        429,
        "Too many OTP requests. Please try after 10 min."
      );
    }
  
    // Generate OTP and reference ID
    const { otp, referenceId } = this.generateOtpAndReferenceId();
   
    // Send OTP message via Plivo
    const smsRes = await SmsService.sendSMS(mobNum, 'otp' , { otp: '123456', expiryAt: '10'});

    if (smsRes.uuid) { 
      const timestamps = generateTimestamps(true, true, true)
      // Successfully sent OTP, log OTP generation
      await this.logOtpGeneration({
        otp, 
        reference_id: referenceId,
        unique_id:uuidv4(),
        mob_num: mobNum,
        message_uuid: smsRes.uuid, // Plivo's response contains message UUID
        message_status_code: '202', // Assuming status exists in the SMS response
        status:smsRes.status,
        actual_message:smsRes.message || "OTP sent successfully",
        expiry_at: timestamps.expiry_at, // Calculate expiry date, 10 minutes from now
        ip_address: req.ip, // Assuming you want to store IP address
        app_version: this.getHeaderAsString(req.headers['x-app-version']),
        device_id: this.getHeaderAsString(req.headers['x-device-id']),        
      });
  
      return this.successResponse({
        statusCode: 200,
        sms_id: smsRes.uuid, // Return SMS UUID if message was sent
        status: 'success',
        message: `OTP has been sent to ${mobNum} phone number`,
        reference_id: referenceId,
      });
    } else {
      // Error: smsResponse is of type SendOtpMessageError
      // Log OTP generation with error details
      await this.logOtpGeneration({
        otp, 
        reference_id: referenceId,
        unique_id:uuidv4(),
        mob_num: mobNum,
        message_status_code: '500', // Assuming status exists in the SMS response
        status:smsRes.status,
        actual_message:smsRes.message || "Failed To Send OTP",
        expiry_at: null, // Calculate expiry date, 10 minutes from now
        ip_address: req.ip, // Assuming you want to store IP address
        app_version: this.getHeaderAsString(req.headers['x-app-version']),
        device_id: this.getHeaderAsString(req.headers['x-device-id']),        
      });
    }
  }


  private static async logOtpGeneration(otpLog:OtpLog) {
    // Ensure required fields are present
    if (!otpLog.mob_num || !otpLog.otp || !otpLog.unique_id) {
      throw new Error('Missing required fields: mob_num, otp, or unique_id.');
    }

    const data = {
      mob_num: otpLog.mob_num,
      reference_id: otpLog.reference_id || null,
      unique_id: otpLog.unique_id,
      src: otpLog.src || null,
      otp: otpLog.otp,
      message_template_id: otpLog.message_template_id || null,
      message_uuid: otpLog.message_uuid || null,
      message_status_code: otpLog.message_status_code || null,
      status: otpLog.status || null,
      actual_message: otpLog.actual_message || null,
      expiry_at: otpLog.expiry_at || null,
      ip_address: otpLog.ip_address || null,
      app_version: otpLog.app_version || null,
      device_id: otpLog.device_id || null
    };
  
      // Generating insert query and values
  const query = sqlGenerateInsertQuery(otpLogPossibleKeys, data);

  const insertQuery = `INSERT INTO otp_storage_${this.NODE_ENV} ${query.keys} VALUES ${query.val}`;

  // Log the generated query (for debugging purposes)
  console.log("Generated Insert Query:", insertQuery);
  console.log("Data:", query.data);
  
    try {
      await dbQuery({
        text: insertQuery,
        values: query.data
      });
      console.log("OTP generation logged successfully");
    } catch (error) {
      console.error("Error logging OTP generation:", error);
      throw error;
    }
  }
  
  public static async verifyOtp(req: Request, res: Response) {
    const { referenceId, mobNum, otp, src } = req.body;
  
    // Validate required parameters
    if (!referenceId || !mobNum || !otp || !src) {
      return this.errorResponse(
        400,
        "Missing required parameters for verification"
      );
    }
  
    // Format the mobile number to E164 format
    const formattedRecipientNumber = toE164Format(mobNum);
    if (!formattedRecipientNumber) {
      return this.errorResponse(404, "Invalid Phone Number");
    }
  
    // Query to check OTP details
    const query = {
      text: `
        SELECT otp, expiry_at, is_verified 
        FROM otp_storage_${this.NODE_ENV} 
        WHERE mob_num = $1
        AND otp = $2
        AND reference_id = $3
        AND message_status_code = '202'
        AND created_at >= NOW() - INTERVAL '10 MINUTE'
      `,
      values: [mobNum, otp, referenceId],
    };
  
    // Check if OTP exists and is valid
    let otpRecord: { otp: string, expiry_at: string, is_verified: boolean } | null = null;
    try {
      const result = await dbQuery(query);
      console.log("i am result", result)
      otpRecord = result.rows[0];
    } catch (error) {
      console.error("Error checking OTP:", error);
      return this.errorResponse(500, "Internal Server Error");
    }
  
    // If OTP record doesn't exist or isn't valid
    if (!otpRecord) {
      return this.errorResponse(401, "OTP verification failed. Invalid OTP.");
    }
  
    // Check if OTP has expired
    const currentTimestamp = generateTimestamps()
    if (currentTimestamp.created_at! > otpRecord.expiry_at) {
      return this.errorResponse(401, "OTP verification failed. OTP has expired.");
    }
  
    // Check if OTP has already been verified
    if (otpRecord.is_verified) {
      return this.errorResponse(401, "OTP has already been verified.");
    }
  
    // If everything is valid, update the OTP as verified
    try {
      const updateQuery = {
        text: `
          UPDATE otp_storage_${this.NODE_ENV}
          SET is_verified = TRUE, updated_at = NOW()
          WHERE mob_num = $1 AND otp = $2 AND reference_id = $3
        `,
        values: [mobNum, otp, referenceId],
      };
      await dbQuery(updateQuery);
      const response = {
        message:"Success",
        otp:otp,
        referenceId: referenceId
      }
      // Handle successful verification
      return this.successResponse(response);
    } catch (error) {
      console.error("Error updating OTP status:", error);
      return this.errorResponse(500, "Internal Server Error");
    }
  }
  

  // Email Notification
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


