import { WESServiceInfo } from "@/types/workflows";
import { ServiceInfoPage } from "../_components";

interface PageProps {
    searchParams: Promise<{
        url?: string;
    }>;
}

async function fetchServiceInfo(url: string): Promise<WESServiceInfo> {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "https:") {
        throw new Error("Only HTTPS endpoints are supported.");
    }

    if(!parsedUrl.pathname.includes('/ga4gh/wes/v1'))
        throw new Error("Not a GA4GH complaint WES service.")

    const response = await fetch(parsedUrl.toString(), {
        cache: "no-store",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(
            `Failed to fetch service information (${response.status}).`,
        );
    }

    return response.json();
}

export default async function Page({ searchParams }: PageProps) {
    const { url } = await searchParams;

    if (!url)
        return <ServiceInfoPage error="No service URL was provided." />;

    try {
        const serviceInfo = await fetchServiceInfo(url);

        return (
            <ServiceInfoPage
                serviceInfo={serviceInfo}
                sourceUrl={url}
            />
        );
    } catch (error) {
        return (
            <ServiceInfoPage
                error={
                    error instanceof Error
                        ? error.message
                        : "Unable to fetch service information."
                }
            />
        );
    }
}
