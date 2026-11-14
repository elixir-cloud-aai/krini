import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getPublicProviders } from "@/lib/oidc";

function Page() {
    const providers = getPublicProviders();

    return (
        <div className="flex flex-col gap-4 justify-center items-center h-screen">
            {providers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    No login providers are configured.
                </p>
            )}
            {providers.map((provider) => (
                <a
                    key={provider.id}
                    href={`/auth/api/login-redirect?provider=${encodeURIComponent(provider.id)}`}
                    className={buttonVariants({ size: "lg", variant: provider.logo ? "link" : "default" })}
                >
                    {provider.logo ? (
                        <Image
                            src={provider.logo}
                            alt={provider.name}
                            width={160}
                            height={40}
                            className="h-8 w-auto"
                            unoptimized
                        />
                    ) : (
                        provider.name
                    )}
                </a>
            ))}
            <p className="text-sm text-muted-foreground">
                Before you log in, read what happens with your data:{" "}
                <Link
                    href="/privacy"
                    className="font-medium underline underline-offset-4"
                >
                    Privacy notice
                </Link>
            </p>
        </div>
    );
}

export default Page;
