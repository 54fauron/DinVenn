import { useEffect, useSyncExternalStore } from "react";
import {
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { getTheme, setTheme, subscribeTheme } from "@dinvenn/core";
export { getTheme } from "@dinvenn/core";
const key = "dinvenn-theme";
export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme);
  useEffect(() => {
    const initial = getTheme();
    void SecureStore.getItemAsync(key)
      .then((saved) => {
        if (getTheme() === initial && (saved === "light" || saved === "dark"))
          setTheme(saved);
      })
      .catch(() => {});
  }, []);
  return theme;
}
export function toggleTheme() {
  const next = getTheme() === "light" ? "dark" : "light";
  setTheme(next);
  void SecureStore.setItemAsync(key, next).catch(() => {});
}
const darkColors: Record<string, string> = {
  "#fff7f0": "#151319",
  "#3b2a3a": "#f5edf4",
  "#81717a": "#bfb2c0",
  "#ffc9a8": "#594236",
  "#ff8a7a": "#f5a094",
  "#ed8e7b": "#f5a094",
  "#eee4f4": "#342c40",
  "#e6dbef": "#342c40",
  "#fff0c5": "#4d432b",
  "#e5f0e6": "#293d32",
  "#eadfd6": "#49404b",
  "#e7d9d1": "#49404b",
  "#fffdfb": "#242027",
  "#fffdfa": "#242027",
  "#fff": "#242027",
  "#6e5e6a": "#c4b7c2",
  "#82717d": "#bfb2c0",
  "#b9a3b0": "#776579",
  "#cbb9c1": "#776579",
  "#ffe0db": "#542e35",
  "#deecdf": "#294536",
  "#92573f": "#f1b293",
  "#705333": "#f0d49e",
  "#80593f": "#f0c3a5",
  "#785849": "#e5c1ad",
  "#ffdbc3": "#6b4b37",
  "#ffffff80": "#242027cc",
  "#ffffffad": "#242027ee",
  "#745c60": "#d0b9c1",
  "#a24c45": "#a24c45",
  "#81613c": "#efcf9c",
  "#60755d": "#bed6ba",
  "#a78a43": "#efd48c",
  "#a55f42": "#eeb28d",
};
export function themeColor(color: string) {
  return getTheme() === "dark"
    ? (darkColors[color.toLowerCase()] ?? color)
    : color;
}
// Keep the existing light styles intact, and resolve colours when a component renders.
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };
export function themeStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  styles: T & NamedStyles<any>,
): T {
  const light = StyleSheet.create(styles);
  let dark: T | undefined;
  return new Proxy(light, {
    get(target, name: string) {
      if (getTheme() !== "dark") return target[name as keyof T];
      if (!dark)
        dark = Object.fromEntries(
          Object.entries(styles).map(([key, style]) => [
            key,
            Object.fromEntries(
              Object.entries(style as object).map(([property, value]) => [
                property,
                typeof value === "string" &&
                property.toLowerCase().includes("color")
                  ? property === "shadowColor"
                    ? "#000000"
                    : themeColor(value)
                  : value,
              ]),
            ),
          ]),
        ) as T;
      return dark![name as keyof T];
    },
  });
}
