import axios from "axios";
import { axiosBase } from "@/lib/axios";
import type { WESServiceInfo } from "@/types/workflows";
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

    try {
        const { data: serviceInfo } = await axiosBase.get<WESServiceInfo>(
            `${process.env.APP_ORIGIN}/api/workflows/get-service-info`,
            {
                params: { id },
                headers: {
                    Accept: "application/json",
                },
            },
        );

        return (
            <ServiceInfoPage
                serviceInfo={serviceInfo}
                sourceUrl={serviceInfo.url}
            />
        );
    } catch (error) {
        console.log(error);
        const message = axios.isAxiosError(error)
            ? (error.response?.data?.error ??
              "Unable to fetch service information.")
            : "Unable to fetch service information.";

        return <ServiceInfoPage error={message} />;
    }
}
