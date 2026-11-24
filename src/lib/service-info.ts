/**
 * Service info of a WES service of the registry
 *
 * Called by the page `/dashboard/workflows/service-info`, so that Krini's
 * server doesn't have to reach its own public origin. The registry list
 * comes from `fetchRegistryServices`, and the service URL must pass
 * `allowedServiceUrl`, the same check as the lists and the token-bearing
 * requests.
 */
import axios from "axios";
import { axiosBase, deadline } from "@/lib/axios";
import {
    allowedServiceUrl,
    fetchRegistryServices,
    RegistryError,
} from "@/lib/registry";
import type { WESServiceInfo } from "@/types/workflows";

export type WesServiceInfoResult =
    | { ok: true; serviceInfo: WESServiceInfo }
    | { ok: false; status: number; error: string };

const failure = (status: number, error: string): WesServiceInfoResult => ({
    ok: false,
    status,
    error,
});

const text = (value: unknown) => (typeof value === "string" ? value : "");
const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
const strings = (value: unknown) =>
    Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
const entriesOf = <T>(value: unknown, keep: (v: unknown) => v is T) =>
    Object.fromEntries(
        Object.entries(record(value)).filter((entry) => keep(entry[1])),
    ) as Record<string, T>;
const stringRecord = (value: unknown) =>
    entriesOf(value, (v): v is string => typeof v === "string");
const numberRecord = (value: unknown) =>
    entriesOf(value, (v): v is number => typeof v === "number");

function sanitizeServiceInfo(data: unknown): WESServiceInfo {
    const info = record(data);
    const type = record(info.type);
    const organization = record(info.organization);
    const workflowTypes = record(info.workflow_type_versions);

    return {
        id: text(info.id),
        name: text(info.name),
        description: text(info.description),
        environment: text(info.environment),
        version: text(info.version),
        createdAt: text(info.createdAt),
        updatedAt: text(info.updatedAt),
        contactUrl: text(info.contactUrl) || undefined,
        contact_info_url: text(info.contact_info_url) || undefined,
        contact_info: text(info.contact_info) || undefined,
        auth_instructions_url: text(info.auth_instructions_url),
        documentationUrl: text(info.documentationUrl),
        organization: {
            name: text(organization.name),
            url: text(organization.url),
        },
        type: {
            artifact: text(type.artifact),
            group: text(type.group),
            version: text(type.version),
        },
        supported_filesystem_protocols: strings(
            info.supported_filesystem_protocols,
        ),
        supported_wes_versions: strings(info.supported_wes_versions),
        default_workflow_engine_parameters: Array.isArray(
            info.default_workflow_engine_parameters,
        )
            ? info.default_workflow_engine_parameters
            : [],
        system_state_counts: numberRecord(info.system_state_counts),
        tags: stringRecord(info.tags),
        workflow_engine_versions: stringRecord(info.workflow_engine_versions),
        workflow_type_versions: Object.fromEntries(
            Object.entries(workflowTypes).map(([key, value]) => {
                const entry = record(value);
                return [
                    key,
                    {
                        workflow_type_version: strings(
                            entry.workflow_type_version,
                        ),
                    },
                ];
            }),
        ),
        url: "",
    };
}

export async function getWesServiceInfo(
    id: string,
): Promise<WesServiceInfoResult> {
    try {
        const servers = await fetchRegistryServices();
        const server = servers.find((item) => item.id === id);

        if (!server) {
            return failure(404, "WES server not found.");
        }

        const baseUrl = allowedServiceUrl(server.url);

        if (!baseUrl) {
            return failure(400, "Invalid WES service endpoint.");
        }

        const serviceInfoUrl = `${baseUrl}/service-info`;
        const { data } = await axiosBase.get<unknown>(serviceInfoUrl, {
            maxRedirects: 0,
            timeout: 10_000,
            signal: deadline(10_000),
            headers: {
                Accept: "application/json",
            },
        });

        return {
            ok: true,
            serviceInfo: {
                ...sanitizeServiceInfo(data),
                url: serviceInfoUrl,
            },
        };
    } catch (error) {
        if (error instanceof RegistryError) {
            return failure(502, "Unable to fetch service information.");
        }

        if (axios.isAxiosError(error)) {
            if (error.response) {
                return failure(
                    502,
                    `Failed to fetch service information (${error.response.status}).`,
                );
            }

            return failure(502, "Unable to reach the registry or WES service.");
        }

        return failure(502, "Unable to fetch service information.");
    }
}
