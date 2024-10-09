import {thunk} from 'redux-thunk';
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers/rootReducer';
const store = configureStore({
    reducer: rootReducer, // Pass the combined reducer here
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(thunk), // Add thunk middleware
});

export { store };
