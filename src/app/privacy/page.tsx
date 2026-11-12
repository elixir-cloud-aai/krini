import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { privacySettings } from "@/lib/privacy";

export const metadata: Metadata = {
    title: "Privacy notice | Krini",
};

const linkClass = "font-medium underline underline-offset-4";

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
                        <span className="font-medium">
                            Without login, nothing about you.
                        </span>{" "}
                        Until you log in, Krini keeps only the display settings
                        below, and it has no tracking or analytics.
                    </li>
                    <li>
                        <span className="font-medium">Session cookies</span>{" "}
                        when you log in: the tokens of your login and their
                        expiry, and short-lived values that protect the login
                        itself. They are strictly necessary for the session and
                        end with it, at the latest when you log out.
                    </li>
                    <li>
                        <span className="font-medium">Your user info</span> from
                        the login provider, such as your name, email address and
                        identifier, to show who is logged in. Krini doesn't
                        store it.
                    </li>
                    <li>
                        <span className="font-medium">Display settings</span>{" "}
                        that you choose, in your browser only: the color theme
                        (local storage) and whether the sidebar is open (a
                        cookie).
                    </li>
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
