import { test } from "node:test";
import assert from "node:assert/strict";
import {
  t,
  setLanguage,
  locale,
  subscribeLanguage,
} from "../packages/core/src/i18n.ts";
test("language changes translate interface text, placeholders and locale while preserving content and brand", () => {
  let changes = 0;
  const unsubscribe = subscribeLanguage(() => changes++);
  setLanguage("en");
  assert.equal(t("Lagre profil"), "Save profile");
  assert.equal(t("Hei, {0}!", "Ronny"), "Hi, Ronny!");
  assert.equal(t("DinVenn"), "DinVenn");
  assert.equal(t("Shogun Sushi"), "Shogun Sushi");
  assert.equal(locale(), "en-GB");
  setLanguage("en");
  assert.equal(changes, 1);
  setLanguage("nb");
  assert.equal(t("Lagre profil"), "Lagre profil");
  assert.equal(t("Hei, {0}!", "Ronny"), "Hei, Ronny!");
  assert.equal(locale(), "nb-NO");
  unsubscribe();
});
