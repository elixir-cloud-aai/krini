/**
 * Copy the workers of the code editor into `public/ace/`, from which Krini
 * serves them (see `src/lib/ace-workers.ts`); runs before `next dev` and
 * `next build` (`package.json`). Run from the checkout's root
 */
import { join } from "node:path";
import { copyAceWorkers } from "../src/lib/ace-worker-files";

copyAceWorkers(join(process.cwd(), "public", "ace"));
