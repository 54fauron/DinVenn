import { themeStyles, themeColor } from "./theme";
import { t, locale } from "@dinvenn/core";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  discount,
  filterDeals,
  type Business,
  type BusinessEvent,
  type Category,
  type Deal,
  type NewsPost,
} from "@dinvenn/core";
import { eventWhen, initials, remainingTime, directionsUrl } from "./discovery";
import { Icon, palette, SectionHeading, ui } from "./ui";
export function CategoryChips({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}) {
  const icons: Record<string, string> = {
    "mat-drikke": "coffee",
    shopping: "shop",
    aktiviteter: "spark",
    kultur: "calendar",
    skjonnhet: "heart",
    trening: "spark",
  };
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={e.chips}
    >
      {[{ id: "", name: t("Alle"), slug: "" }, ...categories].map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          accessibilityState={{ selected: value === String(c.id) }}
          onPress={() => onChange(String(c.id))}
          style={[ui.chip, value === String(c.id) && ui.chipActive]}
        >
          <Icon name={icons[c.slug] ?? "spark"} size={15} />
          <Text style={ui.chipText}>{t(c.name)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function BusinessCard({
  business,
  deals,
  onPress,
}: {
  business: Business;
  deals: Deal[];
  onPress: () => void;
}) {
  const count = deals.filter((d) => d.business_id === business.id).length;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={e.businessRow}
    >
      {business.cover_url ? (
        <Image source={{ uri: business.cover_url }} style={e.businessImage} />
      ) : (
        <View style={e.businessPlaceholder}>
          <Text style={e.initials}>{initials(business.name)}</Text>
        </View>
      )}
      <View style={e.grow}>
        <Text style={ui.h3}>{business.name}</Text>
        <Text style={ui.muted}>
          {[business.address, business.city].filter(Boolean).join(" · ")}
        </Text>
        {count > 0 && (
          <Text style={e.inlineTag}>
            {count} {count === 1 ? "vennepris" : t("vennepriser")}
          </Text>
        )}
      </View>
      <Icon name="chevron" size={18} />
    </Pressable>
  );
}
export function EventCard({
  event,
  business,
  onPress,
}: {
  event: BusinessEvent;
  business?: Business;
  onPress: () => void;
}) {
  const date = new Date(event.starts_at);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={e.eventRow}>
      <View style={e.dateTile}>
        <Text style={e.day}>
          {date.toLocaleDateString(locale(), { day: "numeric" })}
        </Text>
        <Text style={e.month}>
          {date.toLocaleDateString(locale(), { month: "short" })}
        </Text>
      </View>
      <View style={e.grow}>
        <Text style={ui.h3}>{event.title}</Text>
        <Text style={ui.muted}>
          {business?.name} ·{" "}
          {date.toLocaleTimeString(locale(), {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        <Text style={e.inlineTag}>{event.price_text ?? t("Gratis")}</Text>
      </View>
      <Icon name="chevron" size={18} />
    </Pressable>
  );
}
export function NewsCard({
  post,
  business,
  onPress,
}: {
  post: NewsPost;
  business?: Business;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={e.newsCard}>
      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={e.newsImage} />
      )}
      <View style={e.newsBody}>
        <View style={ui.row}>
          <Icon name="news" size={15} />
          <Text style={ui.eyebrow}>{business?.name ?? t("LOKALT NYTT")}</Text>
        </View>
        <Text style={ui.h3}>{post.title}</Text>
        <Text numberOfLines={2} style={ui.muted}>
          {post.body}
        </Text>
        <Text style={e.newsDate}>
          {new Date(post.published_at).toLocaleDateString(locale(), {
            day: "numeric",
            month: "long",
          })}{" "}
          {t("· Les mer →")}{" "}
        </Text>
      </View>
    </Pressable>
  );
}
export function Explore({
  businesses,
  deals,
  categories,
  events,
  news,
  city,
  setCity,
  category,
  setCategory,
  search,
  setSearch,
  mode,
  name,
  now,
  busy,
  isFavorite,
  onFavorite,
  onDeal,
  onBusiness,
  onEvent,
  onNews,
  onMap,
}: {
  businesses: Business[];
  deals: Deal[];
  categories: Category[];
  events: BusinessEvent[];
  news: NewsPost[];
  city: string;
  setCity: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  mode: "explore" | "favorites";
  name: string;
  now: number;
  busy: boolean;
  isFavorite: (type: string, id: string) => boolean;
  onFavorite: (type: "deal" | "business" | "event", id: string) => void;
  onDeal: (d: Deal) => void;
  onBusiness: (b: Business) => void;
  onEvent: (e: BusinessEvent) => void;
  onNews: (n: NewsPost) => void;
  onMap: () => void;
}) {
  const saved = mode === "favorites";
  const activeDeals = deals.filter(
    (d) => !d.ends_at || Date.parse(d.ends_at) > now,
  );
  const matches = (id: string, text: string) => {
    const b = businesses.find((b) => b.id === id);
    return (
      !!b &&
      (!city || b.city === city) &&
      (!category || String(b.category_id) === category) &&
      (!search ||
        `${text} ${b.name}`
          .toLocaleLowerCase("nb-NO")
          .includes(search.trim().toLocaleLowerCase("nb-NO")))
    );
  };
  const offers = filterDeals(
    activeDeals,
    businesses,
    search,
    city,
    category,
  ).filter((d) => !saved || isFavorite("deal", d.id));
  const places = businesses.filter(
    (b) =>
      matches(b.id, `${b.name} ${b.description ?? ""}`) &&
      (!saved || isFavorite("business", b.id)),
  );
  const agenda = events.filter(
    (item) =>
      matches(item.business_id, `${item.title} ${item.description ?? ""}`) &&
      (!saved || isFavorite("event", item.id)),
  );
  const posts = news.filter((item) =>
    matches(item.business_id, `${item.title} ${item.body ?? ""}`),
  );
  return (
    <>
      <View style={e.location}>
        <Icon name="pin" size={16} />
        <Text style={e.locationText}>{city || t("Velg din by")}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onMap}
          style={e.mapShortcut}
        >
          <Icon name="map" size={15} />
          <Text style={ui.link}>{t("Åpne kart")}</Text>
        </Pressable>
      </View>
      <View style={e.intro}>
        <Text style={ui.eyebrow}>
          {saved
            ? t("DINE LOKALE FAVORITTER")
            : t("HEI, {0}!", name.toLocaleUpperCase("nb-NO"))}
        </Text>
        <Text style={ui.h1}>
          {saved
            ? t("Stedene og tilbudene\ndu vil tilbake til.")
            : t("Små steder.\nGode opplevelser.")}
        </Text>
        <Text style={ui.muted}>
          {saved
            ? t("Alle hjertene dine, samlet på ett sted.")
            : t("Oppdag vennepriser og det som skjer hos de lokale.")}
        </Text>
      </View>
      <View style={e.search}>
        <Icon name="search" size={19} />
        <TextInput
          accessibilityLabel={t("Søk etter tilbud, bedrift eller arrangement")}
          placeholder="Kaffe, butikk, aktivitet …"
          placeholderTextColor={palette.muted}
          value={search}
          onChangeText={setSearch}
          style={e.searchInput}
        />
        {!!search && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Tøm søk")}
            onPress={() => setSearch("")}
          >
            <Text style={ui.link}>{t("Tøm")}</Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={e.chips}
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
            accessibilityRole="button"
            accessibilityState={{ selected: city === c }}
            key={c}
            style={[e.cityChip, city === c && e.cityActive]}
            onPress={() => setCity(c)}
          >
            <Text style={[e.cityLabel, city === c && { color: palette.ink }]}>
              {c || t("Alle byer")}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <CategoryChips
        categories={categories}
        value={category}
        onChange={setCategory}
      />
      {!saved && (
        <View style={e.featureBanner}>
          <View style={e.grow}>
            <Text style={e.bannerEyebrow}>
              {" "}
              {t("EN LITEN FORDEL. ET LOKALT BESØK.")}{" "}
            </Text>
            <Text style={e.bannerTitle}>
              {t("Godt for deg.\nFint for byen.")}
            </Text>
            <Text style={e.bannerText}>
              {t("Velg lokalt neste gang du skal ut.")}
            </Text>
          </View>
          <View style={e.bannerMark}>
            <Icon name="heart" size={50} color={themeColor("#a55f42")} />
          </View>
        </View>
      )}
      <SectionHeading
        title={saved ? t("Lagrede vennepriser") : t("Vennepriser nå")}
      />
      {!offers.length ? (
        <View style={ui.empty}>
          <Text style={ui.h3}>
            {saved
              ? t("Ingen lagrede tilbud her ennå")
              : t("Ingen vennepriser akkurat nå")}
          </Text>
          <Text style={ui.muted}>
            {" "}
            {t("Prøv en annen by eller kategori")}{" "}
            {saved ? t(", eller lagre et hjerte under Utforsk.") : "."}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={e.offerStrip}
        >
          {offers.map((item, i) => {
            const b = businesses.find((b) => b.id === item.business_id);
            return (
              <View
                key={item.id}
                style={[
                  e.offerCard,
                  {
                    backgroundColor: [
                      palette.peach,
                      palette.yellow,
                      palette.purple,
                    ][i % 3],
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onDeal(item)}
                  style={e.offerMain}
                >
                  {item.image_url && (
                    <Image
                      source={{ uri: item.image_url }}
                      style={e.offerImage}
                    />
                  )}
                  <Text style={e.discount}>{discount(item)}</Text>
                  <Text numberOfLines={2} style={e.offerTitle}>
                    {item.title}
                  </Text>
                  <View style={e.countdown}>
                    <Icon name="clock" size={12} />
                    <Text style={e.countdownText}>
                      {remainingTime(item.ends_at, now)}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={e.offerBusiness}>
                    {b?.name}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFavorite("deal", item.id)
                      ? t("Fjern {0} fra favoritter", item.title)
                      : t("Lagre {0}", item.title)
                  }
                  accessibilityState={{
                    selected: isFavorite("deal", item.id),
                    disabled: busy,
                  }}
                  disabled={busy}
                  onPress={() => onFavorite("deal", item.id)}
                  style={e.heart}
                >
                  <Icon
                    name="heart"
                    size={19}
                    color={
                      isFavorite("deal", item.id) ? "#a24c45" : palette.ink
                    }
                  />
                  {isFavorite("deal", item.id) && (
                    <View style={e.favoriteDot} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
      <SectionHeading
        title={saved ? t("Lagrede arrangementer") : t("Hva skjer?")}
      />
      {!agenda.length ? (
        <Text style={ui.muted}>
          {saved
            ? t("Lagre et arrangement for å finne det igjen her.")
            : t("Ingen publiserte arrangementer passer filtrene akkurat nå.")}
        </Text>
      ) : (
        agenda.map((item) => (
          <EventCard
            key={item.id}
            event={item}
            business={businesses.find((b) => b.id === item.business_id)}
            onPress={() => onEvent(item)}
          />
        ))
      )}
      {!saved && (
        <>
          <SectionHeading title={t("Nytt fra de lokale")} />
          {!posts.length ? (
            <Text style={ui.muted}>
              {" "}
              {t("Oppdateringer fra bedriftene dukker opp her.")}{" "}
            </Text>
          ) : (
            posts.map((item) => (
              <NewsCard
                key={item.id}
                post={item}
                business={businesses.find((b) => b.id === item.business_id)}
                onPress={() => onNews(item)}
              />
            ))
          )}
        </>
      )}
      <SectionHeading
        title={saved ? t("Lagrede bedrifter") : t("Bli kjent med de lokale")}
        action={t("Se kart")}
        onPress={onMap}
      />
      {!places.length ? (
        <Text style={ui.muted}>
          {saved
            ? t("Du har ingen lagrede bedrifter som passer filtrene.")
            : t("Ingen bedrifter passer søket.")}
        </Text>
      ) : (
        places.map((b) => (
          <BusinessCard
            key={b.id}
            business={b}
            deals={activeDeals}
            onPress={() => onBusiness(b)}
          />
        ))
      )}
    </>
  );
}
export function ContentDetails({
  event,
  post,
  business,
  onBusiness,
  isFavorite,
  onFavorite,
  busy,
  onError,
}: {
  event?: BusinessEvent | null;
  post?: NewsPost | null;
  business?: Business;
  onBusiness: () => void;
  isFavorite: boolean;
  onFavorite: () => void;
  busy: boolean;
  onError: (e: unknown) => void;
}) {
  const item = event ?? post;
  if (!item) return null;
  return (
    <>
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={e.detailCover} />
      )}
      <View style={e.detailType}>
        <Icon name={event ? "calendar" : "news"} size={16} />
        <Text style={ui.eyebrow}>
          {event ? t("DETTE SKJER") : t("NYTT FRA DE LOKALE")}
        </Text>
      </View>
      <Text style={ui.h1}>{item.title}</Text>
      <Text style={ui.muted}>{business?.name}</Text>
      {event && (
        <View style={ui.card}>
          <View style={ui.row}>
            <Icon name="calendar" />
            <Text style={[ui.text, e.grow]}>
              {eventWhen(event.starts_at)}
              {event.ends_at ? ` – ${eventWhen(event.ends_at)}` : ""}
            </Text>
          </View>
          <View style={ui.row}>
            <Icon name="pin" />
            <Text style={[ui.text, e.grow]}>
              {event.location_text ||
                business?.address ||
                t("Sted er ikke oppgitt")}
            </Text>
          </View>
          <Text style={ui.tag}>{event.price_text ?? t("Gratis")}</Text>
        </View>
      )}
      <Text style={ui.text}>{event ? event.description : post?.body}</Text>
      {post && (
        <Text style={ui.muted}>
          {" "}
          {t("Publisert")}{" "}
          {new Date(post.published_at).toLocaleDateString(locale(), {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Text>
      )}
      {event && (
        <>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onFavorite}
            style={ui.button}
          >
            <Text style={ui.buttonText}>
              {isFavorite
                ? t("♥ Fjern fra favoritter")
                : t("♡ Lagre arrangement")}
            </Text>
          </Pressable>
          {event.ticket_url && /^https?:\/\//i.test(event.ticket_url) && (
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL(event.ticket_url!).catch(onError);
              }}
              style={ui.button}
            >
              <Text style={ui.buttonText}>
                {t("Billetter / mer informasjon ↗")}
              </Text>
            </Pressable>
          )}
        </>
      )}
      {business && (
        <Pressable
          accessibilityRole="button"
          onPress={onBusiness}
          style={ui.card}
        >
          <View style={ui.row}>
            <Icon name="shop" />
            <Text style={[ui.h3, e.grow]}>
              {t("Om")} {business.name}
            </Text>
            <Icon name="chevron" />
          </View>
        </Pressable>
      )}
    </>
  );
}
export function BusinessDetails({
  business,
  deals,
  events,
  news,
  categories,
  onDeal,
  onEvent,
  onNews,
  onMap,
  isFavorite,
  onFavorite,
  busy,
  onError,
}: {
  business: Business;
  deals: Deal[];
  events: BusinessEvent[];
  news: NewsPost[];
  categories: Category[];
  onDeal: (d: Deal) => void;
  onEvent: (e: BusinessEvent) => void;
  onNews: (n: NewsPost) => void;
  onMap: () => void;
  isFavorite: boolean;
  onFavorite: () => void;
  busy: boolean;
  onError: (e: unknown) => void;
}) {
  const category = categories.find((c) => c.id === business.category_id);
  return (
    <>
      {business.cover_url ? (
        <Image source={{ uri: business.cover_url }} style={e.detailCover} />
      ) : (
        <View style={e.businessHero}>
          <Text style={e.heroInitials}>{initials(business.name)}</Text>
        </View>
      )}
      <Text style={ui.eyebrow}>
        {category ? t(category.name) : t("ET LOKALT STED")}
      </Text>
      <Text style={ui.h1}>{business.name}</Text>
      <Text style={ui.text}>{business.description}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        style={ui.card}
        onPress={onFavorite}
      >
        <View style={ui.row}>
          <Icon name="heart" color={isFavorite ? "#a24c45" : palette.ink} />
          <Text style={ui.text}>
            {isFavorite ? t("Lagret som favoritt") : t("Lagre dette stedet")}
          </Text>
        </View>
      </Pressable>
      <SectionHeading title={t("Vennepriser hos oss")} />
      {deals
        .filter((d) => d.business_id === business.id)
        .map((d) => (
          <Pressable
            key={d.id}
            accessibilityRole="button"
            onPress={() => onDeal(d)}
            style={[ui.card, { backgroundColor: palette.peach }]}
          >
            <Text style={e.discount}>{discount(d)}</Text>
            <Text style={ui.h3}>{d.title}</Text>
            <Text style={ui.muted}>{remainingTime(d.ends_at)}</Text>
            <Text style={ui.link}>{t("Se venneprisen →")}</Text>
          </Pressable>
        ))}
      <SectionHeading title={t("Kommende")} />
      {events
        .filter((item) => item.business_id === business.id)
        .map((item) => (
          <EventCard
            key={item.id}
            event={item}
            business={business}
            onPress={() => onEvent(item)}
          />
        ))}
      <SectionHeading title={t("Nyheter fra oss")} />
      {news
        .filter((item) => item.business_id === business.id)
        .map((item) => (
          <NewsCard
            key={item.id}
            post={item}
            business={business}
            onPress={() => onNews(item)}
          />
        ))}
      <SectionHeading title={t("Praktisk")} />
      <View style={ui.card}>
        <View style={ui.row}>
          <Icon name="pin" />
          <Text style={[ui.text, e.grow]}>
            {[business.address, business.postal_code, business.city]
              .filter(Boolean)
              .join(", ") || t("Adresse er ikke oppgitt")}
          </Text>
        </View>
        {business.phone && (
          <Text selectable style={ui.text}>
            {" "}
            {t("Telefon:")} {business.phone}
          </Text>
        )}
        {business.email && (
          <Text selectable style={ui.text}>
            {" "}
            {t("E-post:")} {business.email}
          </Text>
        )}
      </View>
      <Pressable accessibilityRole="button" onPress={onMap} style={ui.button}>
        <Text style={ui.buttonText}>{t("Vis på kartet")}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() =>
          void Linking.openURL(directionsUrl(business)).catch(onError)
        }
        style={ui.card}
      >
        <View style={ui.row}>
          <Icon name="arrow" />
          <Text style={ui.h3}>{t("Åpne veibeskrivelse")}</Text>
        </View>
      </Pressable>
      {business.website && /^https?:\/\//i.test(business.website) && (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(business.website!).catch(onError)}
          style={ui.card}
        >
          <Text style={ui.h3}>{t("Besøk nettsiden ↗")}</Text>
        </Pressable>
      )}
    </>
  );
}
const e = themeStyles({
  grow: { flex: 1, minWidth: 0 },
  location: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: 12, fontWeight: "600", color: palette.muted },
  mapShortcut: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  intro: { gap: 9, paddingVertical: 8 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 14,
    color: palette.ink,
  },
  chips: { gap: 8, paddingVertical: 2 },
  cityChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  cityActive: { borderBottomColor: palette.coral },
  cityLabel: { fontSize: 12, color: palette.muted, fontWeight: "600" },
  featureBanner: {
    backgroundColor: palette.peach,
    padding: 22,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bannerEyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    fontWeight: "700",
    color: "#80593f",
    lineHeight: 14,
  },
  bannerTitle: {
    fontSize: 26,
    lineHeight: 31,
    color: palette.ink,
    letterSpacing: -0.7,
    fontWeight: "800",
    marginVertical: 9,
  },
  bannerText: { fontSize: 11, color: "#785849", lineHeight: 17 },
  bannerMark: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ffdbc3",
    alignItems: "center",
    justifyContent: "center",
  },
  offerStrip: { gap: 13, paddingBottom: 4 },
  offerCard: { width: 238, borderRadius: 20, overflow: "hidden" },
  offerMain: { padding: 20, gap: 10, flex: 1 },
  offerImage: { height: 116, width: "100%", borderRadius: 12, marginBottom: 5 },
  discount: {
    fontSize: 32,
    fontWeight: "800",
    color: palette.ink,
    letterSpacing: -1,
    marginTop: 24,
  },
  offerTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700",
    color: palette.ink,
    minHeight: 46,
  },
  countdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ffffff80",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  countdownText: { fontSize: 10, color: palette.ink, fontWeight: "600" },
  offerBusiness: { fontSize: 11, color: "#745c60", marginTop: 2 },
  heart: {
    position: "absolute",
    right: 12,
    top: 12,
    backgroundColor: "#ffffffad",
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#a24c45",
    position: "absolute",
    bottom: 4,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    borderRadius: 18,
  },
  dateTile: {
    backgroundColor: palette.yellow,
    width: 52,
    height: 61,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  day: { fontSize: 23, fontWeight: "800", color: palette.ink },
  month: { fontSize: 10, color: palette.muted },
  inlineTag: {
    fontSize: 10,
    fontWeight: "600",
    color: "#81613c",
    marginTop: 5,
  },
  businessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    borderRadius: 18,
  },
  businessImage: { width: 58, height: 58, borderRadius: 13 },
  businessPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 13,
    backgroundColor: palette.green,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 18, fontWeight: "800", color: "#60755d" },
  newsCard: {
    borderRadius: 19,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
  },
  newsImage: { width: "100%", height: 150 },
  newsBody: { padding: 18, gap: 9 },
  newsDate: { fontSize: 10, color: palette.muted, marginTop: 3 },
  detailCover: { width: "100%", height: 220, borderRadius: 20 },
  detailType: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 8,
  },
  businessHero: {
    height: 160,
    borderRadius: 20,
    backgroundColor: palette.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInitials: { fontSize: 50, fontWeight: "800", color: "#a78a43" },
});
