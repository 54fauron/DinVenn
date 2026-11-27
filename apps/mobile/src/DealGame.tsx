import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import {
  api,
  discount,
  message,
  t,
  type Client,
  type Deal,
  type DealGame as Game,
} from "@dinvenn/core";
import { palette, ui } from "./ui";
import { themeStyles } from "./theme";
export function DealGame({
  db,
  deal,
  onClaim,
  onClose,
}: {
  db: Client;
  deal: Deal;
  onClaim: () => Promise<void>;
  onClose: () => void;
}) {
  const [game, setGame] = useState<Game | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const epoch = useRef(0);
  async function start() {
    const request = ++epoch.current;
    setBusy(true);
    setError("");
    try {
      const next = await api(db).startGame(deal.id);
      if (request === epoch.current) setGame(next);
    } catch (e) {
      if (request === epoch.current) setError(message(e));
    } finally {
      if (request === epoch.current) setBusy(false);
    }
  }
  useEffect(() => {
    void start();
    return () => {
      epoch.current++;
    };
  }, [db, deal.id]);
  async function move(action: number) {
    if (!game || lock.current || busy) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setGame(await api(db).playGame(game, action));
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function claim() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await onClaim();
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const button = (
    title: string,
    action: number,
    disabled = false,
    face?: string,
  ) => (
    <Pressable
      key={action}
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={busy || disabled}
      onPress={() => void move(action)}
      style={[s.tile, (busy || disabled) && { opacity: 0.55 }]}
    >
      <Text style={face ? s.symbol : ui.h3}>{face || title}</Text>
    </Pressable>
  );
  return (
    <View style={s.page}>
      <Text style={ui.eyebrow}>{t("SPILL OG HENT VENNEPRISEN")}</Text>
      <Text style={ui.h1}>{t("Tre på rad")}</Text>
      <View style={ui.card}>
        <Text style={ui.h3}>{deal.title}</Text>
        <Text style={ui.text}>{discount(deal)}</Text>
        {!!deal.terms && <Text style={ui.muted}>{deal.terms}</Text>}
        <Text style={ui.text}>{deal.discount_details || deal.description}</Text>
        <Text style={ui.muted}>
          {t(
            "Fullfør én runde tre på rad. Du trenger ikke vinne eller være rask.",
          )}
        </Text>
      </View>
      {busy && <ActivityIndicator accessibilityLabel={t("Jobber")} />}
      {!!error && (
        <View style={ui.card}>
          <Text accessibilityRole="alert" style={ui.text}>
            {t(error)}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void start()}
            style={s.quiet}
          >
            <Text style={ui.link}>{t("Last spillrunden på nytt")}</Text>
          </Pressable>
        </View>
      )}
      {game && !game.completed && (
        <>
          <>
            <Text style={ui.text}>
              {t(
                "Du er X. Spill én runde mot O. Seier, tap og uavgjort gir samme rabatt.",
              )}
            </Text>
            <View style={s.grid}>
              {(game.state.board ?? []).map((mark, i) =>
                button(mark || t("Rute {0}", i + 1), i, !!mark, mark || "·"),
              )}
            </View>
          </>
          <Text style={ui.muted}>
            {t(
              "Plassen holdes av i opptil én time mens du spiller, så lenge tilbudet fortsatt er aktivt.",
            )}
          </Text>
        </>
      )}
      {game?.completed && (
        <View style={ui.card}>
          <Text style={s.food}>🎉</Text>
          <Text style={ui.h2}>{t("Runden er fullført!")}</Text>
          <Text style={ui.text}>
            {t(
              "Venneprisen er klar til å hentes. Trykk nedenfor for å få QR-koden.",
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void claim()}
            style={ui.button}
          >
            <Text style={ui.buttonText}>{t("Hent venneprisen min")}</Text>
          </Pressable>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onClose}
        style={s.quiet}
      >
        <Text style={ui.link}>{t("Tilbake til tilbudet")}</Text>
      </Pressable>
    </View>
  );
}
const s = themeStyles({
  page: { gap: 18, maxWidth: 650, width: "100%", alignSelf: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "30%",
    minHeight: 92,
    padding: 9,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    backgroundColor: palette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  quiet: { padding: 14, minHeight: 48 },
  symbol: {
    fontSize: 36,
    fontWeight: "800",
    color: palette.ink,
    textAlign: "center",
  },
  food: { fontSize: 48, textAlign: "center" },
});
