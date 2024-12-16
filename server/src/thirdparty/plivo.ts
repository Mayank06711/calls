import plivo from "plivo";
import { formatIndianNumber, toE164Format } from "../utils/formatNum";
import {
  SendOtpMessageResponse,
  SendOtpMessageError,
} from "../types/interface";

const plivoClient = new plivo.Client(
  process.env.PLIVO_ACCOUNT_SID || "",
  process.env.PLIVO_AUTH_TOKEN || ""
);

/**
 * Sends an OTP message using Plivo API.
 * @param recipientNum - The recipient's phone number.
 * @param msg - The message text to be sent.
 * @returns A promise resolving to the Plivo response or an error object.
 */
const sendMessageOnMobileNum = async (
  recipientNum: string,
  msg: string
): Promise<SendOtpMessageResponse | SendOtpMessageError> => {
  const senderNumber = process.env.PLIVO_SOURCE_NUMBER || "YOUR_PLIVO_NUMBER";

  // Validate the message
  if (!msg || msg.length > 1600) {
    return {
      error:
        "Invalid message: Message cannot be empty or exceed 1600 characters.",
    };
  }

  // Format and validate the recipient's phone number
  const formattedRecipientNumber = toE164Format(recipientNum);
  if (!formattedRecipientNumber) {
    return {
      error: "Invalid number: Please provide a valid Indian mobile number.",
    };
  }

  try {
    // Sending the message
    const response = await plivoClient.messages.create(
      senderNumber, // Sender's number
      formattedRecipientNumber, // Formatted recipient's number
      msg // Text content
    );
    console.log(response);
    console.info(
      `Message sent to ${formattedRecipientNumber} with UUID: ${response.messageUuid}`
    );
    if (response.messageUuid) {
      // TypeScript will narrow down the response here
      return {
        message: "Message sent successfully",
        messageUuid: response.messageUuid,
        apiId: response.apiId,
      };
    } else {
      // If response does not have messageUuid, we handle it as an error
      return {
        error: "Failed to send message: No messageUuid found.",
      };
    }
  } catch (error: any) {
    // Handle any error from Plivo or the network
    console.error("Error sending message:", error.message || error);

    return {
      error: error.message || "Failed to send message. Please try again later.",
    };
  }
};

/**
 * Type guard to check if the response is of type SendOtpMessageResponse
 * @param response The response object
 * @returns true if the response is a success, otherwise false
 */
const isSendOtpMessageResponse = (
    response: SendOtpMessageResponse | SendOtpMessageError
  ): response is SendOtpMessageResponse => {
    return (response as SendOtpMessageResponse).messageUuid !== undefined;
  }

export { sendMessageOnMobileNum, isSendOtpMessageResponse };
