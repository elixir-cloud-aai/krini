import {
    Activity,
    BookOpen,
    Code2,
    ExternalLink,
    Globe,
    Server,
} from "lucide-react";
import type { ReactNode } from "react";
import { formatDate, STATE_LABELS } from "@/lib/utils";
import type { WESServiceInfo } from "@/types/workflows";

function Section({
    title,
    icon,
    children,
}: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
                {icon}
                <h2 className="font-semibold">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex flex-col gap-1 border-b py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
            <span className="text-sm text-muted-foreground">{label}</span>
            <div className="text-sm font-medium sm:max-w-[65%] sm:text-right">
                {value}
            </div>
        </div>
    );
}

function ExternalLinkRow({ label, href }: { label: string; href?: string }) {
    let validUrl = false;

    try {
        const parsed = new URL(href ?? "");
        validUrl = ["https:", "http:"].includes(parsed.protocol);
    } catch {
        // Display invalid or missing values as plain text.
    }

    return (
        <DetailRow
            label={label}
            value={
                validUrl ? (
                    <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 underline underline-offset-4"
                    >
                        Open link <ExternalLink className="size-3.5" />
                    </a>
                ) : (
                    href || "Not provided"
                )
            }
        />
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
    );
}

function TagValue({ value }: { value: string }) {
    const values = value
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);

    if (values.length > 1) {
        return (
            <div className="flex flex-wrap justify-end gap-2">
                {values.map((item) => {
                    let isUrl = false;

                    try {
                        isUrl = ["https:", "http:"].includes(
                            new URL(item).protocol,
                        );
                    } catch {
                        // Keep non-URL tag values as text.
                    }

                    return isUrl ? (
                        <a
                            key={item}
                            href={item}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 underline underline-offset-4"
                        >
                            {new URL(item).hostname}
                            <ExternalLink className="size-3" />
                        </a>
                    ) : (
                        <span key={item}>{item}</span>
                    );
                })}
            </div>
        );
    }

    return <span>{value}</span>;
}

export function WorkflowOverview({ service }: { service: WESServiceInfo }) {
    const counts = service.system_state_counts ?? {};
    const errors = (counts.EXECUTOR_ERROR ?? 0) + (counts.SYSTEM_ERROR ?? 0);

    return (
        <section className="space-y-3">
            <div>
                <h2 className="text-lg font-semibold">Workflow overview</h2>
                <p className="text-sm text-muted-foreground">
                    Workflow counts reported by the service
                </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Running" value={counts.RUNNING ?? 0} />
                <StatCard label="Completed" value={counts.COMPLETE ?? 0} />
                <StatCard label="Queued" value={counts.QUEUED ?? 0} />
                <StatCard label="Errors" value={errors} />
            </div>
        </section>
    );
}

export function ServiceDetails({ service }: { service: WESServiceInfo }) {
    return (
        <Section title="Service details" icon={<Server className="size-4" />}>
            <DetailRow label="Service ID" value={service.id || "—"} />
            <DetailRow label="Version" value={service.version || "—"} />
            <DetailRow label="Environment" value={service.environment || "—"} />
            <DetailRow
                label="Specification"
                value={
                    service.type
                        ? `${service.type.group} / ${service.type.artifact} / ${service.type.version}`
                        : "—"
                }
            />
            <DetailRow label="Created" value={formatDate(service.createdAt)} />
            <DetailRow
                label="Last updated"
                value={formatDate(service.updatedAt)}
            />
        </Section>
    );
}

export function OrganizationDetails({ service }: { service: WESServiceInfo }) {
    return (
        <Section title="Organization" icon={<Globe className="size-4" />}>
            <DetailRow
                label="Organization"
                value={service.organization?.name || "—"}
            />
            <ExternalLinkRow
                label="Organization website"
                href={service.organization?.url}
            />
            <ExternalLinkRow
                label="Documentation"
                href={service.documentationUrl}
            />
            <ExternalLinkRow
                label="Authentication instructions"
                href={service.auth_instructions_url}
            />
            <ExternalLinkRow
                label="Contact information"
                href={service.contact_info}
            />
        </Section>
    );
}

export function WorkflowCapabilities({ service }: { service: WESServiceInfo }) {
    const workflowTypes = service.workflow_type_versions ?? {};
    const engines = service.workflow_engine_versions ?? {};
    const filesystemProtocols = service.supported_filesystem_protocols ?? [];
    const wesVersions = service.supported_wes_versions ?? [];
    const defaultParameters = service.default_workflow_engine_parameters ?? [];

    return (
        <Section
            title="Workflow capabilities"
            icon={<Code2 className="size-4" />}
        >
            <div className="space-y-4">
                <div>
                    <p className="mb-2 text-sm text-muted-foreground">
                        Workflow types
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(workflowTypes).map(
                            ([type, details]) => (
                                <div
                                    key={type}
                                    className="rounded-lg border px-3 py-2 text-sm"
                                >
                                    <p className="font-medium">{type}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {details.workflow_type_version?.join(
                                            ", ",
                                        ) || "No versions reported"}
                                    </p>
                                </div>
                            ),
                        )}
                        {!Object.keys(workflowTypes).length && (
                            <p className="text-sm text-muted-foreground">
                                Not reported
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-sm text-muted-foreground">
                        Workflow engines
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(engines).map(([engine, version]) => (
                            <div
                                key={engine}
                                className="rounded-lg border px-3 py-2 text-sm"
                            >
                                <p className="font-medium">{engine}</p>
                                <p className="text-xs text-muted-foreground">
                                    {version}
                                </p>
                            </div>
                        ))}
                        {!Object.keys(engines).length && (
                            <p className="text-sm text-muted-foreground">
                                Not reported
                            </p>
                        )}
                    </div>
                </div>

                <DetailRow
                    label="Supported WES versions"
                    value={
                        wesVersions.length
                            ? wesVersions.join(", ")
                            : "Not reported"
                    }
                />
                <DetailRow
                    label="Filesystem protocols"
                    value={
                        filesystemProtocols.length
                            ? filesystemProtocols.join(", ")
                            : "Not reported"
                    }
                />
                <DetailRow
                    label="Default engine parameters"
                    value={
                        defaultParameters.length
                            ? JSON.stringify(defaultParameters, null, 2)
                            : "None"
                    }
                />
            </div>
        </Section>
    );
}

export function WorkflowStateBreakdown({
    service,
}: {
    service: WESServiceInfo;
}) {
    const counts = service.system_state_counts ?? {};

    return (
        <Section
            title="Workflow state breakdown"
            icon={<Activity className="size-4" />}
        >
            <div className="divide-y">
                {Object.entries(STATE_LABELS).map(([state, label]) => (
                    <div
                        key={state}
                        className="flex items-center justify-between py-3"
                    >
                        <span className="text-sm">{label}</span>
                        <span className="text-sm font-medium tabular-nums">
                            {counts[state] ?? 0}
                        </span>
                    </div>
                ))}
            </div>
        </Section>
    );
}

export function ServiceTags({ service }: { service: WESServiceInfo }) {
    const tags = service.tags ?? {};
    const entries = Object.entries(tags);

    return (
        <Section title="Service tags" icon={<Globe className="size-4" />}>
            {entries.filter(([key]) => !["key", "value"].includes(key)).length >
            0 ? (
                <div className="divide-y">
                    {entries
                        .filter(([key]) => !["key", "value"].includes(key))
                        .map(([key, value]) => (
                            <DetailRow
                                key={key}
                                label={key.replaceAll("_", " ")}
                                value={<TagValue value={value} />}
                            />
                        ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">
                    No tags reported.
                </p>
            )}
        </Section>
    );
}

export function ServiceApiEndpoint({ url }: { url: string }) {
    return (
        <Section title="API endpoint" icon={<BookOpen className="size-4" />}>
            <p className="break-all font-mono text-xs text-muted-foreground">
                {url}
            </p>
            <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm underline underline-offset-4"
            >
                View raw service info <ExternalLink className="size-4" />
            </a>
        </Section>
    );
}
