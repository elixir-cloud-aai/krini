/**
 * Settings of the privacy notice, which differ per deployment: who is
 * responsible for the processing (the controller), how to reach them, and
 * links to the deployment's full notice and to the login provider's notice.
 * Read on the server at request time, so one image serves every deployment.
 */

type PrivacySettings = {
    /** Name and address of the controller */
    controller: string | null;
    /** Contact of the controller: an email address or an `https` page */
    contact: { href: string; label: string } | null;
    /** The deployment's full privacy notice (`https`) */
    noticeUrl: string | null;
    /** The login provider's privacy notice (`https`) */
    loginNoticeUrl: string | null;
};

type Env = Record<string, string | undefined>;

/** An email address whose domain has at least two labels, none empty */
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/**
 * Get a setting, without surrounding white space
 * @param env Environment
 * @param name Name of the variable
 * @returns The value, or null if empty or not set
 */
function textOf(env: Env, name: string) {
    const value = env[name]?.trim();
    return value ? value : null;
}

/**
 * Check a URL for a link of the notice
 * @param value URL
 * @returns Whether it is an `https` URL without user info
 */
function isHttpsUrl(value: string) {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
}

/**
 * Get a setting that must be an `https` URL without user info
 * @param env Environment
 * @param name Name of the variable
 * @returns The URL, or null if not set or invalid (with a warning)
 */
function httpsUrlOf(env: Env, name: string) {
    const value = textOf(env, name);
    if (value === null || isHttpsUrl(value)) return value;
    console.warn(`${name} is not an https URL; it is ignored`);
    return null;
}

/**
 * Get the contact of the controller
 * @param env Environment
 * @returns The link and its text, or null if not set or invalid (with a
 * warning)
 */
function contactOf(env: Env) {
    const value = textOf(env, "PRIVACY_CONTACT");
    if (value === null) return null;
    if (EMAIL.test(value)) return { href: `mailto:${value}`, label: value };
    if (isHttpsUrl(value)) return { href: value, label: value };
    console.warn(
        "PRIVACY_CONTACT is neither an email address nor an https URL; it is ignored",
    );
    return null;
}

/**
 * Read the settings of the privacy notice
 * @param env Environment (default: `process.env`)
 * @returns The settings; invalid values are ignored with a warning
 */
function privacySettings(env: Env = process.env): PrivacySettings {
    return {
        controller: textOf(env, "PRIVACY_CONTROLLER"),
        contact: contactOf(env),
        noticeUrl: httpsUrlOf(env, "PRIVACY_NOTICE_URL"),
        loginNoticeUrl: httpsUrlOf(env, "PRIVACY_LOGIN_NOTICE_URL"),
    };
}

export { type PrivacySettings, privacySettings };
