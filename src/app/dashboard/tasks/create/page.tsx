import { Eye } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    ECCClientGa4ghTesCreateRunsClient,
    TESServerList,
} from "../_components";

function Page() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between w-full items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2">
                        Create Task
                    </h2>
                    <p className="leading-7 text-sm text-muted-foreground">
                        Configure and submit a task to a TES instance.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                    <TESServerList />
                    <Button className={"px-0"}>
                        <Link
                            href={"/dashboard/tasks"}
                            className={"flex gap-2 items-center h-full px-3"}
                        >
                            View Tasks
                            <Eye size={10} />
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="overflow-hidden px-2">
                <ECCClientGa4ghTesCreateRunsClient />
            </div>
        </div>
    );
}

export default Page;
