import { ListChecks, Workflow } from "lucide-react";
import Link from "next/link";

function DashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2">
                    Dashboard
                </h2>
                <p className="leading-7 text-sm text-muted-foreground">
                    Run tasks on TES services and workflows on WES services.
                </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Link
                    href="/dashboard/tasks"
                    className="flex items-center gap-3 rounded-lg border p-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                    <ListChecks className="h-5 w-5 text-muted-foreground" />
                    Tasks (TES)
                </Link>
                <Link
                    href="/dashboard/workflows"
                    className="flex items-center gap-3 rounded-lg border p-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                    <Workflow className="h-5 w-5 text-muted-foreground" />
                    Workflows (WES)
                </Link>
            </div>
        </div>
    );
}

export default DashboardPage;
