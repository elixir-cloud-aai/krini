export type WESServer = {
    contactUrl: string;
    createdAt: string;
    description: string;
    documentationUrl: string;
    environment: string;
    id: string;
    name: string;
    organization: Organization;
    type: Type;
    updatedAt: string;
    url: string;
    version: string;
    health: {
        status: "ok" | "unreachable";
        reason?: string;
    };
    serviceInfo: WESServiceInfo | null;
};

interface Organization {
    name: string;
    url: string;
}

interface Type {
    artifact: string;
    group: string;
    version: string;
}

export type WESServiceInfo = {
    id: string;
    name: string;
    description: string;
    environment: string;
    version: string;
    createdAt: string;
    updatedAt: string;

    contactUrl: string;
    contact_info: string;
    auth_instructions_url: string;
    documentationUrl: string;

    organization: {
        name: string;
        url: string;
    };

    type: {
        artifact: string;
        group: string;
        version: string;
    };

    supported_filesystem_protocols: string[];
    supported_wes_versions: string[];
    default_workflow_engine_parameters: unknown[];

    system_state_counts: Record<string, number>;
    tags: Record<string, string>;

    workflow_engine_versions: Record<string, string>;
    workflow_type_versions: Record<
        string,
        {
            workflow_type_version: string[];
        }
    >;
    url: string;
};
