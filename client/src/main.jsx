import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import 'animate.css';
import { Provider } from 'react-redux';
import store from './redux/store';


createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <App />
  </Provider>
);
