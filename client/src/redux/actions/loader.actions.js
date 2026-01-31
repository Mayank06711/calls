import { START_LOADER, STOP_LOADER } from '../action_creators/loader.action_creators';

export const startLoader = (loaderType) => ({
  type: START_LOADER,
  payload: loaderType
});

export const stopLoader = (loaderType) => ({
  type: STOP_LOADER,
  payload: loaderType
});

// Add type checking helper
export const isLoading = (state, loaderType) => 
  state.loaderState.loaders[loaderType] || false;