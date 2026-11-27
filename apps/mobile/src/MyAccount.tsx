import { DeleteReviewButton } from "./DeleteReviewButton";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  api,
  locale,
  message,
  t,
  type Client,
  type OwnReview,
  type Profile,
  type Session,
} from "@dinvenn/core";
import { LanguageSettings } from "./LanguageSettings";
import { Reviews } from "./Reviews";
import { initials } from "./discovery";
import { Icon, palette, ui } from "./ui";
import { themeStyles } from "./theme";
function Action({
  title,
  onPress,
  quiet = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={[quiet ? styles.quiet : ui.button, disabled && { opacity: 0.5 }]}
    >
      <Text style={quiet ? ui.link : ui.buttonText}>{title}</Text>
    </Pressable>
  );
}
function MyReviews({ db, userId }: { db: Client; userId: string }) {
  const [rows, setRows] = useState<OwnReview[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [editing, setEditing] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void api(db)
      .myReviews()
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [db, userId, retry]);
  return (
    <View style={{ gap: 14 }}>
      {loading ? (
        <ActivityIndicator
          accessibilityLabel={t("Laster anmeldelsene dine …")}
        />
      ) : error ? (
        <View>
          <Text style={ui.text} accessibilityRole="alert">
            {t(error)}
          </Text>
          <Action
            quiet
            title={t("Prøv igjen")}
            onPress={() => setRetry((v) => v + 1)}
          />
        </View>
      ) : !rows.length ? (
        <View style={styles.empty}>
          <Icon name="star" size={25} />
          <Text style={ui.h3}>{t("Din første anmeldelse venter")}</Text>
          <Text style={ui.muted}>
            {t(
              "Har du besøkt et lokalt sted? Åpne bedriftsprofilen og del opplevelsen din.",
            )}
          </Text>
        </View>
      ) : (
        rows.map((row) => (
          <View style={[styles.review, { gap: 10 }]} key={row.id}>
            <View style={styles.row}>
              <Text style={[ui.h3, { flex: 1 }]}>{row.business_name}</Text>
              <Text style={ui.tag}>{row.rating} / 5</Text>
            </View>
            <Text style={ui.muted}>
              {new Date(row.created_at).toLocaleDateString(locale())} ·{" "}
              {t(row.is_anonymous ? "Anonym" : "Med navn")}
            </Text>
            {row.status === "hidden" && (
              <Text style={ui.tag}>{t("Skjult av administrator")}</Text>
            )}
            {!!row.comment && <Text style={ui.text}>{row.comment}</Text>}
            {!!row.business_reply && (
              <View style={styles.reply}>
                <Text style={ui.h3}>{t("Svar fra bedriften")}</Text>
                <Text style={ui.text}>{row.business_reply}</Text>
              </View>
            )}
            {row.business_status === "approved" ? (
              editing === row.id ? (
                <>
                  <Reviews
                    db={db}
                    businessId={row.business_id}
                    userId={userId}
                    onLogin={() => {}}
                    editorOnly
                    onSaved={() => {
                      setEditing(null);
                      setRetry((v) => v + 1);
                    }}
                  />
                  <Action
                    quiet
                    title={t("Avbryt")}
                    onPress={() => setEditing(null)}
                  />
                </>
              ) : (
                <Action
                  quiet
                  title={t("Rediger anmeldelse hos {0}", row.business_name)}
                  onPress={() => setEditing(row.id)}
                />
              )
            ) : (
              <Text style={ui.muted}>
                {t("Bedriften er ikke tilgjengelig for redigering nå.")}
              </Text>
            )}
            {editing !== row.id && (
              <DeleteReviewButton
                db={db}
                reviewId={row.id}
                onDeleted={() =>
                  setRows((current) => current.filter((r) => r.id !== row.id))
                }
              />
            )}
          </View>
        ))
      )}
      <Text style={ui.muted}>
        {t(
          "Du kan slette din egen anmeldelse. Administrator kan også moderere anmeldelser.",
        )}
      </Text>
    </View>
  );
}
export function MyAccount({
  db,
  session,
  profile,
  favorites,
  activeCodes,
  onProfile,
  onFavorites,
  onCodes,
  onSignOut,
  busy,
}: {
  db: Client;
  session: Session;
  profile: Profile | null;
  favorites: number;
  activeCodes: number;
  onProfile: (p: Profile) => void;
  onFavorites: () => void;
  onCodes: () => void;
  onSignOut: () => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false),
    [name, setName] = useState(""),
    [city, setCity] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [reviews, setReviews] = useState(false),
    [privacy, setPrivacy] = useState(false);
  const lock = useRef(false);
  const display =
    profile?.display_name ||
    session.user.user_metadata?.display_name ||
    t("Lokal venn");
  const support = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();
  const supportReady = !!support && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support);
  useEffect(() => {
    if (!editing) {
      setName(profile?.display_name ?? "");
      setCity(profile?.home_city ?? "");
    }
  }, [profile?.display_name, profile?.home_city, editing]);
  async function save() {
    if (lock.current || !profile) return;
    lock.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (!name.trim() || name.trim().length > 80)
        throw new Error("Navnet må ha mellom 1 og 80 tegn.");
      if (city.trim().length > 120)
        throw new Error("Hjembyen kan ha maks 120 tegn.");
      await api(db).saveMyProfile(name, city);
      onProfile({
        ...profile,
        display_name: name.trim(),
        home_city: city.trim() || null,
      });
      setEditing(false);
      setNotice("Profilen din er oppdatert.");
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  const email = (subject: string) =>
    void Linking.openURL(
      `mailto:${support}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(session.user.email ?? "")}`,
    ).catch((e) => setError(message(e)));
  return (
    <View style={styles.page}>
      <View>
        <Text style={ui.eyebrow}>{t("DITT LOKALE HJØRNE")}</Text>
        <Text style={ui.h1}>{t("Min side")}</Text>
        <Text style={ui.muted}>{t("Små fordeler. Dine favorittsteder.")}</Text>
      </View>
      <View style={styles.profile}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials(display)}</Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={ui.h2}>{display}</Text>
            <Text style={ui.muted}>
              {profile?.home_city || t("Velg din hjemby")}
            </Text>
          </View>
        </View>
        <Text style={ui.muted} selectable>
          {session.user.email || session.user.phone}
        </Text>
        {!editing ? (
          <Action
            quiet
            title={t("Rediger profil")}
            disabled={!profile}
            onPress={() => {
              setEditing(true);
              setError("");
              setNotice("");
            }}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={ui.text}>{t("Navnet ditt")}</Text>
            <TextInput
              accessibilityLabel={t("Navnet ditt")}
              value={name}
              onChangeText={setName}
              maxLength={80}
              autoComplete="name"
              editable={!saving}
              style={styles.input}
            />
            <Text style={ui.text}>{t("Hjemby (valgfritt)")}</Text>
            <TextInput
              accessibilityLabel={t("Hjemby (valgfritt)")}
              value={city}
              onChangeText={setCity}
              maxLength={120}
              editable={!saving}
              style={styles.input}
            />
            <Action
              title={t(saving ? "Jobber …" : "Lagre profilen min")}
              disabled={saving}
              onPress={() => void save()}
            />
            <Action
              quiet
              title={t("Avbryt")}
              disabled={saving}
              onPress={() => {
                setEditing(false);
                setError("");
              }}
            />
          </View>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={ui.text}>
            {t(error)}
          </Text>
        )}
        {!!notice && (
          <Text accessibilityRole="alert" style={ui.text}>
            {t(notice)}
          </Text>
        )}
      </View>
      <Text style={ui.h3}>{t("Dine fordeler")}</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Åpne favoritter")}
          onPress={onFavorites}
          style={[styles.benefit, { backgroundColor: palette.purple }]}
        >
          <Icon name="heart" size={25} />
          <Text style={styles.number}>{favorites}</Text>
          <Text style={ui.h3}>{t("Favoritter")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Åpne aktive koder")}
          onPress={onCodes}
          style={[styles.benefit, { backgroundColor: palette.yellow }]}
        >
          <Icon name="qr" size={25} />
          <Text style={styles.number}>{activeCodes}</Text>
          <Text style={ui.h3}>{t("Aktive koder")}</Text>
        </Pressable>
      </View>
      <View style={ui.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Mine anmeldelser")}
          accessibilityState={{ expanded: reviews }}
          onPress={() => setReviews((v) => !v)}
          style={styles.row}
        >
          <Icon name="star" size={23} />
          <View style={{ flex: 1 }}>
            <Text style={ui.h3}>{t("Mine anmeldelser")}</Text>
            <Text style={ui.muted}>
              {t("Dine opplevelser og svar fra bedriftene")}
            </Text>
          </View>
          <Text style={ui.link}>{reviews ? "−" : "+"}</Text>
        </Pressable>
        {reviews && <MyReviews db={db} userId={session.user.id} />}
      </View>
      <LanguageSettings />
      <View style={ui.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Hjelp og personvern")}
          accessibilityState={{ expanded: privacy }}
          onPress={() => setPrivacy((v) => !v)}
          style={styles.row}
        >
          <Icon name="user" size={23} />
          <Text style={[ui.h3, { flex: 1 }]}>{t("Hjelp og personvern")}</Text>
          <Text style={ui.link}>{privacy ? "−" : "+"}</Text>
        </Pressable>
        {privacy && (
          <View style={{ gap: 12 }}>
            <Text style={ui.text}>
              {t(
                "Navnet ditt vises på anmeldelser du publiserer med navn. Du kan velge anonym visning per anmeldelse. Hjemby er valgfritt.",
              )}
            </Text>
            <Text style={ui.muted}>
              {t(
                "Kontosletting behandles av administrator. Det er forskjellig fra å logge ut.",
              )}
            </Text>
            {supportReady && (
              <>
                <Action
                  quiet
                  title={t("Kontakt oss / rapporter et problem")}
                  onPress={() => email("DinVenn – hjelp")}
                />
                <Action
                  quiet
                  title={t("Be om sletting av konto")}
                  onPress={() =>
                    email("DinVenn – forespørsel om kontosletting")
                  }
                />
              </>
            )}
          </View>
        )}
      </View>
      <Action
        quiet
        title={t("Logg ut")}
        disabled={busy || saving}
        onPress={onSignOut}
      />
    </View>
  );
}
const styles = themeStyles({
  page: { gap: 18, width: "100%", maxWidth: 760, alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  profile: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 24,
    padding: 22,
    gap: 16,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 23,
    backgroundColor: palette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 25, fontWeight: "800", color: palette.ink },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 16,
    color: palette.ink,
    backgroundColor: palette.cream,
  },
  benefit: { flex: 1, borderRadius: 20, padding: 18, gap: 10, minWidth: 0 },
  number: { fontSize: 30, fontWeight: "800", color: palette.ink },
  quiet: { paddingVertical: 13, paddingHorizontal: 8, minHeight: 48 },
  review: { borderTopWidth: 1, borderColor: palette.border, paddingTop: 16 },
  reply: {
    padding: 12,
    gap: 7,
    borderRadius: 12,
    backgroundColor: palette.purple,
  },
  empty: { paddingVertical: 14, gap: 9 },
});
