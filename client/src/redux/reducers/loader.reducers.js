import { START_LOADER, STOP_LOADER,LOADER_TYPES } from '../action_creators/loader.action_creators';

const initialState = {
  loaders: Object.values(LOADER_TYPES).reduce((acc, type) => {
    acc[type] = false;
    return acc;
  }, {})
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