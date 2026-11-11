/**
 * Where to go after confirming an email link: only paths inside the app area,
 * never another site (open redirect).
 */
export function safeNextPath(value: string | null | undefined) {
	if (!value) return null;
	try {
		const path = new URL(value, "http://x").pathname;
		return /^\/painel(\/[\w-]*)*$/.test(path) ? path : null;
	} catch {
		return null;
	}
}
