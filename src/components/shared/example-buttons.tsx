"use client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { type FillResult, fillMessage } from "@/lib/example-forms";

type Props<T extends { name: string; description?: string }> = {
    /** The examples; their names are unique (`src/lib/examples.ts`) */
    examples: T[];
    /** What the form creates, for the messages */
    form: "task" | "workflow";
    /** Fill the form with an example */
    fill: (example: T) => FillResult;
};

/**
 * One button per example, which fills the form below with it, or says why
 * it couldn't; nothing without examples
 */
function ExampleButtons<T extends { name: string; description?: string }>({
    examples,
    form,
    fill,
}: Props<T>) {
    if (examples.length === 0) return null;

    const use = (example: T) => {
        const message = fillMessage(fill(example), form);
        if (message?.kind === "info") toast.info(message.text);
        if (message?.kind === "error") toast.error(message.text);
    };

    return (
        <fieldset className="flex flex-wrap items-center gap-2 text-sm">
            <legend className="sr-only">Examples</legend>
            <span className="text-muted-foreground">Use an example:</span>
            {examples.map((example) => (
                <Button
                    key={example.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    title={example.description}
                    onClick={() => use(example)}
                >
                    {example.name}
                </Button>
            ))}
        </fieldset>
    );
}

export { ExampleButtons };
