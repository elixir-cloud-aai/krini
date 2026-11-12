/**
 * @description ports and URLs of the end-to-end tests, in one place for the
 * Playwright config, the fixtures and the mock services
 */

/** Port of the app under test */
const appPort = 3210;
/** Port of the mock login provider and registry */
const mockHttpPort = 8291;
/** Port of the mock WES service */
const mockHttpsPort = 8444;

const appURL = `http://localhost:${appPort}`;
const mockURL = `http://127.0.0.1:${mockHttpPort}`;

/** Client of the app at the mock login provider */
const client = { id: "krini-e2e", secret: "e2e-secret" };

/** A request that the mock WES service received */
type WesRequest = {
    method: string;
    path: string;
    authorization: string | null;
};

export {
    appPort,
    appURL,
    client,
    mockHttpPort,
    mockHttpsPort,
    mockURL,
    type WesRequest,
};
