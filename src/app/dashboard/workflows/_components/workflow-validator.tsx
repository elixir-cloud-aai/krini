"use client";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useWESStore } from "@/stores/wes";

interface WorkflowValidatorProps {
    children: React.ReactNode;
}

export function WorkflowValidator({ children }: WorkflowValidatorProps) {
    const selectedServer = useWESStore((state) => state.selectedServer);
    const servers = useWESStore((state) => state.servers);

    if (!selectedServer) {
        return (
            <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium">
                            No WES Server Selected
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Please select a WES server from the dropdown above
                            to view supported workflow types and versions.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const server = servers.find((s) => s.url === selectedServer);
    const info = server?.serviceInfo;

    if (!info) {
        return (
            <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium">
                                Service Information Unavailable
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Could not fetch workflow type information for
                                this server. You may still proceed with workflow
                                submission, but compatibility is not guaranteed.
                            </p>
                        </div>
                    </div>
                </div>
                {children}
            </div>
        );
    }

    const workflowTypes = info.workflow_type_versions ?? {};
    const workflowTypesList = Object.entries(workflowTypes).map(
        ([type, details]) => ({
            type,
            versions: details.workflow_type_version || [],
        }),
    );

    if (workflowTypesList.length === 0) {
        return (
            <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium">
                                No Workflow Types Reported
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                This server did not report any supported
                                workflow types. You may still be able to submit
                                workflows, but compatibility is not guaranteed.
                            </p>
                        </div>
                    </div>
                </div>
                {children}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium">
                            Supported Workflow Types
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            The selected server supports the following workflow
                            types. Ensure your workflow matches one of these
                            types and versions before submission.
                        </p>
                        <div className="mt-3 space-y-2">
                            {workflowTypesList.map(({ type, versions }) => (
                                <div
                                    key={type}
                                    className="rounded-md border bg-muted/50 p-2"
                                >
                                    <p className="text-sm font-medium">
                                        {type}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Versions: {versions.join(", v")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {children}
        </div>
    );
}
