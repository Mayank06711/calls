import {
  SOCKET_CONNECTED,
  SOCKET_AUTHENTICATED,
  SOCKET_TOTAL_CONNECTIONS,
  SOCKET_TOTAL_CALLS,
  SOCKET_TOTAL_CALLS_IN_QUEUE,
  SOCKET_TOTAL_CALLS_IN_PROGRESS,
} from "../action_creators/socket.action_creators";

export const socketConnected = () => {
  return {
    type: SOCKET_CONNECTED,
  };
};

export const socketAuthenticated = () => {
  return {
    type: SOCKET_AUTHENTICATED,
  };
};

export const socketTotalConnections = (connections) => {
  return {
    type: SOCKET_TOTAL_CONNECTIONS,
    payload: connections,
  };
};

export const socketTotalCalls = (calls) => {
  return {
    type: SOCKET_TOTAL_CALLS,
    payload: calls,
  };
};

export const socketTotalCallsInQueue = (callsInQueue) => {
  return {
    type: SOCKET_TOTAL_CALLS_IN_QUEUE,
    payload: callsInQueue,
  };
};

export const socketTotalCallsInProgress = (callsInProgress) => {
  return {
    type: SOCKET_TOTAL_CALLS_IN_PROGRESS,
    payload: callsInProgress,
  };
};
