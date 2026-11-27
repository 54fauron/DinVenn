import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  api,
  t,
  locale,
  message,
  type Client,
  type Review,
} from "@dinvenn/core";
import { palette, ui } from "./ui";
export function Reviews({
  db,
  businessId,
  userId,
  onLogin,
  editorOnly = false,
  onSaved,
}: {
  db: Client;
  businessId: string;
  userId?: string;
  onLogin: () => void;
  editorOnly?: boolean;
  onSaved?: () => void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    setError("");
    setNotice("");
    setReviews([]);
    setRating(5);
    setComment("");
    setAnonymous(false);
    api(db)
      .reviews(businessId)
      .then((rows) => {
        if (!active) return;
        setReviews(rows);
        const own = rows.find((r) => r.is_own);
        if (own) {
          setRating(own.rating);
          setComment(own.comment ?? "");
          setAnonymous(own.is_anonymous);
        }
      })
      .catch((e) => {
        if (active) {
          setError(message(e));
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [db, businessId, userId, retry]);
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(db).review(businessId, rating, comment, anonymous);
      setReviews(await api(db).reviews(businessId));
      setNotice("Anmeldelsen er lagret.");
      onSaved?.();
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const own = reviews.find((r) => r.is_own);
  return (
    <View style={{ gap: 14 }}>
      {!editorOnly && <Text style={ui.h2}>{t("Anmeldelser")}</Text>}
      {!editorOnly && !!reviews.length && (
        <Text style={ui.text}>
          {(
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          ).toLocaleString(locale(), { maximumFractionDigits: 1 })}{" "}
          / 5 · {reviews.length} {t("anmeldelser")}
        </Text>
      )}
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          {!editorOnly && !reviews.length && !error && (
            <Text style={ui.muted}>{t("Ingen anmeldelser ennå.")}</Text>
          )}
          {!editorOnly &&
            reviews.map((r) => (
              <View key={r.id} style={ui.card}>
                <Text style={ui.h3}>
                  {r.is_anonymous
                    ? t("Anonym")
                    : (r.author_name ?? t("Bruker"))}
                  {r.is_own ? ` · ${t("Din anmeldelse")}` : ""}
                </Text>
                <Text style={ui.text}>
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </Text>
                <Text style={ui.muted}>
                  {new Date(r.created_at).toLocaleDateString(locale())}
                </Text>
                {!!r.comment && <Text style={ui.text}>{r.comment}</Text>}
                {!!r.business_reply && (
                  <View
                    style={{
                      padding: 12,
                      backgroundColor: palette.purple,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={ui.h3}>{t("Svar fra bedriften")}</Text>
                    <Text style={ui.text}>{r.business_reply}</Text>
                  </View>
                )}
              </View>
            ))}
          {userId ? (
            <View style={ui.card}>
              <Text style={ui.h3}>
                {t(own ? "Rediger anmeldelsen din" : "Skriv en anmeldelse")}
              </Text>
              <View style={{ flexDirection: "row" }}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable
                    key={value}
                    disabled={busy}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: rating === value }}
                    accessibilityLabel={t("{0} stjerner", value)}
                    onPress={() => setRating(value)}
                    style={{ padding: 8 }}
                  >
                    <Text style={{ color: palette.ink, fontSize: 28 }}>
                      {value <= rating ? "★" : "☆"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel={t("Anmeldelse")}
                placeholder={t("Fortell om opplevelsen din …")}
                placeholderTextColor={palette.muted}
                multiline
                maxLength={1000}
                editable={!busy}
                value={comment}
                onChangeText={setComment}
                style={{
                  color: palette.ink,
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 12,
                  padding: 12,
                  minHeight: 90,
                }}
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: anonymous }}
                disabled={busy}
                onPress={() => setAnonymous((v) => !v)}
                style={{ paddingVertical: 12 }}
              >
                <Text style={ui.text}>
                  {anonymous ? "☑" : "☐"} {t("Vis anmeldelsen anonymt")}
                </Text>
              </Pressable>
              <Text style={ui.muted}>
                {t("Bare administrator kan slette anmeldelser.")}
              </Text>
              <Text style={ui.muted}>
                {t(
                  "Diskriminerende og nedsettende ord er ikke tillatt i anmeldelser eller svar.",
                )}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Lagre anmeldelse")}
                disabled={busy || loadFailed}
                onPress={() => void save()}
                style={ui.button}
              >
                <Text style={ui.buttonText}>
                  {t(busy ? "Jobber …" : "Lagre anmeldelse")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={onLogin}
              style={ui.button}
            >
              <Text style={ui.buttonText}>
                {t("Logg inn for å skrive anmeldelse")}
              </Text>
            </Pressable>
          )}
        </>
      )}
      {!!error && (
        <View style={ui.card}>
          <Text accessibilityRole="alert" style={ui.text}>
            {t(error)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetry((v) => v + 1)}
          >
            <Text style={ui.link}>{t("Prøv igjen")}</Text>
          </Pressable>
        </View>
      )}
      {!!notice && (
        <Text accessibilityRole="alert" style={ui.text}>
          {t(notice)}
        </Text>
      )}
    </View>
  );
}
