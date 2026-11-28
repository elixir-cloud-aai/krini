/**
 * @description ports and URLs of the end-to-end tests, in one place for the
 * Playwright config, the fixtures and the mock services
 */

/** Port of the app under test */
const appPort = 3210;
/** Port of the mock login provider and registry */
const mockHttpPort = 8291;
/** Port of the mock WES and TES services */
const mockHttpsPort = 8444;

const appURL = `http://localhost:${appPort}`;
const mockURL = `http://127.0.0.1:${mockHttpPort}`;

/** Client of the app at the mock login provider */
const client = { id: "krini-e2e", secret: "e2e-secret" };

/** Settings of the privacy notice */
const privacy = {
    controller: "Example Institute, Example Street 1, Example City",
    contact: "privacy@example.org",
    noticeUrl: "https://example.org/privacy",
    loginNoticeUrl: "https://login.example.org/privacy",
};

/** A request that the mock WES service received */
type WesRequest = {
    method: string;
    path: string;
    authorization: string | null;
    /** Fields of a run request */
    fields?: Record<string, string>;
};

/** How the mock provider answers refresh token grants; empty: normally */
type RefreshMode = {
    /** Error status to answer with, e.g. 400 */
    status?: number;
    /** `error` of the error answer, e.g. `invalid_grant` */
    error?: string;
    /** Wait before answering, in ms */
    delayMs?: number;
    /** Revoke each refresh token once a refresh used it, as providers
     * that rotate refresh tokens do */
    rotate?: boolean;
};

/** A request that the mock TES service received */
type TesRequest = {
    method: string;
    path: string;
    authorization: string | null;
    /** Body of a task request */
    body?: unknown;
};

export {
    appPort,
    appURL,
    client,
    mockHttpPort,
    mockHttpsPort,
    mockURL,
    privacy,
    type RefreshMode,
    type TesRequest,
    type WesRequest,
};
