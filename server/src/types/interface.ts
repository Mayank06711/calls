export interface EventData {
  email?: string;
  subject?: string;
  req?: any; // Optional request object
  data?: Record<string, any>; // Optional additional data
  message: string; // Message related to the event
}


export interface SendOtpMessageResponse {
  message: string;
  messageUuid: string[];
  apiId: string;
}

export interface SendOtpMessageError {
  error: string | Record<string, unknown>;
}


export type Query = {
  text: string;
  values: string[];
};