import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  Text,
  View,
} from "react-native";
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
const names = {
  memory: "Finn lokale par",
  tic_tac_toe: "Tre på rad",
  rock_paper_scissors: "Stein, saks, papir",
  burgers: "Flipp burgerne",
  kebab: "Skjær kebaben",
};
const hands = ["🪨", "📄", "✂️"];
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
  const swipe = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 30,
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > 50) void move(0);
    },
  });
  const button = (
    title: string,
    action: number,
    disabled = false,
    face?: string,
    art?: string,
  ) => (
    <Pressable
      key={action}
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={busy || disabled}
      onPress={() => void move(action)}
      style={[s.tile, (busy || disabled) && { opacity: 0.55 }]}
    >
      {!!art && <Text style={s.symbol}>{art}</Text>}
      <Text style={face ? s.symbol : ui.h3}>{face || title}</Text>
    </Pressable>
  );
  return (
    <View style={s.page}>
      <Text style={ui.eyebrow}>{t("SPILL OG HENT VENNEPRISEN")}</Text>
      <Text style={ui.h1}>
        {game ? t(names[game.kind]) : t("Velger spill …")}
      </Text>
      <View style={ui.card}>
        <Text style={ui.h3}>{deal.title}</Text>
        <Text style={ui.text}>{discount(deal)}</Text>
        {!!deal.terms && <Text style={ui.muted}>{deal.terms}</Text>}
        <Text style={ui.text}>{deal.discount_details || deal.description}</Text>
        <Text style={ui.muted}>
          {t(
            "Fullfør runden. Du trenger ikke vinne eller være rask. Rabatten er den samme uansett spill.",
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
          {game.kind === "memory" && (
            <>
              <Text style={ui.text}>
                {t("Finn tre par. Trykk på kortene for å snu dem.")}
              </Text>
              <View style={s.grid}>
                {(game.state.faces ?? []).map((face, i) =>
                  button(
                    face === null
                      ? t("Snu kort {0}", i + 1)
                      : ["☕", "🍔", "🎵"][face],
                    i,
                    (game.state.matched ?? []).includes(i),
                    face === null ? "✦" : ["☕", "🍔", "🎵"][face],
                  ),
                )}
              </View>
            </>
          )}
          {game.kind === "tic_tac_toe" && (
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
          )}
          {game.kind === "rock_paper_scissors" && (
            <>
              <Text style={ui.text}>
                {t("Spill tre runder. Velg stein, papir eller saks.")}
              </Text>
              <Text style={ui.h3}>
                {t("Runder: {0} / 3", game.state.rounds ?? 0)}
              </Text>
              <View style={s.grid}>
                {hands.map((hand, i) => button(hand, i, false, hand))}
              </View>
              {game.state.computer !== undefined && (
                <Text accessibilityRole="alert" style={ui.text}>
                  {t(
                    "Du: {0} · Datamaskinen: {1}",
                    hands[game.state.player!],
                    hands[game.state.computer],
                  )}
                </Text>
              )}
            </>
          )}
          {game.kind === "burgers" && (
            <>
              <Text style={ui.text}>
                {t(
                  "Vend og server tre burgere. Trykk to ganger på hver burger, én handling om gangen.",
                )}
              </Text>
              <View style={s.grid}>
                {(game.state.stages ?? []).map((stage, i) =>
                  button(
                    t(
                      stage === 0
                        ? "Vend burger {0}"
                        : stage === 1
                          ? "Server burger {0}"
                          : "Burger {0} er servert",
                      i + 1,
                    ),
                    i,
                    stage === 2,
                    undefined,
                    stage === 0 ? "🥩" : stage === 1 ? "🍔" : "✅",
                  ),
                )}
              </View>
              <Text style={s.food}>🍔 🍔 🍔</Text>
            </>
          )}
          {game.kind === "kebab" && (
            <>
              <Text style={ui.text}>
                {t(
                  "Skjær fem skiver og server porsjonen. Sveip over kebaben, eller bruk knappen.",
                )}
              </Text>
              <View {...swipe.panHandlers} style={s.kebab}>
                <Text style={s.food}>🥙</Text>
              </View>
              <Text style={ui.h3}>
                {t("Skiver: {0} / 5", game.state.cuts ?? 0)}
              </Text>
              {(game.state.cuts ?? 0) < 5
                ? button(t("Skjær én skive"), 0)
                : button(t("Server kebaben"), 1)}
            </>
          )}
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
  kebab: { padding: 25, backgroundColor: palette.yellow, borderRadius: 24 },
});
