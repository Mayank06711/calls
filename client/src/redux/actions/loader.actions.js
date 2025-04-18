import { START_LOADER, STOP_LOADER } from '../action_creators/loader.action_creators';

export const startLoader = (loaderType) => ({
  type: START_LOADER,
  payload: loaderType
});

export const stopLoader = (loaderType) => ({
  type: STOP_LOADER,
  payload: loaderType
});