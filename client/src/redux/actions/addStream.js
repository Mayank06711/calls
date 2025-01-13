import { ADD_STREAM } from '../action_creators';

const addStream = (who, stream, peerConnection) => ({
  type: ADD_STREAM,
  payload: { who, stream, peerConnection },
});

export default addStream;