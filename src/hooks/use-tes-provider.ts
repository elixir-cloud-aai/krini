import { useMemo } from "react";
import { TokenTesProvider } from "@/lib/service-providers";
import { useTESStore } from "@/stores/tes";

/**
 * Get the provider of the selected TES service, which sends the user's
 * access token
 * @returns The provider, or `null` while no service is selected
 */
function useTESProvider(): TokenTesProvider | null {
    const selectedServer = useTESStore((state) => state.selectedServer);

    return useMemo(
        () =>
            selectedServer
                ? new TokenTesProvider(selectedServer.replace(/\/+$/, ""))
                : null,
        [selectedServer],
    );
}

export { useTESProvider };
