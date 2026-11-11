import { t, locale } from "@dinvenn/core";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import type { Business, Category, Deal } from "@dinvenn/core";
import {
  addressSearchUrl,
  chooseAddressPoint,
  directionsUrl,
  storedPoint,
  type AddressHit,
  type Point,
} from "./discovery";
import { CategoryChips } from "./Explore";
import { Icon, palette, ui } from "./ui";
const cache = new Map<string, Point>();
type Located = { business: Business; point: Point };
export default function MapScreen({
  businesses,
  categories,
  deals,
  targetId,
  targetRequest = 0,
  initialCity = "",
  onBusiness,
  onError,
}: {
  businesses: Business[];
  categories: Category[];
  deals: Deal[];
  targetId: string | null;
  targetRequest?: number;
  initialCity?: string;
  onBusiness: (b: Business) => void;
  onError: (e: unknown) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState(
    businesses.find((b) => b.id === targetId)?.city ?? initialCity,
  );
  const [located, setLocated] = useState<Located[]>([]);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string | null>(targetId);
  const [ready, setReady] = useState(false);
  const [showList, setShowList] = useState(false);
  const map = useRef<MapView>(null);
  const visible = businesses.filter(
    (b) =>
      (!city || b.city === city) &&
      (!category || String(b.category_id) === category) &&
      (!query ||
        `${b.name} ${b.address ?? ""}`
          .toLocaleLowerCase("nb-NO")
          .includes(query.toLocaleLowerCase("nb-NO"))),
  );
  const signature = visible
    .map(
      (b) =>
        `${b.id}|${b.address}|${b.postal_code}|${b.city}|${b.lat}|${b.lng}`,
    )
    .join(";");
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 15000);
    setLoading(true);
    const work = visible.slice();
    const result: Located[] = [];
    async function worker() {
      while (work.length && !abort.signal.aborted) {
        const b = work.shift()!;
        const url = addressSearchUrl(b);
        let point = storedPoint(b) ?? (url ? (cache.get(url) ?? null) : null);
        if (!point && url) {
          try {
            const response = await fetch(url, { signal: abort.signal });
            if (!response.ok)
              throw new Error(t("Adresseoppslaget svarte ikke."));
            const data: { adresser?: AddressHit[] } = await response.json();
            point = chooseAddressPoint(
              b,
              Array.isArray(data.adresser) ? data.adresser : [],
            );
            if (point) cache.set(url, point);
          } catch {
            /* Unresolved addresses remain in the list, never guessed on the map. */
          }
        }
        if (point) result.push({ business: b, point });
      }
    }
    void Promise.all([worker(), worker(), worker()]).then(() => {
      if (active) {
        setLocated(result);
        setSelected((id) =>
          result.some((p) => p.business.id === id) ? id : null,
        );
        setLoading(false);
        clearTimeout(timeout);
      }
    });
    return () => {
      active = false;
      abort.abort();
      clearTimeout(timeout);
    };
  }, [signature, retry]);
  useEffect(() => {
    setSelected(targetId);
    if (targetId) {
      const business = businesses.find((b) => b.id === targetId);
      setCity(business?.city ?? initialCity);
      setQuery("");
      setCategory("");
    }
  }, [targetId, targetRequest]);
  function fit() {
    if (!ready || !located.length) return;
    const target = located.find((p) => p.business.id === targetId);
    if (target) {
      map.current?.animateToRegion(
        { ...target.point, latitudeDelta: 0.015, longitudeDelta: 0.015 },
        350,
      );
    } else if (located.length === 1) {
      map.current?.animateToRegion(
        { ...located[0].point, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        350,
      );
    } else
      map.current?.fitToCoordinates(
        located.map((p) => p.point),
        {
          edgePadding: { top: 45, left: 40, right: 40, bottom: 170 },
          animated: true,
        },
      );
  }
  useEffect(() => {
    fit();
  }, [ready, located, targetId, targetRequest]);
  const picked = located.find((p) => p.business.id === selected);
  const unresolved = visible.filter(
    (b) => !located.some((p) => p.business.id === b.id),
  );
  return (
    <View style={m.screen}>
      <View style={m.controls}>
        <View style={m.heading}>
          <View>
            <Text style={ui.eyebrow}>{t("FINN ET LOKALT STED")}</Text>
            <Text style={ui.h2}>{t("Rett rundt hjørnet")}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowList((v) => !v)}
            style={m.smallButton}
          >
            <Text style={ui.link}>
              {showList ? t("Vis kart") : t("Vis liste")}
            </Text>
          </Pressable>
        </View>
        <View style={m.search}>
          <Icon name="search" size={18} />
          <TextInput
            accessibilityLabel={t("Søk på kartet")}
            placeholder={t("Bedrift eller gate …")}
            placeholderTextColor={palette.muted}
            value={query}
            onChangeText={setQuery}
            style={m.input}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={m.chips}
        >
          {[
            "",
            ...Array.from(
              new Set(
                businesses.map((b) => b.city).filter((c): c is string => !!c),
              ),
            ),
          ].map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityState={{ selected: city === c }}
              onPress={() => setCity(c)}
              style={[ui.chip, city === c && ui.chipActive]}
            >
              <Text style={ui.chipText}>{c || t("Alle byer")}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <CategoryChips
          categories={categories}
          value={category}
          onChange={setCategory}
        />
      </View>
      {showList ? (
        <ScrollView contentContainerStyle={m.list}>
          <Text style={ui.muted}>
            {visible.length} {t("lokale steder")}
          </Text>
          {visible.map((b) => (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              style={ui.card}
              onPress={() => onBusiness(b)}
            >
              <Text style={ui.h3}>{b.name}</Text>
              <Text style={ui.muted}>
                {[b.address, b.city].filter(Boolean).join(", ")}
              </Text>
              <Text style={ui.link}>{t("Se bedrift og vennepriser →")}</Text>
            </Pressable>
          ))}
          {!visible.length && (
            <Text style={ui.text}>{t("Ingen bedrifter passer filtrene.")}</Text>
          )}
        </ScrollView>
      ) : (
        <View style={m.mapArea}>
          <MapView
            ref={map}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: 64.2,
              longitude: 12,
              latitudeDelta: 14,
              longitudeDelta: 20,
            }}
            onMapReady={() => {
              setReady(true);
              fit();
            }}
            onPress={(event) => {
              if (event.nativeEvent.action !== "marker-press")
                setSelected(null);
            }}
            showsUserLocation={false}
            showsMyLocationButton={false}
            accessibilityLabel={t("Kart over lokale bedrifter")}
          >
            {located.map((p) => (
              <Marker
                key={p.business.id}
                coordinate={p.point}
                title={p.business.name}
                description={p.business.address ?? ""}
                pinColor={
                  selected === p.business.id
                    ? palette.ink
                    : (categories.find((c) => c.id === p.business.category_id)
                        ?.color ?? palette.coral)
                }
                onPress={(event) => {
                  event.stopPropagation();
                  setSelected(p.business.id);
                }}
              />
            ))}
          </MapView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Vis alle bedriftsmarkører")}
            onPress={() => {
              if (located.length)
                map.current?.fitToCoordinates(
                  located.map((p) => p.point),
                  {
                    edgePadding: { top: 45, left: 40, right: 40, bottom: 170 },
                    animated: true,
                  },
                );
            }}
            style={m.fit}
          >
            <Icon name="map" size={20} />
          </Pressable>
          {loading && (
            <View style={m.loading}>
              <ActivityIndicator size="small" color={palette.ink} />
              <Text style={ui.muted}>{t("Finner bedriftenes adresser …")}</Text>
            </View>
          )}
          {!loading && !located.length && (
            <View style={m.empty}>
              <Text style={ui.h3}>
                {visible.length
                  ? t("Ingen sikre kartplasseringer ennå")
                  : t("Ingen treff")}
              </Text>
              <Text style={ui.muted}>
                {visible.length
                  ? t(
                      "Åpne listen for å se bedriftene, eller prøv adresseoppslaget igjen.",
                    )
                  : t("Prøv en annen by, kategori eller et annet søk.")}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowList(true)}
              >
                <Text style={ui.link}>{t("Se bedriftene som liste →")}</Text>
              </Pressable>
            </View>
          )}
          {picked && (
            <View style={m.sheet}>
              <View style={m.sheetHeading}>
                <View style={m.grow}>
                  <Text style={ui.h3}>{picked.business.name}</Text>
                  <Text style={ui.muted}>
                    {[picked.business.address, picked.business.city]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
                <Text style={ui.tag}>
                  {
                    deals.filter((d) => d.business_id === picked.business.id)
                      .length
                  }{" "}
                  {t("vennepriser")}{" "}
                </Text>
              </View>
              <View style={ui.row}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onBusiness(picked.business)}
                  style={[ui.button, m.grow]}
                >
                  <Text style={ui.buttonText}>{t("Se bedrift")}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={t(
                    "Veibeskrivelse til {0}",
                    picked.business.name,
                  )}
                  onPress={() =>
                    void Linking.openURL(
                      directionsUrl(picked.business, picked.point),
                    ).catch(onError)
                  }
                  style={m.route}
                >
                  <Icon name="arrow" size={22} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}
      {!loading && unresolved.length > 0 && !showList && (
        <View style={m.unresolved}>
          <View style={ui.row}>
            <Text style={[ui.muted, m.grow]}>
              {unresolved.length}{" "}
              {unresolved.length === 1
                ? t("adresse kunne")
                : t("adresser kunne")}{" "}
              {t("ikke plasseres sikkert.")}{" "}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRetry((v) => v + 1)}
            >
              <Text style={ui.link}>{t("Prøv igjen")}</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowList(true)}
          >
            <Text style={ui.link}>{t("Se alle steder i listen →")}</Text>
          </Pressable>
        </View>
      )}
      <Text style={m.attribution}>
        {" "}
        {t(
          "Adresseoppslag: Kartverket · Kartet viser bedrifter, ikke din posisjon.",
        )}{" "}
      </Text>
    </View>
  );
}
const m = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.cream },
  controls: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    gap: 11,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  smallButton: { paddingVertical: 10 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 13,
    backgroundColor: palette.white,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: palette.ink },
  chips: { gap: 8 },
  mapArea: {
    flex: 1,
    minHeight: 210,
    backgroundColor: palette.green,
    overflow: "hidden",
  },
  grow: { flex: 1, minWidth: 0 },
  sheet: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
    padding: 17,
    gap: 14,
    elevation: 4,
    shadowColor: "#3b2a3a",
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
  },
  sheetHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  route: { backgroundColor: palette.peach, padding: 13, borderRadius: 12 },
  fit: {
    position: "absolute",
    right: 14,
    top: 14,
    padding: 12,
    backgroundColor: palette.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.border,
  },
  loading: {
    position: "absolute",
    top: 15,
    left: 14,
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unresolved: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    gap: 5,
    borderTopWidth: 1,
    borderColor: palette.border,
  },
  attribution: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    fontSize: 9,
    color: palette.muted,
    textAlign: "center",
  },
  empty: {
    margin: 18,
    marginTop: 65,
    padding: 18,
    borderRadius: 16,
    backgroundColor: palette.white,
    gap: 8,
  },
  list: { padding: 20, gap: 13 },
});
