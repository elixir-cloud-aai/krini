import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ECCClientGa4ghTesRunsClient, TESServerList } from "./_components";

function Page() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between w-full items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2">
                        Task Execution Service (TES)
                    </h2>
                    <p className="leading-7 text-sm text-muted-foreground">
                        Monitor task execution across TES instances and submit
                        new tasks to supported services.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                    <TESServerList />
                    <Button className={"px-0"}>
                        <Link
                            href={"/dashboard/tasks/create"}
                            className={"flex gap-2 items-center h-full px-3"}
                        >
                            Create Task
                            <PlusIcon size={10} />
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="overflow-hidden px-2">
                <ECCClientGa4ghTesRunsClient />
            </div>
        </div>
    );
}

export default Page;
