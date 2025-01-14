import { UPDATE_CALL_STATUS } from '../action_creators';

const updateCallStatus = (prop, value) => ({
  type: UPDATE_CALL_STATUS,
  payload: { prop, value },
});

export default updateCallStatus;