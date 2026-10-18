import Link from "next/link";
import { Suspense } from "react";

interface Props {
    searchParams: Promise<{
        type?: "params" | "state" | "internal" | "logout-err";
    }>;
}

async function ErrorContent({ searchParams }: Props) {
    const { type } = await searchParams;

    let message = "Internal server error occurred.";

    if (type === "params") {
        message = "Invalid request parameters found.";
    } else if (type === "state") {
        message = "Invalid state found. State does not match.";
    } else if (type === "logout-err") {
        message =
            "An internal server error occurred while logging you out. Please try logging out again.";
    }

    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center space-y-2 text-center">
                <p className="text-lg font-medium">{message}</p>
                <p>Please try logging in again.</p>
                <Link
                    href="/auth/login"
                    className="font-bold underline underline-offset-8">
                    Go to Login
                </Link>
            </div>
        </div>
    );
}

export default function Page({ searchParams }: Props) {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center">
                    Loading...
                </div>
            }>
            <ErrorContent searchParams={searchParams} />
        </Suspense>
    );
}
