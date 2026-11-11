import { useEffect, useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribeTheme, t } from "@dinvenn/core";
const key = "dinvenn-theme";
try {
  const saved = localStorage.getItem(key);
  if (saved === "light" || saved === "dark") setTheme(saved);
} catch {
  /* Storage can be disabled. */
}
export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelectorAll<HTMLLinkElement>(
        'link[rel="icon"], link[rel="apple-touch-icon"]',
      )
      .forEach((link) => {
        link.href =
          theme === "dark" ? "/dinvenn-logo-dark.png" : "/dinvenn-logo.png";
      });
  }, [theme]);
  return theme;
}
export function ThemePicker() {
  const theme = useTheme();
  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* Keep preference in memory. */
    }
  }
  return (
    <button
      type="button"
      className="quiet theme-toggle"
      aria-label={t(
        theme === "light" ? "Bytt til mørk modus" : "Bytt til lys modus",
      )}
      title={t(
        theme === "light" ? "Bytt til mørk modus" : "Bytt til lys modus",
      )}
      onClick={toggle}
    >
      <span aria-hidden="true">{theme === "light" ? "☀" : "☾"}</span>
    </button>
  );
}
