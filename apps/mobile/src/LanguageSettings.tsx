import { useEffect, useSyncExternalStore } from "react";
import { Text, View, Pressable } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  getLanguage,
  setLanguage,
  subscribeLanguage,
  t,
  type Language,
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
  const language = useSyncExternalStore(subscribeLanguage, getLanguage);
  function choose(next: Language) {
    setLanguage(next);
    void SecureStore.setItemAsync(key, next).catch(() => {});
  }
  return (
    <View
      style={{
        backgroundColor: palette.white,
        borderRadius: 20,
        padding: 20,
        gap: 14,
        marginBottom: 20,
      }}
    >
      <Text style={ui.h3}>⚙ {t("Innstillinger")}</Text>
      <Text>{t("Språk")}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          language === "nb" ? "Bytt til engelsk" : "Switch to Norwegian"
        }
        onPress={() => choose(language === "nb" ? "en" : "nb")}
        style={{
          alignSelf: "flex-start",
          minWidth: 48,
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          padding: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.white,
        }}
      >
        <Text style={{ fontSize: 26 }}>{language === "nb" ? "🇳🇴" : "🇬🇧"}</Text>
      </Pressable>
    </View>
  );
}
