/**
 * @description builds the app for the end-to-end tests without the privacy
 * settings, so that a privacy notice rendered at build time would fail the
 * tests; `env -u` is Unix-only, hence this wrapper
 */
import { spawnSync } from "node:child_process";

for (const name of [
    "PRIVACY_CONTROLLER",
    "PRIVACY_CONTACT",
    "PRIVACY_NOTICE_URL",
    "PRIVACY_LOGIN_NOTICE_URL",
]) {
    delete process.env[name];
}

const result = spawnSync(process.execPath, ["run", "build"], {
    stdio: "inherit",
});
process.exit(result.status ?? 1);
