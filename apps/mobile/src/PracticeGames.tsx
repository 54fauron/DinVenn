import { PracticeSideGame, gameNames } from "./SideGames";
import { PracticeMemory } from "./MemoryGame";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { t } from "@dinvenn/core";
import { ui } from "./ui";
import { gameStyles as s, Piece } from "./DealGame";
const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
function winner(board: string[]) {
  return lines.find(
    (line) => board[line[0]] && line.every((i) => board[i] === board[line[0]]),
  );
}
export function practiceResult(board: string[]) {
  const line = winner(board);
  return line ? board[line[0]] : board.includes("") ? "" : "draw";
}
export function practiceBot(board: string[]) {
  const empty = board.map((mark, i) => (mark ? -1 : i)).filter((i) => i >= 0);
  const winning = (mark: string) =>
    empty.find((i) => {
      const next = [...board];
      next[i] = mark;
      return practiceResult(next) === mark;
    });
  return (
    winning("O") ??
    winning("X") ??
    (empty.includes(4) ? 4 : undefined) ??
    empty.find((i) => [0, 2, 6, 8].includes(i)) ??
    empty[0]
  );
}
export function PracticeGames() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] =
    useState<keyof typeof gameNames>("tic_tac_toe");
  const [board, setBoard] = useState<string[]>(Array(9).fill(""));
  const [thinking, setThinking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locked = useRef(false);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function reset() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    locked.current = false;
    setThinking(false);
    setBoard(Array(9).fill(""));
  }
  function move(i: number) {
    if (locked.current || board[i] || practiceResult(board)) return;
    const next = [...board];
    next[i] = "X";
    setBoard(next);
    if (practiceResult(next)) return;
    locked.current = true;
    setThinking(true);
    timer.current = setTimeout(() => {
      const bot = practiceBot(next);
      if (bot !== undefined) next[bot] = "O";
      setBoard([...next]);
      setThinking(false);
      locked.current = false;
      timer.current = null;
    }, 650);
  }
  const result = practiceResult(board),
    line = winner(board) ?? [];
  return (
    <View style={ui.card}>
      <Text style={ui.h2}>{t("Spillhjørnet")}</Text>
      <Text style={ui.muted}>
        {t(
          "Velg et spill og spill så ofte du vil. Ingen tilbud eller rabatt brukes.",
        )}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {(["tic_tac_toe", "memory", "burgers", "sliding_puzzle"] as const).map(
          (kind) => (
            <Pressable
              key={kind}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === kind }}
              style={[
                ui.button,
                { width: "48%", opacity: selected === kind ? 1 : 0.65 },
              ]}
              onPress={() => {
                reset();
                setOpen(false);
                setSelected(kind);
              }}
            >
              <Text style={ui.buttonText}>{t(gameNames[kind])}</Text>
            </Pressable>
          ),
        )}
      </View>
      {!open ? (
        <Pressable
          accessibilityRole="button"
          style={ui.button}
          onPress={() => {
            reset();
            setOpen(true);
          }}
        >
          <Text style={ui.buttonText}>{t("Spill for moro skyld")}</Text>
        </Pressable>
      ) : selected === "burgers" || selected === "sliding_puzzle" ? (
        <>
          <PracticeSideGame key={selected} kind={selected} />
          <Pressable
            accessibilityRole="button"
            style={s.quiet}
            onPress={() => setOpen(false)}
          >
            <Text style={ui.link}>{t("Lukk spillet")}</Text>
          </Pressable>
        </>
      ) : selected === "memory" ? (
        <>
          <PracticeMemory />
          <Pressable
            accessibilityRole="button"
            style={s.quiet}
            onPress={() => setOpen(false)}
          >
            <Text style={ui.link}>{t("Lukk spillet")}</Text>
          </Pressable>
        </>
      ) : (
        <View style={s.arena}>
          <View style={s.players}>
            <Text style={ui.h3}>{t("Du")} ×</Text>
            <Text style={ui.muted}>{t("mot")}</Text>
            <Text style={ui.h3}>○ Din Venn</Text>
          </View>
          <Text style={ui.h2}>{t("Tre på rad")}</Text>
          <Text accessibilityLiveRegion="polite" style={ui.text}>
            {t(
              result === "X"
                ? "Du vant!"
                : result === "O"
                  ? "Din Venn vant denne runden"
                  : result === "draw"
                    ? "Uavgjort – prøv igjen"
                    : thinking
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
                disabled={thinking || !!result || !!mark}
                onPress={() => move(i)}
                style={({ pressed }) => [
                  s.tile,
                  line.includes(i) && s.winner,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
              >
                <Piece mark={mark} />
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            style={ui.button}
            onPress={reset}
          >
            <Text style={ui.buttonText}>{t("Ny runde")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={s.quiet}
            onPress={() => {
              reset();
              setOpen(false);
            }}
          >
            <Text style={ui.link}>{t("Lukk spillet")}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
