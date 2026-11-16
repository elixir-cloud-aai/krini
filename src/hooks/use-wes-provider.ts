import { useMemo } from "react";
import { TokenWesProvider } from "@/lib/service-providers";
import { useWESStore } from "@/stores/wes";

/**
 * Get the provider of the selected WES service, which sends the user's
 * access token
 * @returns The provider, or `null` while no service is selected
 */
function useWESProvider() {
    const selectedServer = useWESStore((state) => state.selectedServer);

    const wesProvider = useMemo(
        () =>
            selectedServer
                ? new TokenWesProvider(selectedServer.replace(/\/+$/, ""))
                : null,
        [selectedServer],
    );

    return { wesProvider };
}

export { useWESProvider };
