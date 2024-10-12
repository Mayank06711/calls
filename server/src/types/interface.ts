export interface EventData {
  email?: string;
  subject?: string;
  req?: any; // Optional request object
  data?: Record<string, any>; // Optional additional data
  message: string; // Message related to the event
}
