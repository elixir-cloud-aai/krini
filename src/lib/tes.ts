const TES_PATH = "/ga4gh/tes/v1";

/**
 * Base URL of the TES API for a registry entry's URL. Registry entries
 * usually include the API path already (e.g.
 * `https://tes.example.org/ga4gh/tes/v1`); it's added only if missing.
 */
export function tesBaseUrl(url: string): string {
    const trimmed = url.replace(/\/+$/, "");
    return trimmed.endsWith(TES_PATH) ? trimmed : `${trimmed}${TES_PATH}`;
}
