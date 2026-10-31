import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ECCClientGa4ghWesRunsClient, ServiceInfoButton, WESServerList } from "./_components";

function WESPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between w-full items-center">
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight mt-2">
                        Workflow Execution Service (WES)
                    </h2>
                    <p className="leading-7 text-sm text-muted-foreground">
                        Browse available workflows, monitor their execution, and
                        submit new workflows.
                    </p>
                </div>
                <div className="hidden md:flex flex-wrap gap-2 justify-end">
                    <div className="flex gap-2 items-center">
                        <ServiceInfoButton />
                        <WESServerList />
                    </div>
                    <Button className={"px-0"}>
                        <Link
                            href={"/dashboard/workflows/create"}
                            className={"flex gap-2 items-center h-full px-3"}
                        >
                            Create Workflow
                            <PlusIcon size={10} />
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="overflow-hidden px-2">
                <ECCClientGa4ghWesRunsClient />
            </div>
        </div>
    );
}

export default WESPage;
