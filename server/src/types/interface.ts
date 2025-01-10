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

export type EmitOptions = {
  event: string;
  data: any;
  room?: string;
  auth?: boolean;
  headers?: Record<string, any>;
  targetSocketIds?: string[];
};

export interface SocketUserData {
  userId: string;
  mobNum: string;
  status: 'verified' | 'refreshed';
}
export interface SocketData {
  userId: string;
  mobNum: string;
  socketId: string;
  connectedAt: number;
  lastRefreshedAt: number;
  status:string
}