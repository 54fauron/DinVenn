import { useEffect } from "react";
export function StatusBar({ style }: { style?: string }) {
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", style === "light" ? "#151319" : "#fff7f0");
  }, [style]);
  return null;
}
