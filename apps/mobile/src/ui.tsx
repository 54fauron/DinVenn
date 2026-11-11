import { themeStyles, themeColor } from "./theme";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
const lightPalette = {
  cream: "#fff7f0",
  ink: "#3b2a3a",
  muted: "#81717a",
  peach: "#ffc9a8",
  coral: "#ed8e7b",
  purple: "#eee4f4",
  yellow: "#fff0c5",
  green: "#e5f0e6",
  border: "#eadfd6",
  white: "#fffdfb",
};
export const palette = new Proxy(lightPalette, {
  get(target, name: keyof typeof lightPalette) {
    return themeColor(target[name]);
  },
});
export function Icon({
  name,
  size = 22,
  color = palette.ink,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const paths: Record<string, string> = {
    home: "M3 10l9-7 9 7v11h-6v-7H9v7H3z",
    map: "M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16",
    heart:
      "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z",
    user: "M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    qr: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M20 14v7h-6 M6 6h1 M17 6h1 M6 17h1",
    search: "M21 21l-6-6 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    calendar: "M4 5h16v16H4z M8 2v6 M16 2v6 M4 10h16 M8 14h2 M14 14h2",
    news: "M4 3h13v18H4z M17 7h4v12a2 2 0 0 1-2 2 M8 7h5 M8 11h5 M8 15h5",
    coffee: "M4 5h12v9a5 5 0 0 1-10 0V5 M16 5h2a3 3 0 1 1 0 6h-2 M3 21h18",
    shop: "M4 7h16l1 14H3z M8 7V5a4 4 0 0 1 8 0v2",
    spark: "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
    clock: "M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    arrow: "M5 12h14 M13 6l6 6-6 6",
    chevron: "M9 5l7 7-7 7",
    check: "M5 12l4 4L19 6",
    tag: "M3 3h8l10 10-8 8L3 11z M7 7h.01",
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      <Path d={paths[name] ?? paths.spark} />
    </Svg>
  );
}
export function SectionHeading({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={ui.sectionHeading}>
      <Text style={ui.h2}>{title}</Text>
      {action && onPress && (
        <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
          <Text style={ui.link}>{action} →</Text>
        </Pressable>
      )}
    </View>
  );
}
export const ui = themeStyles({
  h1: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: palette.ink,
    letterSpacing: -1,
  },
  h2: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.ink,
    letterSpacing: -0.5,
  },
  h3: { fontSize: 16, fontWeight: "700", color: palette.ink, lineHeight: 23 },
  text: { fontSize: 14, lineHeight: 22, color: palette.ink },
  muted: { fontSize: 12, lineHeight: 19, color: palette.muted },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: palette.muted,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    marginBottom: 2,
  },
  link: { fontSize: 12, fontWeight: "700", color: "#92573f" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: {
    backgroundColor: palette.white,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 19,
    padding: 18,
    gap: 9,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: palette.ink,
    alignItems: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "700", color: palette.cream },
  empty: {
    padding: 22,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  chipActive: { backgroundColor: palette.peach, borderColor: palette.peach },
  chipText: { fontSize: 12, color: palette.ink, fontWeight: "600" },
  tag: {
    fontSize: 11,
    fontWeight: "600",
    color: "#705333",
    backgroundColor: palette.yellow,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
});
