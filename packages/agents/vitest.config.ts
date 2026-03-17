import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run test files one at a time — the local LLM can only
    // handle one request at a time, so parallel tests would
    // queue up and cause timeouts
    fileParallelism: false,
    // 10-minute global timeout — the agent does 5-7 LLM rounds
    // at 30-60s each on CPU, so it can take up to ~7 minutes
    testTimeout: 600_000,
  },
});
