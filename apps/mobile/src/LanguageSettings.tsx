import { getTheme, toggleTheme } from "./theme";
import { useEffect, useSyncExternalStore } from "react";
import { Text, View, Pressable } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  getLanguage,
  setLanguage,
  subscribeLanguage,
  t,
  type Language,
  subscribeTheme,
} from "@dinvenn/core";
import { palette, ui } from "./ui";
const key = "dinvenn-language";
export function useLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage);
  useEffect(() => {
    const initial = getLanguage();
    void SecureStore.getItemAsync(key)
      .then((saved) => {
        if (getLanguage() === initial && (saved === "en" || saved === "nb"))
          setLanguage(saved);
      })
      .catch(() => {});
  }, []);
  return language;
}
export function LanguageSettings() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme);
  const language = useSyncExternalStore(subscribeLanguage, getLanguage);
  function choose(next: Language) {
    setLanguage(next);
    void SecureStore.setItemAsync(key, next).catch(() => {});
  }
  const button = {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    backgroundColor: palette.white,
  };
  const row = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 16,
  };
  return (
    <View style={[ui.card, { gap: 14 }]}>
      <Text style={ui.h3}>{t("Innstillinger")}</Text>
      <View style={row}>
        <View style={{ flex: 1 }}>
          <Text style={ui.text}>{t("Språk")}</Text>
          <Text style={ui.muted}>
            {language === "nb" ? "Norsk bokmål" : "English"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            language === "nb" ? "Bytt til engelsk" : "Switch to Norwegian"
          }
          onPress={() => choose(language === "nb" ? "en" : "nb")}
          style={button}
        >
          <Text style={{ fontSize: 26 }}>
            {language === "nb" ? "🇳🇴" : "🇬🇧"}
          </Text>
        </Pressable>
      </View>
      <View style={row}>
        <View style={{ flex: 1 }}>
          <Text style={ui.text}>{t("Utseende")}</Text>
          <Text style={ui.muted}>
            {t(theme === "light" ? "Lys modus" : "Mørk modus")}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(
            theme === "light" ? "Bytt til mørk modus" : "Bytt til lys modus",
          )}
          onPress={toggleTheme}
          style={button}
        >
          <Text style={{ fontSize: 28, color: palette.ink }}>
            {theme === "light" ? "☀" : "☾"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
