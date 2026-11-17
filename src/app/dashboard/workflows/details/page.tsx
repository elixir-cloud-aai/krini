import { ListIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ECCClientGa4ghWesRunClient } from "../_components";

interface PageProps {
    searchParams: Promise<{
        /** ID of the workflow run */
        id?: string | string[];
        /** Registry ID of the run's WES service */
        service?: string | string[];
    }>;
}

async function Page({ searchParams }: PageProps) {
    const { id, service } = await searchParams;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between w-full items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2">
                        Workflow run details
                    </h2>
                    <p className="leading-7 text-sm text-muted-foreground">
                        Follow the state, logs and outputs of a workflow run.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                    <Button className={"px-0"}>
                        <Link
                            href={"/dashboard/workflows"}
                            className={"flex gap-2 items-center h-full px-3"}
                        >
                            View Workflows
                            <ListIcon size={10} />
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="overflow-hidden px-2">
                {typeof id === "string" && id ? (
                    <ECCClientGa4ghWesRunClient
                        runId={id}
                        serviceId={
                            typeof service === "string" && service
                                ? service
                                : undefined
                        }
                    />
                ) : (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                        No workflow run ID was provided.
                    </p>
                )}
            </div>
        </div>
    );
}

export default Page;
