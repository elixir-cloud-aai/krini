import { getWesServiceInfo } from "@/lib/service-info";
import { ServiceInfoPage } from "../_components";

interface PageProps {
    searchParams: Promise<{
        id?: string;
    }>;
}

export default async function Page({ searchParams }: PageProps) {
    const { id } = await searchParams;

    if (!id) {
        return <ServiceInfoPage error="No service ID was provided." />;
    }

    const result = await getWesServiceInfo(id);

    if (!result.ok) {
        return <ServiceInfoPage error={result.error} />;
    }

    return (
        <ServiceInfoPage
            serviceInfo={result.serviceInfo}
            sourceUrl={result.serviceInfo.url}
        />
    );
}
