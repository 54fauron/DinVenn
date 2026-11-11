import { useEffect, useSyncExternalStore } from "react";
import {
  getLanguage,
  setLanguage,
  subscribeLanguage,
  t,
  type Language,
} from "@dinvenn/core";
const key = "dinvenn-language";
try {
  const saved = localStorage.getItem(key);
  if (saved === "en" || saved === "nb") setLanguage(saved);
} catch {
  /* Storage may be disabled. */
}
export function useLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === "en"
        ? "DinVenn – Business portal"
        : "DinVenn – Bedriftsportal";
  }, [language]);
  return language;
}
export function LanguagePicker() {
  const language = useLanguage();
  function choose(next: Language) {
    setLanguage(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* Keep the in-memory preference. */
    }
  }
  return (
    <div className="language-picker" role="group" aria-label={t("Språk")}>
      <button
        type="button"
        className="quiet"
        aria-label={
          language === "nb" ? "Bytt til engelsk" : "Switch to Norwegian"
        }
        title={language === "nb" ? "Bytt til engelsk" : "Switch to Norwegian"}
        onClick={() => choose(language === "nb" ? "en" : "nb")}
      >
        <span aria-hidden="true">{language === "nb" ? "🇳🇴" : "🇬🇧"}</span>
      </button>
    </div>
  );
}
