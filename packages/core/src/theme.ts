export type Theme = "light" | "dark";
let theme: Theme = "light";
const listeners = new Set<() => void>();
export function getTheme() {
  return theme;
}
export function setTheme(next: Theme) {
  if (theme === next) return;
  theme = next;
  listeners.forEach((listener) => listener());
}
export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
