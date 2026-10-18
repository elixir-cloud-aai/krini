import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import { ECCClientGa4ghTesCreateRunsClient } from "../_components";

function Page() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between w-full items-center">
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight mt-2">Create Task</h2>
                    <p className="leading-7 mt-2">
                        Create a task
                    </p>
                </div>
                <div className="hidden md:flex flex-wrap gap-2 justify-end">
                    <Button className={'px-0'}>
                        <Link href={'/dashboard/tasks'} className={'flex gap-2 items-center h-full px-3'}>
                            View Tasks
                            <Eye size={10} />
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="overflow-hidden">
                <ECCClientGa4ghTesCreateRunsClient />
            </div>
        </div>
    );
}

export default Page;