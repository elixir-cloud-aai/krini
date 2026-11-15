import { ListIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ECCClientGa4ghTesTaskClient } from "../_components";

interface PageProps {
    searchParams: Promise<{
        /** ID of the task */
        id?: string | string[];
        /** Registry ID of the task's TES service */
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
                        Task details
                    </h2>
                    <p className="leading-7 text-sm text-muted-foreground">
                        Follow the state and logs of a task, or cancel it.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                    <Button className={"px-0"}>
                        <Link
                            href={"/dashboard/tasks"}
                            className={"flex gap-2 items-center h-full px-3"}
                        >
                            View Tasks
                            <ListIcon size={10} />
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="overflow-hidden px-2">
                {typeof id === "string" && id ? (
                    <ECCClientGa4ghTesTaskClient
                        taskId={id}
                        serviceId={
                            typeof service === "string" && service
                                ? service
                                : undefined
                        }
                    />
                ) : (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                        No task ID was provided.
                    </p>
                )}
            </div>
        </div>
    );
}

export default Page;
