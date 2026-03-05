import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTheme } from "./lib/themeVars";

initTheme();

createRoot(document.getElementById("root")!).render(<App />);
