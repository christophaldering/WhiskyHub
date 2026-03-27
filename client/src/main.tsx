import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTheme } from "./lib/themeVars";
import { registerServiceWorker } from "./lib/swRegistration";

initTheme();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
