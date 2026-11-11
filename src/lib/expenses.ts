/** Rules shared by the expense form (browser) and the upload route (server). */

export const EXPENSE_CATEGORIES = [
	"Manutenção",
	"Limpeza",
	"Pessoal",
	"Água",
	"Energia",
	"Gás",
	"Segurança",
	"Administração",
	"Seguros",
	"Obras",
	"Outros",
] as const;

/** Below Vercel's 4.5 MB request body limit (the file goes through our server). */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

/** What the browser accepts in the file picker (images are compressed to JPEG). */
export const ATTACHMENT_ACCEPT = "image/*,application/pdf";

export type AttachmentType =
	| "image/jpeg"
	| "image/png"
	| "image/webp"
	| "application/pdf";

/**
 * Detects the real file type from its first bytes. The browser-reported type
 * and the extension are not trusted.
 */
export function sniffAttachmentType(bytes: Uint8Array): AttachmentType | null {
	const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
	if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
	if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
		return "image/png";
	if (
		starts(0x52, 0x49, 0x46, 0x46) &&
		String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
	) {
		return "image/webp";
	}
	if (String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") {
		return "application/pdf";
	}
	return null;
}

export const ATTACHMENT_EXTENSION: Record<AttachmentType, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"application/pdf": "pdf",
};
