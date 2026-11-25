export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { enforceSettings } = await import("@/lib/settings");
        enforceSettings();
    }
}
