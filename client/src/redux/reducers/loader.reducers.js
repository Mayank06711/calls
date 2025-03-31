import { START_LOADER, STOP_LOADER } from '../action_creators/loader.action_creators';

const initialState = {
  loaders: {
  }
};

export const loaderReducer = (state = initialState, action) => {
  switch (action.type) {
    case START_LOADER:
      return {
        ...state,
        loaders: {
          ...state.loaders,
          [action.payload]: true
        }
      };
    case STOP_LOADER:
      return {
        ...state,
        loaders: {
          ...state.loaders,
          [action.payload]: false
        }
      };
    default:
      return state;
  }
};