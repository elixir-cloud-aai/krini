import type { WESServiceInfo } from "@/types/workflows";
import {
    OrganizationDetails,
    ServiceApiEndpoint,
    ServiceDetails,
    ServiceTags,
    WorkflowCapabilities,
    WorkflowOverview,
    WorkflowStateBreakdown,
} from "./service-info-sections";

interface ServiceInfoPageProps {
    serviceInfo?: WESServiceInfo;
    sourceUrl?: string;
    error?: string;
}

function ServiceInfoPage({
    serviceInfo,
    sourceUrl,
    error,
}: ServiceInfoPageProps) {
    if (error || !serviceInfo) {
        return (
            <div className="rounded-lg border p-6">
                <h2 className="font-semibold">
                    Unable to load service information
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    {error ?? "No service information is available."}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto mt-6">
            <div>
                <h1 className="text-2xl font-semibold">
                    {serviceInfo.name || "WES Service"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Workflow Execution Service information
                </p>
            </div>

            <WorkflowOverview service={serviceInfo} />

            <div className="grid gap-6 lg:grid-cols-2">
                <ServiceDetails service={serviceInfo} />
                <OrganizationDetails service={serviceInfo} />
            </div>

            <WorkflowCapabilities service={serviceInfo} />
            <WorkflowStateBreakdown service={serviceInfo} />
            <ServiceTags service={serviceInfo} />
            <ServiceApiEndpoint url={sourceUrl as string} />
        </div>
    );
}

export { ServiceInfoPage };
