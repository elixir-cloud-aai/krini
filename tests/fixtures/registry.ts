/** Registry entries and verifications for tests; no real services. */

const wesType = { group: "org.ga4gh", artifact: "wes", version: "1.1.0" };
const tesType = { group: "org.ga4gh", artifact: "tes", version: "1.1.0" };

function entry(id: string, url: string, type: typeof wesType) {
    return {
        id,
        name: id,
        url,
        type,
        organization: { name: "Example", url: "https://example.org" },
    };
}

export const services = [
    entry("wes-verified", "https://wes.example.org/ga4gh/wes/v1", wesType),
    entry("wes-unverified", "https://other.example.org/ga4gh/wes/v1", wesType),
    entry("wes-moved", "https://moved.example.org/ga4gh/wes/v1", wesType),
    entry("wes-retyped", "https://retyped.example.org/ga4gh/wes/v1", {
        ...wesType,
        version: "1.0.0",
    }),
    entry("wes-http", "http://plain.example.org/ga4gh/wes/v1", wesType),
    entry(
        "wes-userinfo",
        "https://user:secret@userinfo.example.org/ga4gh/wes/v1",
        wesType,
    ),
    entry("tes-verified", "https://tes.example.org/ga4gh/tes/v1", tesType),
    entry("tes-unverified", "https://tes2.example.org/ga4gh/tes/v1", tesType),
];

function verification(serviceId: string, url: string, type: typeof wesType) {
    return { serviceId, url, type, verifiedAt: "2026-11-10T12:00:00.000Z" };
}

export const verifications = [
    verification(
        "wes-verified",
        "https://wes.example.org/ga4gh/wes/v1",
        wesType,
    ),
    // Verified at another URL or type than the entry has now
    verification("wes-moved", "https://old.example.org/ga4gh/wes/v1", wesType),
    verification(
        "wes-retyped",
        "https://retyped.example.org/ga4gh/wes/v1",
        wesType,
    ),
    verification("wes-http", "http://plain.example.org/ga4gh/wes/v1", wesType),
    verification(
        "wes-userinfo",
        "https://user:secret@userinfo.example.org/ga4gh/wes/v1",
        wesType,
    ),
    verification(
        "tes-verified",
        "https://tes.example.org/ga4gh/tes/v1",
        tesType,
    ),
];

export const REGISTRY_URL = "https://registry.example.org/ga4gh/registry/v1";
