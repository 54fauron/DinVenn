// app.json holds the stable identity; build-specific native settings live here.
module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  if (process.env.EAS_BUILD_PLATFORM === "android" && !mapsKey) {
    throw new Error(
      "Android-bygget trenger GOOGLE_MAPS_ANDROID_API_KEY i Expo-miljøet preview. Aktiver Maps SDK for Android før du bygger.",
    );
  }
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        "react-native-maps",
        mapsKey ? { androidGoogleMapsApiKey: mapsKey } : {},
      ],
    ],
  };
};
