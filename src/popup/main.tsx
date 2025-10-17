import React from "react";
import { createRoot } from "react-dom/client";
import App from "./popup";
import { initTheme } from "../ui/theme";

initTheme().then(() => {
	createRoot(document.getElementById("root")!).render(<App />);
});
