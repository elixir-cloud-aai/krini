import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// unit and route handler tests (`src/**/*.test.ts`); the end-to-end tests
// in `e2e/` run with Playwright (`playwright.config.ts`)
export default defineConfig({
    resolve: {
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
        // settings come from `vi.stubEnv()` in each test, not from `.env`
        unstubEnvs: true,
        restoreMocks: true,
        coverage: {
            provider: "v8",
            include: [
                "src/lib/**/*.ts",
                "src/app/api/**/*.ts",
                "src/app/auth/api/**/*.ts",
            ],
            exclude: ["**/*.test.ts", "**/*.d.ts"],
            reporter: ["text", "lcov"],
            // the covered code is fully tested: keep it so
            thresholds: { 100: true },
        },
    },
});
