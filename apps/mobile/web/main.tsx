import React from "react";
import { createRoot } from "react-dom/client";
import App from "../src/App";
import "./style.css";
import { getLanguage, subscribeLanguage } from "@dinvenn/core";
function updateLanguage() {
  document.documentElement.lang = getLanguage();
}
subscribeLanguage(updateLanguage);
updateLanguage();
// Old password-reset links used the root domain when it hosted the portal.
const recovery =
  new URLSearchParams(location.search).has("recovery") ||
  new URLSearchParams(location.hash.slice(1)).get("type") === "recovery";
if (recovery || new URLSearchParams(location.search).has("portal")) {
  location.replace(
    "https://bedrift.dinvenn.app/" + location.search + location.hash,
  );
}

createRoot(document.getElementById("root")!).render(<App />);
if ("serviceWorker" in navigator)
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
