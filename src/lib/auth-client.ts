import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Browser auth client. Talks to /api/auth on the same origin. */
export const authClient = createAuthClient({
	plugins: [magicLinkClient()],
});
