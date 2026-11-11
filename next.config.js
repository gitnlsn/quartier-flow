/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	// HIDE_DEV_INDICATORS=1 hides the Next.js dev badge, e.g. while recording
	// the help center walkthroughs (/ajuda).
	...(process.env.HIDE_DEV_INDICATORS === "1" && { devIndicators: false }),
};

export default config;
