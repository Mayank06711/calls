import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { Provider } from "react-redux"; // get the Provider component to wrap around our whole app
import { store } from "./redux/store.js";


createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <App />
  </Provider>
);
