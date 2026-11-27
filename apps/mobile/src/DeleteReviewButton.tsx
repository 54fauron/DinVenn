import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api, message, t, type Client } from "@dinvenn/core";
import { palette, ui } from "./ui";
export function DeleteReviewButton({
  db,
  reviewId,
  onDeleted,
  disabled = false,
  onBusyChange,
}: {
  db: Client;
  reviewId: string;
  onDeleted: () => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [confirming, setConfirming] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  async function remove() {
    if (lock.current || disabled) return;
    lock.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      await api(db).deleteReview(reviewId);
      onDeleted();
      setConfirming(false);
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <View style={{ gap: 10 }}>
      {!confirming ? (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => {
            setConfirming(true);
            setError("");
          }}
          style={{ paddingVertical: 12 }}
        >
          <Text style={ui.link}>{t("Slett min anmeldelse")}</Text>
        </Pressable>
      ) : (
        <View style={[ui.card, { backgroundColor: palette.cream }]}>
          <Text style={ui.h3}>{t("Vil du slette anmeldelsen din?")}</Text>
          <Text style={ui.text}>
            {t(
              "Dette kan ikke angres. Eventuelt svar fra bedriften fjernes også.",
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy || disabled}
            onPress={() => void remove()}
            style={ui.button}
          >
            <Text style={ui.buttonText}>
              {t(busy ? "Jobber …" : "Ja, slett anmeldelsen")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => setConfirming(false)}
            style={{ paddingVertical: 12 }}
          >
            <Text style={ui.link}>{t("Avbryt sletting")}</Text>
          </Pressable>
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={ui.text}>
          {t(error)}
        </Text>
      )}
    </View>
  );
}
