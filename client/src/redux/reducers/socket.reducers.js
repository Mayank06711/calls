import {
  SOCKET_CONNECTED,
  SOCKET_AUTHENTICATED,
  SOCKET_TOTAL_CONNECTIONS,
  SOCKET_TOTAL_CALLS,
  SOCKET_TOTAL_CALLS_IN_QUEUE,
  SOCKET_TOTAL_CALLS_IN_PROGRESS,
} from "../action_creators/socket.action_creators";

const initialState = {
  connected: false,
  authenticated: false,
  totalConnections: 0,
  totalCalls: 0,
  totalCallsInQueue: 0,
  totalCallsInProgress: 0,
};

const socketMetricsReducer = (state = initialState, action) => {
  switch (action.type) {
    case SOCKET_CONNECTED:
      return { ...state, connected: true };
    case SOCKET_AUTHENTICATED:
      return { ...state, authenticated: true };
    case SOCKET_TOTAL_CONNECTIONS:
      return { ...state, totalConnections: action.payload };
    case SOCKET_TOTAL_CALLS:
      return { ...state, totalCalls: action.payload };
    case SOCKET_TOTAL_CALLS_IN_QUEUE:
      return { ...state, totalCallsInQueue: action.payload };
    case SOCKET_TOTAL_CALLS_IN_PROGRESS:
      return { ...state, totalCallsInProgress: action.payload };
  }
  return state;
};

export { socketMetricsReducer };
