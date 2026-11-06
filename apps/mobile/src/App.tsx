import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import QRCode from "react-native-qrcode-svg";
import {
  api,
  check,
  discount,
  filterDeals,
  message,
  redemptionStatus,
  unwrap,
  type Business,
  type Category,
  type Deal,
  type Favorite,
  type Redemption,
  type Session,
} from "@dinvenn/core";
import { client, configured } from "./client";
const colors = {
  cream: "#fff7f0",
  ink: "#3b2a3a",
  peach: "#ffc9a8",
  coral: "#ff8a7a",
  purple: "#e6dbef",
  border: "#e7d9d1",
};
function Button({
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
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, quiet && s.quiet, disabled && { opacity: 0.5 }]}
    >
      <Text style={[s.buttonText, quiet && { color: colors.ink }]}>
        {title}
      </Text>
    </Pressable>
  );
}
function Input({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#82717d"
        {...props}
        style={[s.input, props.style]}
      />
    </View>
  );
}
function AppBody() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [tab, setTab] = useState("Utforsk");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [codes, setCodes] = useState<Redemption[]>([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [code, setCode] = useState<Redemption | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authMode, setAuthMode] = useState("login");
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function loadCatalog() {
    if (!client) return;
    setLoading(true);
    try {
      const data = await api(client).catalog();
      setBusinesses(data.businesses);
      setDeals(data.deals);
      setCategories(data.categories);
    } finally {
      setLoading(false);
    }
  }
  async function loadPrivate(user: string) {
    if (!client) return;
    const [f, r] = await Promise.all([
      api(client).favorites(user),
      api(client).redemptions(user),
    ]);
    setFavorites(f);
    setCodes(r);
  }
  useEffect(() => {
    if (!client) {
      setAuthReady(true);
      return;
    }
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
      if (!next) {
        setFavorites([]);
        setCodes([]);
        setCode(null);
      }
    });
    if (AppState.currentState === "active") client.auth.startAutoRefresh();
    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        client!.auth.startAutoRefresh();
        void loadCatalog().catch((e) => setError(message(e)));
      } else client!.auth.stopAutoRefresh();
    });
    void loadCatalog().catch((e) => setError(message(e)));
    return () => {
      sub.subscription.unsubscribe();
      appSub.remove();
      client!.auth.stopAutoRefresh();
    };
  }, []);
  useEffect(() => {
    if (session)
      void loadPrivate(session.user.id).catch((e) => setError(message(e)));
  }, [session?.user.id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!code || !client || !session) return;
    let active = true;
    const timer = setInterval(() => {
      if (AppState.currentState !== "active") return;
      void api(client!)
        .redemptions(session.user.id)
        .then((rows) => {
          if (active) {
            setCodes(rows);
            const updated = rows.find((r) => r.id === code.id);
            if (updated) setCode(updated);
          }
        })
        .catch((e) => {
          if (active) setError(message(e));
        });
    }, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [code?.id, session?.user.id]);
  function needUser() {
    if (session) return true;
    setDeal(null);
    setBusiness(null);
    setCode(null);
    setTab("Meg");
    setNotice("Logg inn for å lagre favoritter og hente vennepriser.");
    return false;
  }
  function toggleFavorite(type: "deal" | "business", id: string) {
    if (!needUser()) return;
    void run(async () => {
      await api(client!).favorite(
        session!.user.id,
        type,
        id,
        !favorites.some((f) => f.target_type === type && f.target_id === id),
      );
      await loadPrivate(session!.user.id);
    });
  }
  const favorite = (type: string, id: string) =>
    favorites.some((f) => f.target_type === type && f.target_id === id);
  const filtered = filterDeals(deals, businesses, search, city, category);
  const visibleDeals =
    tab === "Favoritter"
      ? filtered.filter((d) => favorite("deal", d.id))
      : filtered;
  const currentBusiness = deal
    ? businesses.find((b) => b.id === deal.business_id)
    : business;
  function DealCard({ item }: { item: Deal }) {
    const b = businesses.find((b) => b.id === item.business_id);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${b?.name ?? ""}`}
        onPress={() => setDeal(item)}
        style={s.dealCard}
      >
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={s.cover} />
        )}
        <View style={s.row}>
          <Text style={s.discount}>{discount(item)}</Text>
          <Button
            title={favorite("deal", item.id) ? "♥ Lagret" : "♡ Lagre"}
            quiet
            disabled={busy}
            onPress={() => toggleFavorite("deal", item.id)}
          />
        </View>
        <Text style={s.h2}>{item.title}</Text>
        <Text style={s.muted}>
          {b?.name} · {b?.city}
        </Text>
        <Text style={s.small}>
          {item.ends_at
            ? `Til ${new Date(item.ends_at).toLocaleDateString("nb-NO")}`
            : "Så lenge tilbudet er aktivt"}
        </Text>
      </Pressable>
    );
  }
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <View style={s.brandGroup}>
          <Image
            source={require("../assets/dinvenn-logo.png")}
            style={s.brandLogo}
            resizeMode="contain"
            accessible={false}
          />
          <Text style={s.brand}>DinVenn</Text>
        </View>
        <Text style={s.small}>HEIA DE LOKALE</Text>
      </View>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() =>
              void run(async () => {
                await loadCatalog();
                if (session) await loadPrivate(session.user.id);
              })
            }
          />
        }
      >
        {error ? (
          <View accessibilityRole="alert" style={s.alert}>
            <Text style={s.text}>{error}</Text>
            <Button title="Lukk melding" quiet onPress={() => setError("")} />
          </View>
        ) : null}
        {notice ? (
          <View style={s.notice}>
            <Text style={s.text}>{notice}</Text>
          </View>
        ) : null}
        {busy && (
          <ActivityIndicator accessibilityLabel="Jobber" color={colors.ink} />
        )}
        {!configured ? (
          <View style={s.hero}>
            <Text style={s.eyebrow}>DINVENN PILOT</Text>
            <Text style={s.h1}>Gode steder.{`\n`}Fine vennepriser.</Text>
            <Text style={s.text}>
              Appen trenger Supabase-tilkobling. Kopier apps/mobile/.env.example
              til .env og fyll inn URL og offentlig nøkkel. Se README.
            </Text>
          </View>
        ) : tab === "Meg" ? (
          <>
            <Text style={s.h1}>
              {session ? "Hei, venn!" : "Bli en lokal venn"}
            </Text>
            {!authReady ? (
              <ActivityIndicator />
            ) : session ? (
              <View style={s.card}>
                <Text style={s.text}>{session.user.email}</Text>
                <Text style={s.muted}>
                  Favorittene og kodene dine følger kontoen din.
                </Text>
                <Button
                  title="Logg ut"
                  quiet
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      check(await client!.auth.signOut());
                      setPassword("");
                    })
                  }
                />
              </View>
            ) : (
              <View style={s.card}>
                {authMode === "register" && (
                  <Input
                    label="Navnet ditt"
                    value={name}
                    onChangeText={setName}
                    autoComplete="name"
                  />
                )}
                <Input
                  label="E-post"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                {authMode !== "reset" && (
                  <Input
                    label="Passord (minst 8 tegn)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete={
                      authMode === "register"
                        ? "new-password"
                        : "current-password"
                    }
                  />
                )}
                <Button
                  title={
                    authMode === "login"
                      ? "Logg inn"
                      : authMode === "register"
                        ? "Opprett konto"
                        : "Send tilbakestillingslenke"
                  }
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      if (!email.trim())
                        throw new Error("Skriv e-postadressen din.");
                      const portal = process.env.EXPO_PUBLIC_PORTAL_URL;
                      if (authMode === "login") {
                        check(
                          await client!.auth.signInWithPassword({
                            email: email.trim(),
                            password,
                          }),
                        );
                        setPassword("");
                        setTab("Utforsk");
                      } else if (authMode === "register") {
                        if (password.length < 8 || !name.trim())
                          throw new Error(
                            "Skriv navn og et passord på minst 8 tegn.",
                          );
                        if (!portal)
                          throw new Error(
                            "Sett EXPO_PUBLIC_PORTAL_URL for e-postbekreftelse.",
                          );
                        check(
                          await client!.auth.signUp({
                            email: email.trim(),
                            password,
                            options: {
                              data: { display_name: name.trim() },
                              emailRedirectTo: portal,
                            },
                          }),
                        );
                        setPassword("");
                        setNotice(
                          "Sjekk e-posten og bekreft kontoen. Deretter kan du logge inn her.",
                        );
                      } else {
                        if (!portal)
                          throw new Error(
                            "Sett EXPO_PUBLIC_PORTAL_URL for passordtilbakestilling.",
                          );
                        check(
                          await client!.auth.resetPasswordForEmail(
                            email.trim(),
                            { redirectTo: portal + "/?recovery=1" },
                          ),
                        );
                        setNotice(
                          "Hvis kontoen finnes, får du en e-post. Velg nytt passord i nettleseren, og logg deretter inn her.",
                        );
                      }
                    })
                  }
                />
                <Button
                  title={
                    authMode === "register"
                      ? "Til innlogging"
                      : "Opprett en konto"
                  }
                  quiet
                  onPress={() =>
                    setAuthMode(authMode === "register" ? "login" : "register")
                  }
                />
                <Button
                  title={
                    authMode === "reset" ? "Til innlogging" : "Glemt passord?"
                  }
                  quiet
                  onPress={() =>
                    setAuthMode(authMode === "reset" ? "login" : "reset")
                  }
                />
              </View>
            )}
          </>
        ) : tab === "Mine koder" ? (
          <>
            <Text style={s.h1}>Dine vennepriser</Text>
            {!session ? (
              <Button
                title="Logg inn for å se kodene dine"
                onPress={() => setTab("Meg")}
              />
            ) : !codes.length ? (
              <Text style={s.muted}>
                Du har ikke hentet noen koder ennå. Finn en vennepris under
                Utforsk.
              </Text>
            ) : (
              codes.map((r) => (
                <Pressable
                  accessibilityRole="button"
                  key={r.id}
                  style={s.card}
                  onPress={() => setCode(r)}
                >
                  <Text style={s.h2}>
                    {deals.find((d) => d.id === r.deal_id)?.title ??
                      "Hentet vennepris"}
                  </Text>
                  <Text style={s.text}>{redemptionStatus(r, now)}</Text>
                  <Text style={s.small}>
                    Gyldig til {new Date(r.expires_at).toLocaleString("nb-NO")}
                  </Text>
                </Pressable>
              ))
            )}
          </>
        ) : (
          <>
            <View style={s.hero}>
              <Text style={s.eyebrow}>RETT RUNDT HJØRNET</Text>
              <Text style={s.h1}>
                {tab === "Favoritter"
                  ? "Dine lokale favoritter."
                  : "Finn din neste\nfavoritt."}
              </Text>
              <Text style={s.text}>
                Vennepriser fra små steder med mye å gi.
              </Text>
            </View>
            <Input
              label="Søk etter tilbud eller bedrift"
              placeholder="Kaffe, butikk, aktivitet …"
              value={search}
              onChangeText={setSearch}
            />
            <Text style={s.label}>By</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chips}
            >
              {[
                "",
                ...Array.from(
                  new Set(
                    businesses
                      .map((b) => b.city)
                      .filter((c): c is string => !!c),
                  ),
                ),
              ].map((c) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: city === c }}
                  key={c}
                  style={[s.chip, city === c && s.chipActive]}
                  onPress={() => setCity(c)}
                >
                  <Text style={s.text}>{c || "Alle byer"}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={s.label}>Kategori</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chips}
            >
              {[{ id: "", name: "Alle" }, ...categories].map((c) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === String(c.id) }}
                  key={c.id}
                  style={[s.chip, category === String(c.id) && s.chipActive]}
                  onPress={() => setCategory(String(c.id))}
                >
                  <Text style={s.text}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={s.h2}>Vennepriser nå</Text>
            {loading && !deals.length ? (
              <ActivityIndicator />
            ) : !visibleDeals.length ? (
              <Text style={s.muted}>
                {tab === "Favoritter"
                  ? "Ingen lagrede tilbud passer filtrene. Lagre et hjerte under Utforsk."
                  : "Ingen tilbud passer akkurat nå. Prøv en annen by eller kategori."}
              </Text>
            ) : (
              visibleDeals.map((d) => <DealCard item={d} key={d.id} />)
            )}
            <Text style={s.h2}>
              {tab === "Favoritter"
                ? "Lagrede bedrifter"
                : "Bli kjent med de lokale"}
            </Text>
            {businesses
              .filter(
                (b) =>
                  (!city || b.city === city) &&
                  (!category || String(b.category_id) === category) &&
                  (!search ||
                    `${b.name} ${b.description ?? ""}`
                      .toLocaleLowerCase("nb-NO")
                      .includes(search.toLocaleLowerCase("nb-NO"))) &&
                  (tab !== "Favoritter" || favorite("business", b.id)),
              )
              .map((b) => (
                <Pressable
                  key={b.id}
                  accessibilityRole="button"
                  style={s.card}
                  onPress={() => setBusiness(b)}
                >
                  <Text style={s.h2}>{b.name}</Text>
                  <Text style={s.muted}>
                    {b.city} · {b.address}
                  </Text>
                </Pressable>
              ))}
            {tab === "Favoritter" && !session && (
              <Button
                title="Logg inn for å se favorittene dine"
                onPress={() => setTab("Meg")}
              />
            )}
            <Button
              title="Oppdater"
              quiet
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await loadCatalog();
                  if (session) await loadPrivate(session.user.id);
                })
              }
            />
          </>
        )}
      </ScrollView>
      <View style={s.tabs}>
        {["Utforsk", "Favoritter", "Mine koder", "Meg"].map((t, i) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            key={t}
            style={[s.tab, tab === t && { backgroundColor: colors.peach }]}
            onPress={() => setTab(t)}
          >
            <View style={s.tabIconSlot} accessible={false}>
              <Text style={s.tabIcon} allowFontScaling={false}>
                {["⌂", "♡", "▦", "☺"][i]}
              </Text>
            </View>
            <Text style={s.tabText}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={!!deal || !!business || !!code}
        animationType="slide"
        onRequestClose={() => {
          setDeal(null);
          setBusiness(null);
          setCode(null);
        }}
      >
        <SafeAreaView style={s.safe}>
          <ScrollView contentContainerStyle={s.content}>
            <Button
              title="← Tilbake"
              quiet
              onPress={() => {
                setDeal(null);
                setBusiness(null);
                setCode(null);
              }}
            />
            {error ? (
              <Text accessibilityRole="alert" style={s.alert}>
                {error}
              </Text>
            ) : null}
            {busy && <ActivityIndicator />}
            {code ? (
              <View style={s.card}>
                <Text style={s.eyebrow}>DIN VENNEPRIS</Text>
                <Text style={s.h1}>{redemptionStatus(code, now)}</Text>
                {redemptionStatus(code, now) === "Klar til bruk" ? (
                  <>
                    <View style={s.qr}>
                      <QRCode value={code.token} size={230} />
                    </View>
                    <Text selectable style={s.code}>
                      {code.token}
                    </Text>
                    <Text style={s.text}>
                      Vis QR-koden til bedriften. Den kan bare brukes én gang.
                    </Text>
                    <Text style={s.small}>
                      Gyldig til{" "}
                      {new Date(code.expires_at).toLocaleString("nb-NO")}
                    </Text>
                    <Text style={s.small}>
                      {Math.max(
                        0,
                        Math.ceil((Date.parse(code.expires_at) - now) / 60000),
                      )}{" "}
                      minutter igjen
                    </Text>
                    <Button
                      title="Oppdater status"
                      quiet
                      onPress={() =>
                        void run(async () => {
                          const rows = await api(client!).redemptions(
                            session!.user.id,
                          );
                          setCodes(rows);
                          const r = rows.find((r) => r.id === code.id);
                          if (r) setCode(r);
                        })
                      }
                    />
                  </>
                ) : (
                  <Text style={s.text}>
                    {code.status === "redeemed"
                      ? "Takk for at du velger lokalt! Koden er brukt."
                      : "Denne koden kan ikke brukes lenger."}
                  </Text>
                )}
              </View>
            ) : deal ? (
              <>
                {deal.image_url && (
                  <Image source={{ uri: deal.image_url }} style={s.cover} />
                )}
                <Text style={s.discount}>{discount(deal)}</Text>
                <Text style={s.h1}>{deal.title}</Text>
                <Text style={s.text}>{deal.description}</Text>
                <Text style={s.h2}>Vilkår</Text>
                <Text style={s.text}>
                  {deal.terms || "Ingen ekstra vilkår oppgitt."}
                </Text>
                <Text style={s.small}>
                  Maks {deal.max_per_user} per bruker.{" "}
                  {deal.ends_at
                    ? `Til ${new Date(deal.ends_at).toLocaleString("nb-NO")}.`
                    : "Ingen fast sluttdato."}
                </Text>
                <Button
                  title="Hent vennepris"
                  disabled={busy}
                  onPress={() => {
                    if (!needUser()) return;
                    void run(async () => {
                      const r = await api(client!).claim(deal.id);
                      setCode(r);
                      await loadPrivate(session!.user.id);
                    });
                  }}
                />
                <Button
                  title={
                    favorite("deal", deal.id)
                      ? "♥ Fjern fra favoritter"
                      : "♡ Lagre favoritt"
                  }
                  quiet
                  disabled={busy}
                  onPress={() => toggleFavorite("deal", deal.id)}
                />
                {currentBusiness && (
                  <Button
                    title={`Om ${currentBusiness.name} →`}
                    quiet
                    onPress={() => {
                      setBusiness(currentBusiness);
                      setDeal(null);
                    }}
                  />
                )}
              </>
            ) : business ? (
              <>
                {business.cover_url && (
                  <Image source={{ uri: business.cover_url }} style={s.cover} />
                )}
                <Text style={s.h1}>{business.name}</Text>
                <Text style={s.text}>{business.description}</Text>
                <Text style={s.muted}>
                  {business.address}, {business.postal_code} {business.city}
                </Text>
                {business.phone && (
                  <Text selectable style={s.text}>
                    Telefon: {business.phone}
                  </Text>
                )}
                {business.email && (
                  <Text selectable style={s.text}>
                    E-post: {business.email}
                  </Text>
                )}
                {business.website && /^https?:\/\//i.test(business.website) && (
                  <Button
                    title="Besøk nettside ↗"
                    quiet
                    onPress={() =>
                      void run(async () => {
                        await Linking.openURL(business.website!);
                      })
                    }
                  />
                )}
                <Button
                  title={
                    favorite("business", business.id)
                      ? "♥ Fjern favoritt"
                      : "♡ Lagre bedrift"
                  }
                  quiet
                  disabled={busy}
                  onPress={() => toggleFavorite("business", business.id)}
                />
                <Text style={s.h2}>Vennepriser hos oss</Text>
                {deals
                  .filter((d) => d.business_id === business.id)
                  .map((d) => (
                    <DealCard item={d} key={d.id} />
                  ))}
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <AppBody />
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  brandGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandLogo: { width: 44, height: 44, borderRadius: 11 },
  brand: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -1.5,
  },
  content: { padding: 22, gap: 16, paddingBottom: 40 },
  h1: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.1,
    fontWeight: "800",
    color: colors.ink,
    marginVertical: 8,
  },
  h2: {
    fontSize: 21,
    fontWeight: "700",
    color: colors.ink,
    marginVertical: 7,
    letterSpacing: -0.5,
  },
  text: { fontSize: 16, color: colors.ink, lineHeight: 24 },
  muted: { fontSize: 15, color: "#6e5e6a", lineHeight: 23 },
  small: { fontSize: 12, color: "#6e5e6a", lineHeight: 19 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.ink,
  },
  hero: {
    backgroundColor: colors.peach,
    padding: 24,
    borderRadius: 24,
    gap: 8,
  },
  card: {
    backgroundColor: "#fffdfa",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    borderRadius: 20,
    gap: 10,
  },
  dealCard: {
    padding: 22,
    borderRadius: 22,
    backgroundColor: colors.purple,
    gap: 8,
  },
  discount: {
    fontSize: 31,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    paddingHorizontal: 17,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 3,
  },
  quiet: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#b9a3b0",
  },
  buttonText: { fontSize: 15, fontWeight: "700", color: colors.cream },
  field: { gap: 8 },
  label: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  input: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#cbb9c1",
    borderRadius: 12,
    backgroundColor: "#fff",
    color: colors.ink,
    fontSize: 16,
  },
  chips: { gap: 8, paddingVertical: 4 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#fffdfa",
  },
  chipActive: { backgroundColor: colors.peach, borderColor: colors.peach },
  alert: {
    backgroundColor: "#ffe0db",
    borderRadius: 14,
    padding: 16,
    color: colors.ink,
  },
  notice: { backgroundColor: "#deecdf", borderRadius: 14, padding: 16 },
  tabs: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 7,
    gap: 3,
  },
  tabIconSlot: { height: 32, alignItems: "center", justifyContent: "center" },
  tabIcon: {
    fontSize: 23,
    lineHeight: 30,
    includeFontPadding: false,
    color: colors.ink,
  },
  tabText: {
    fontSize: 10,
    lineHeight: 14,
    includeFontPadding: false,
    color: colors.ink,
    fontWeight: "600",
    textAlign: "center",
  },
  cover: { width: "100%", height: 190, borderRadius: 16 },
  qr: {
    backgroundColor: "#fff",
    padding: 20,
    alignSelf: "center",
    marginVertical: 15,
  },
  code: { fontSize: 13, textAlign: "center", color: colors.ink },
});
