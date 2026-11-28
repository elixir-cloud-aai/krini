"use client";
import { Button } from "@/components/ui/button";

type Props = {
    /** The examples; their names are unique (`src/lib/examples.ts`) */
    examples: { name: string; description?: string }[];
    /** Fill the form with the example of the given name */
    onUse: (name: string) => void;
};

/**
 * One button per example, which fills the form below with it; nothing
 * without examples
 */
function ExampleButtons({ examples, onUse }: Props) {
    if (examples.length === 0) return null;

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
                    onClick={() => onUse(example.name)}
                >
                    {example.name}
                </Button>
            ))}
        </fieldset>
    );
}

export { ExampleButtons };
