import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { privacySettings } from "@/lib/privacy";

export const metadata: Metadata = {
    title: "Privacy notice | Krini",
};

const linkClass = "font-medium underline underline-offset-4";

/** The cookies that Krini sets; `e2e/privacy.spec.ts` checks the list */
const COOKIES = [
    {
        name: "authState-…",
        purpose: "protects a login in progress",
        lifetime: "10 minutes, or until the login ends",
    },
    {
        name: "access_token",
        purpose: "your access token, which Krini passes to the services",
        lifetime: "until the token expires, usually an hour",
    },
    {
        name: "id_token",
        purpose: "the login provider's confirmation of your login",
        lifetime: "an hour",
    },
    {
        name: "refresh_token",
        purpose: "renews your access token while you stay logged in",
        lifetime: "up to 30 days; deleted when you log out",
    },
    {
        name: "token_expires_at",
        purpose: "when your access token needs to be renewed",
        lifetime: "up to 30 days; deleted when you log out",
    },
    {
        name: "logout_marker",
        purpose:
            "keeps you logged out, so that no open page renews the session",
        lifetime: "30 days after you log out, or until you log in again",
    },
    {
        name: "sidebar_state",
        purpose: "whether the sidebar is open, only if you change it",
        lifetime: "7 days",
    },
];

/** Privacy notice, for everyone and before login */
async function PrivacyPage() {
    // the settings are read per request, not at build time
    await connection();
    const { controller, contact, noticeUrl, loginNoticeUrl } =
        privacySettings();

    return (
        <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 text-sm leading-7">
            <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                    Privacy notice
                </h1>
                <p className="text-muted-foreground">
                    What this Krini deployment does with your data, and what
                    happens at the services it connects you to.
                </p>
            </div>

            <section className="space-y-2">
                <h2 className="text-lg font-semibold">Who is responsible</h2>
                {controller ? (
                    <p>
                        This deployment is operated by{" "}
                        <span className="font-medium">{controller}</span>, who
                        is responsible for the processing described here.
                    </p>
                ) : (
                    <p>
                        The operator of this deployment hasn't named who is
                        responsible for the processing.
                    </p>
                )}
                {contact && (
                    <p>
                        Contact:{" "}
                        <a href={contact.href} className={linkClass}>
                            {contact.label}
                        </a>
                    </p>
                )}
                {noticeUrl && (
                    <p>
                        <a href={noticeUrl} className={linkClass}>
                            Full privacy notice of this deployment
                        </a>
                    </p>
                )}
            </section>

            <section className="space-y-2">
                <h2 className="text-lg font-semibold">What Krini processes</h2>
                <ul className="list-disc space-y-1 pl-6">
                    <li>
                        <span className="font-medium">No tracking.</span> Krini
                        has no analytics and no advertising, and it sets no
                        cookies for visitors who don&apos;t log in, apart from
                        the display setting below.
                    </li>
                    <li>
                        <span className="font-medium">Your user info</span> from
                        the login provider: what it releases to Krini, such as
                        your name, email address, identifier and group
                        memberships. Krini shows it while you&apos;re logged in
                        and doesn&apos;t store it on its server.
                    </li>
                    <li>
                        <span className="font-medium">Display settings</span>{" "}
                        that you choose, in your browser only: the color theme
                        (local storage) and whether the sidebar is open (a
                        cookie, see below).
                    </li>
                </ul>
            </section>

            <section className="space-y-2">
                <h2 className="text-lg font-semibold">Cookies</h2>
                <p>
                    All cookies except the sidebar setting are strictly
                    necessary for logging in and staying logged in. Only Krini
                    reads them, and scripts on the page can&apos;t read the
                    tokens.
                </p>
                <ul className="list-disc space-y-1 pl-6">
                    {COOKIES.map(({ name, purpose, lifetime }) => (
                        <li key={name}>
                            <code>{name}</code>: {purpose} ({lifetime})
                        </li>
                    ))}
                </ul>
            </section>

            <section className="space-y-2">
                <h2 className="text-lg font-semibold">
                    What happens elsewhere
                </h2>
                <ul className="list-disc space-y-1 pl-6">
                    <li>
                        <span className="font-medium">The login provider</span>{" "}
                        processes your login and your account, including
                        requests for access.{" "}
                        {loginNoticeUrl ? (
                            <a href={loginNoticeUrl} className={linkClass}>
                                Privacy notice of the login provider
                            </a>
                        ) : (
                            "Its own privacy notice applies."
                        )}
                    </li>
                    <li>
                        <span className="font-medium">
                            The services that run your tasks and workflows
                        </span>{" "}
                        get your access token from your browser, and record your
                        user identifier with each task or workflow, for
                        ownership, accounting and audit. Each service is listed
                        with its organization, whose terms apply.
                    </li>
                    <li>
                        <span className="font-medium">
                            The service registry
                        </span>{" "}
                        tells Krini which services exist. Krini reads it without
                        any data about you.
                    </li>
                </ul>
            </section>

            <p>
                <Link href="/dashboard" className={linkClass}>
                    Back to Krini
                </Link>
            </p>
        </main>
    );
}

export default PrivacyPage;
