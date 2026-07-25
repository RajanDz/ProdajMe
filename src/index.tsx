import "./index.css";
import "./i18n/index";
import React from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./App";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found. Check your index.html.");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
);
