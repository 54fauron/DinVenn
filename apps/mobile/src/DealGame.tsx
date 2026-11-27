import { RhythmBoard } from "./RhythmGame";
import { BurgerBoard, SlidingBoard, gameNames } from "./SideGames";
import { MemoryBoard } from "./MemoryGame";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  ActivityIndicator,
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
    const request = epoch.current;
    setBusy(true);
    setError("");
    // Show the player's move immediately; the server still validates both moves.
    if (
      game.kind === "tic_tac_toe" &&
      action >= 0 &&
      !game.state.result &&
      game.state.board?.[action] === ""
    ) {
      const board = [...game.state.board];
      board[action] = "X";
      setGame({ ...game, state: { ...game.state, board } });
    }
    try {
      const [next] = await Promise.all([
        api(db).playGame(game, action),
        new Promise<void>((resolve) =>
          setTimeout(
            resolve,
            game.kind === "tic_tac_toe" && action >= 0
              ? 650
              : game.kind === "sliding_puzzle"
                ? 260
                : 0,
          ),
        ),
      ]);
      if (request === epoch.current) setGame(next);
    } catch (e) {
      if (request === epoch.current) {
        setGame(game);
        setError(message(e));
      }
    } finally {
      lock.current = false;
      if (request === epoch.current) setBusy(false);
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
  const board = game?.state.board ?? [];
  const result = game?.state.result ?? "";
  const ended = !!result;
  const winning =
    [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ].find(
      (line) =>
        board[line[0]] && line.every((i) => board[i] === board[line[0]]),
    ) ?? [];
  return (
    <View style={s.page}>
      <Text style={ui.eyebrow}>{t("SPILL OG HENT VENNEPRISEN")}</Text>
      <Text style={ui.h1}>
        {t(game ? gameNames[game.kind] : "Velger spill …")}
      </Text>
      <View style={ui.card}>
        <Text style={ui.h3}>{deal.title}</Text>
        <Text style={ui.text}>{discount(deal)}</Text>
        {!!deal.terms && <Text style={ui.muted}>{deal.terms}</Text>}
        <Text style={ui.text}>{deal.discount_details || deal.description}</Text>
        <Text style={ui.muted}>
          {t(
            "Vinn spillet for å låse opp venneprisen. Du kan prøve igjen uten kostnad.",
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
      {game?.kind === "cheese_rhythm" && (
        <RhythmBoard db={db} game={game} onUpdate={setGame} />
      )}
      {game?.kind === "burgers" && (
        <BurgerBoard
          state={game.state}
          busy={busy}
          onMove={(i) => void move(i)}
          onRestart={() => void move(-1)}
        />
      )}
      {game?.kind === "sliding_puzzle" && (
        <SlidingBoard
          state={game.state}
          busy={busy}
          onMove={(i) => void move(i)}
          onRestart={() => void move(-1)}
        />
      )}
      {game?.kind === "memory" && (
        <MemoryBoard
          state={game.state}
          roundKey={`${game.id}:${game.revision}`}
          busy={busy}
          onMove={(i) => void move(i)}
          onRestart={() => void move(-1)}
        />
      )}
      {game?.kind === "tic_tac_toe" && (
        <View style={s.arena}>
          <View style={s.players}>
            <Text style={ui.h3}>{t("Du")} ×</Text>
            <Text style={ui.muted}>{t("mot")}</Text>
            <Text style={ui.h3}>○ Din Venn</Text>
          </View>
          <Text accessibilityLiveRegion="polite" style={ui.h3}>
            {t(
              result === "X"
                ? "Du vant!"
                : result === "O"
                  ? "Din Venn vant denne runden"
                  : result === "draw"
                    ? "Uavgjort – prøv igjen"
                    : busy
                      ? "Din Venn tenker …"
                      : "Din tur – velg en rute",
            )}
          </Text>
          <View style={s.grid}>
            {board.map((mark, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={
                  mark ? t("Rute {0}: {1}", i + 1, mark) : t("Rute {0}", i + 1)
                }
                disabled={busy || ended || !!mark}
                onPress={() => void move(i)}
                style={({ pressed }) => [
                  s.tile,
                  winning.includes(i) && s.winner,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
              >
                <Piece mark={mark} />
              </Pressable>
            ))}
          </View>
          {ended && !game.completed && (
            <>
              <Text style={ui.text}>
                {t("Ingen rabatt brukt. Start en ny runde og prøv igjen.")}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void move(-1)}
                style={ui.button}
              >
                <Text style={ui.buttonText}>{t("Prøv igjen")}</Text>
              </Pressable>
            </>
          )}
          <Text style={ui.muted}>
            {t(
              "Plassen holdes av i opptil én time mens du spiller, så lenge tilbudet fortsatt er aktivt.",
            )}
          </Text>
        </View>
      )}
      {game?.completed && (
        <View style={ui.card}>
          <Text style={s.food}>🎉</Text>
          <Text style={ui.h2}>{t("Venneprisen er låst opp!")}</Text>
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
  arena: {
    gap: 20,
    padding: 20,
    borderRadius: 28,
    backgroundColor: "#eee4f4",
    alignItems: "stretch",
  },
  players: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  winner: {
    backgroundColor: "#deecdf",
    borderColor: "#60755d",
    borderWidth: 3,
  },
  tile: {
    width: "31%",
    aspectRatio: 1,
    minHeight: 64,
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
    fontSize: 48,
    fontWeight: "800",
    color: palette.ink,
    textAlign: "center",
  },
  food: { fontSize: 48, textAlign: "center" },
});

export function Piece({ mark }: { mark: string }) {
  const scale = useRef(new Animated.Value(mark ? 1 : 0)).current;
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    scale.stopAnimation();
    if (reduce) {
      scale.setValue(mark ? 1 : 0);
      return;
    }
    scale.setValue(0);
    const animation = Animated.spring(scale, {
      toValue: mark ? 1 : 0,
      friction: 5,
      tension: 110,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [mark, reduce, scale]);
  return (
    <Animated.Text
      accessibilityElementsHidden
      style={[s.symbol, { opacity: scale, transform: [{ scale }] }]}
    >
      {mark === "X" ? "×" : mark === "O" ? "○" : ""}
    </Animated.Text>
  );
}

export { s as gameStyles };
