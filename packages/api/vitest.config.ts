import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run test files that end in .test.ts
    include: ["src/**/*.test.ts"],

    // Increase timeout because tests talk to a real database
    // (default is 5 seconds, which is sometimes too tight)
    testTimeout: 10000,
  },
});
