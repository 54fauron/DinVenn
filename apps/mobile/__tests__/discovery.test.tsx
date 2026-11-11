import { setLanguage } from "@dinvenn/core";
import * as SecureStore from "expo-secure-store";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import App from "../src/App";
import MapScreen from "../src/MapScreen";
import type { Business, BusinessEvent, Deal, NewsPost } from "@dinvenn/core";
jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: View, Path: View };
});
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("react-native-qrcode-svg", () => () => null);
jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { SafeAreaProvider: View, SafeAreaView: View };
});
jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View, Pressable, Text } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        fitToCoordinates: jest.fn(),
        animateToRegion: jest.fn(),
      }));
      React.useEffect(() => {
        props.onMapReady?.();
      }, []);
      return React.createElement(
        View,
        {
          accessibilityLabel: props.accessibilityLabel,
          onPress: props.onPress,
        },
        props.children,
      );
    }),
    Marker: ({ title, onPress }: any) =>
      React.createElement(
        Pressable,
        {
          onPress,
          accessibilityRole: "button",
          accessibilityLabel: `Markør: ${title}`,
        },
        React.createElement(Text, null, title),
      ),
  };
});
jest.mock("../src/client", () => ({
  configured: true,
  client: {
    auth: {
      onAuthStateChange: (cb: Function) => {
        cb("INITIAL_SESSION", null);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  },
}));
jest.mock("@dinvenn/core", () => ({
  ...jest.requireActual("@dinvenn/core"),
  api: () => mockApi,
}));
const business = {
  id: "b1",
  name: "Hjørnekafeen",
  city: "Kristiansand",
  address: "Markens gate 12A",
  postal_code: "4611",
  category_id: 1,
  lat: 58.145,
  lng: 7.995,
  status: "approved",
  description: "En lokal kafé.",
} as Business;
const deal = {
  id: "d1",
  business_id: "b1",
  title: "20 % på kaffe",
  discount_type: "percent",
  discount_value: 20,
  ends_at: "2099-11-12T18:00:00Z",
  status: "active",
  starts_at: "2026-01-01T00:00:00Z",
  max_per_user: 1,
} as Deal;
const event = {
  id: "e1",
  business_id: "b1",
  title: "Latte art-workshop",
  description: "Lær latte art sammen med oss.",
  starts_at: "2099-11-12T17:00:00Z",
  price_text: "Gratis",
  status: "active",
} as BusinessEvent;
const news = {
  id: "n1",
  business_id: "b1",
  title: "Ny lunsjmeny",
  body: "Nybakt brød og varm suppe.",
  published_at: "2026-11-06T10:00:00Z",
  status: "active",
} as NewsPost;
const mockApi = {
  catalog: jest.fn(),
  favorites: jest.fn(),
  redemptions: jest.fn(),
};
beforeEach(() => {
  setLanguage("nb");
  jest.clearAllMocks();
  mockApi.catalog.mockResolvedValue({
    businesses: [business],
    deals: [deal],
    categories: [
      { id: 1, name: "Mat & Drikke", slug: "mat-drikke", color: "#ffc9a8" },
    ],
    events: [event],
    news: [news],
  });
  mockApi.favorites.mockResolvedValue([]);
  mockApi.redemptions.mockResolvedValue([]);
});
test("forsiden viser tilbud, arrangementer og nyheter med fem bunnfaner", async () => {
  render(<App />);
  await screen.findByText("20 % på kaffe");
  expect(screen.getByText("Latte art-workshop")).toBeTruthy();
  expect(screen.getByText("Ny lunsjmeny")).toBeTruthy();
  expect(screen.getByText("Godt for deg.\nFint for byen.")).toBeTruthy();
  expect(screen.queryByText(/\\n/)).toBeNull();
  expect(screen.getAllByRole("tab")).toHaveLength(5);
  fireEvent.press(screen.getByRole("tab", { name: "Kart" }));
  await screen.findByRole("button", { name: "Markør: Hjørnekafeen" });
  fireEvent.press(screen.getByRole("tab", { name: "Mine koder" }));
  expect(screen.getByText("Logg inn for å se kodene dine")).toBeTruthy();
});
test("arrangement kan åpnes, og lagring uten innlogging åpner kontosiden", async () => {
  render(<App />);
  await screen.findByText("Latte art-workshop");
  fireEvent.press(screen.getByText("Latte art-workshop"));
  await screen.findByText("Lær latte art sammen med oss.");
  fireEvent.press(screen.getByText("♡ Lagre arrangement"));
  await screen.findByLabelText("E-post");
  expect(screen.getByText("Bli en lokal venn")).toBeTruthy();
});
test("kartmarkør åpner riktig bedriftsprofil", async () => {
  const open = jest.fn();
  render(
    <MapScreen
      businesses={[business]}
      categories={[]}
      deals={[deal]}
      targetId={null}
      onBusiness={open}
      onError={jest.fn()}
    />,
  );
  await screen.findByRole("button", { name: "Markør: Hjørnekafeen" });
  expect(screen.queryByText("Se bedrift")).toBeNull();
  fireEvent.press(
    screen.getByRole("button", { name: "Markør: Hjørnekafeen" }),
    { stopPropagation: jest.fn() },
  );
  fireEvent.press(screen.getByText("Se bedrift"));
  expect(open).toHaveBeenCalledWith(business);
});
test("ukjent adresse blir i listen og får ingen oppdiktet markør", async () => {
  const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ adresser: [] }),
  } as Response);
  try {
    render(
      <MapScreen
        businesses={[
          { ...business, lat: null, lng: null, address: "Ukjent vei 1" },
        ]}
        categories={[]}
        deals={[]}
        targetId={null}
        onBusiness={jest.fn()}
        onError={jest.fn()}
      />,
    );
    await screen.findByText("Ingen sikre kartplasseringer ennå");
    expect(
      screen.queryByRole("button", { name: "Markør: Hjørnekafeen" }),
    ).toBeNull();
    fireEvent.press(screen.getByText("Se bedriftene som liste →"));
    expect(screen.getByText("Hjørnekafeen")).toBeTruthy();
  } finally {
    fetchMock.mockRestore();
  }
});
test("kartets søk filtrerer både markører og listen", async () => {
  render(
    <MapScreen
      businesses={[business]}
      categories={[]}
      deals={[]}
      targetId={null}
      onBusiness={jest.fn()}
      onError={jest.fn()}
    />,
  );
  await screen.findByRole("button", { name: "Markør: Hjørnekafeen" });
  fireEvent.changeText(screen.getByLabelText("Søk på kartet"), "finnes ikke");
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Markør: Hjørnekafeen" }),
    ).toBeNull(),
  );
  expect(screen.getByText("Ingen treff")).toBeTruthy();
});

test("kartet starter i valgt by og kan bytte til en annen", async () => {
  const oslo = {
    ...business,
    id: "b2",
    name: "Oslo-kafeen",
    city: "Oslo",
    lat: 59.91,
    lng: 10.75,
  };
  render(
    <MapScreen
      businesses={[business, oslo]}
      categories={[]}
      deals={[]}
      targetId={null}
      initialCity="Kristiansand"
      onBusiness={jest.fn()}
      onError={jest.fn()}
    />,
  );
  await screen.findByRole("button", { name: "Markør: Hjørnekafeen" });
  expect(
    screen.queryByRole("button", { name: "Markør: Oslo-kafeen" }),
  ).toBeNull();
  fireEvent.press(screen.getByText("Oslo"));
  await screen.findByRole("button", { name: "Markør: Oslo-kafeen" });
  expect(
    screen.queryByRole("button", { name: "Markør: Hjørnekafeen" }),
  ).toBeNull();
});

test("kartkortet lukkes ved karttrykk, men ikke ved markørtrykk", async () => {
  render(
    <MapScreen
      businesses={[business]}
      categories={[]}
      deals={[]}
      targetId={null}
      onBusiness={jest.fn()}
      onError={jest.fn()}
    />,
  );
  const marker = await screen.findByRole("button", {
    name: "Markør: Hjørnekafeen",
  });
  expect(screen.queryByText("Se bedrift")).toBeNull();
  const stopPropagation = jest.fn();
  fireEvent.press(marker, { stopPropagation });
  expect(stopPropagation).toHaveBeenCalled();
  expect(screen.getByText("Se bedrift")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Kart over lokale bedrifter"), {
    nativeEvent: { action: "marker-press" },
  });
  expect(screen.getByText("Se bedrift")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Kart over lokale bedrifter"), {
    nativeEvent: { action: "press" },
  });
  expect(screen.queryByText("Se bedrift")).toBeNull();
});
test("kart fra bedriftsinfo åpner kortet og kan åpne samme bedrift igjen", async () => {
  const props = {
    businesses: [business],
    categories: [],
    deals: [],
    targetId: business.id,
    onBusiness: jest.fn(),
    onError: jest.fn(),
  };
  const { rerender } = render(<MapScreen {...props} targetRequest={1} />);
  await screen.findByText("Se bedrift");
  fireEvent.press(screen.getByLabelText("Kart over lokale bedrifter"), {
    nativeEvent: { action: "press" },
  });
  expect(screen.queryByText("Se bedrift")).toBeNull();
  rerender(<MapScreen {...props} targetRequest={2} />);
  await screen.findByText("Se bedrift");
});

test("språk byttes fra Meg uten å oversette bedriftsinnhold eller miste navigasjon", async () => {
  render(<App />);
  await screen.findByText("Vennepriser nå");
  fireEvent.press(screen.getByText("Meg"));
  fireEvent.press(screen.getByLabelText("Bytt til engelsk"));
  expect(screen.getByText("⚙ Settings")).toBeTruthy();
  expect(screen.getByText("Explore")).toBeTruthy();
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    "dinvenn-language",
    "en",
  );
  fireEvent.press(screen.getByText("Explore"));
  await screen.findByText("Offers right now");
  expect(screen.getAllByText(business.name).length).toBeGreaterThan(0);
  fireEvent.press(screen.getByText("Me"));
  fireEvent.press(screen.getByLabelText("Switch to Norwegian"));
  expect(screen.getByText("Utforsk")).toBeTruthy();
});

test("mobilappen leser lagret språk ved oppstart", async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce("en");
  render(<App />);
  await screen.findByText("Offers right now");
  expect(screen.getByText("Explore")).toBeTruthy();
  expect(screen.getByText("Me")).toBeTruthy();
});
