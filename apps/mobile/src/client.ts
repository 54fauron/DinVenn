import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { makeClient, processLock } from "@dinvenn/core";
// Supabase sessions can exceed iOS' historical per-value limit. Keep small chunks
// in the keychain and swap the manifest only after every new chunk is stored.
const size = 450;
async function manifest(
  key: string,
): Promise<{ version: string; count: number } | null> {
  const raw = await SecureStore.getItemAsync(key);
  return raw ? JSON.parse(raw) : null;
}
const storage = {
  async getItem(key: string) {
    const m = await manifest(key);
    if (!m) return null;
    const chunks = await Promise.all(
      Array.from({ length: m.count }, (_, i) =>
        SecureStore.getItemAsync(`${key}.${m.version}.${i}`),
      ),
    );
    return chunks.some((c) => c === null) ? null : chunks.join("");
  },
  async setItem(key: string, value: string) {
    const old = await manifest(key);
    const m = {
      version: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      count: Math.ceil(value.length / size),
    };
    await Promise.all(
      Array.from({ length: m.count }, (_, i) =>
        SecureStore.setItemAsync(
          `${key}.${m.version}.${i}`,
          value.slice(i * size, (i + 1) * size),
        ),
      ),
    );
    await SecureStore.setItemAsync(key, JSON.stringify(m));
    if (old)
      await Promise.all(
        Array.from({ length: old.count }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}.${old.version}.${i}`),
        ),
      );
  },
  async removeItem(key: string) {
    const m = await manifest(key);
    await SecureStore.deleteItemAsync(key);
    if (m)
      await Promise.all(
        Array.from({ length: m.count }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}.${m.version}.${i}`),
        ),
      );
  },
};
export const configured =
  !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
  !!process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const client = configured
  ? makeClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          storage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          lock: processLock,
        },
      },
    )
  : null;
