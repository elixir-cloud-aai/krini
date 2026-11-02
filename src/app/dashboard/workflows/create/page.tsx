import { Eye } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    ECCClientGa4ghWesCreateRunsClient,
    WESServerList,
} from "../_components";
import { WorkflowValidator } from "../_components/workflow-validator";

function Page() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between w-full items-center">
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight mt-2">
                        Create Workflow
                    </h2>
                    <p className="leading-7 text-sm text-muted-foreground">
                        Define and configure a workflow for execution.
                    </p>
                </div>
                <div className="hidden md:flex flex-wrap gap-2 justify-end">
                    <WESServerList />
                    <Button className={"px-0"}>
                        <Link
                            href={"/dashboard/workflows"}
                            className={"flex gap-2 items-center h-full px-3"}
                        >
                            View Workflows
                            <Eye size={10} />
                        </Link>
                    </Button>
                </div>
            </div>
            <WorkflowValidator>
                <div className="overflow-hidden px-2">
                    <ECCClientGa4ghWesCreateRunsClient />
                </div>
            </WorkflowValidator>
        </div>
    );
}

export default Page;
