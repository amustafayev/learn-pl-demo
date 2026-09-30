import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// The teacher app's tokens, dark theme and fonts — one design system.
import "@app/index.css";
import StudentApp from "./StudentApp.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StudentApp />
  </StrictMode>,
);
