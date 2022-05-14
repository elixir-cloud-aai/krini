import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import "react-confirm-alert/src/react-confirm-alert.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
