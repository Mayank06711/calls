import { configureStore } from "@reduxjs/toolkit"; // modern store configuration method
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { Provider } from "react-redux"; // get the Provider component to wrap around our whole app
import rootReducer from "./redux/reducers/rootReducer.js"; // import our root reducer

const theStore = configureStore({
  reducer: rootReducer,
});

createRoot(document.getElementById("root")).render(
  <Provider store={theStore}>
    <App />
  </Provider>
);
