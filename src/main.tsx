import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { RootErrorBoundary } from "./RootErrorBoundary.tsx";
import "./index.css";

const el = document.getElementById("root");
if (!el) throw new Error("Missing #root element");

createRoot(el).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
