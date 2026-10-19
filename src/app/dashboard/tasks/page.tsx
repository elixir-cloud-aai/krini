import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { ECCClientGa4ghTesRunsClient, TESServerList } from "./_components";

function Page() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between w-full items-center">
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight mt-2">Task Execution Service (TES)</h2>
                    <p className="leading-7 text-sm text-muted-foreground">
                        Monitor task execution across TES instances and submit new tasks to supported services.
                    </p>
                </div>
                <div className="hidden md:flex flex-wrap gap-2 justify-end">
                    <TESServerList />
                    <Button className={'px-0'}>
                        <Link href={'/dashboard/tasks/create'} className={'flex gap-2 items-center h-full px-3'}>
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