import { useEffect } from "react";
export function StatusBar({ style }: { style?: string }) {
  useEffect(() => {
    document.body.style.backgroundColor =
      style === "light" ? "#151319" : "#fff7f0";
    document.documentElement.style.colorScheme =
      style === "light" ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", style === "light" ? "#151319" : "#fff7f0");
  }, [style]);
  return null;
}
