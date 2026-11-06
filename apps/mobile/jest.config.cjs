const native = require("@react-native/jest-preset");
module.exports = {
  ...native,
  rootDir: __dirname,
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo|@expo)/)",
  ],
  testMatch: ["<rootDir>/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    ...native.moduleNameMapper,
    "^@dinvenn/core$": "<rootDir>/../../packages/core/src/index.ts",
  },
  transform: {
    ...native.transform,
    "^.+\\.(js|ts|tsx)$": ["babel-jest", { presets: ["babel-preset-expo"] }],
  },
};
