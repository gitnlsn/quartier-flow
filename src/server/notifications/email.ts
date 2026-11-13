import "server-only";

import { env } from "~/env";
import { PREFERENCES_PATH } from "~/lib/notifications";

/**
 * Email version of a notification: one plain layout with the title, the
 * body and a button to the related screen. Every value is escaped.
 */

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const absolute = (path: string) =>
	new URL(path, env.BETTER_AUTH_URL).toString();

export function notificationEmail(input: {
	title: string;
	body: string;
	url: string | null;
}) {
	const link = absolute(input.url ?? "/painel/notificacoes");
	const preferences = absolute(PREFERENCES_PATH);
	const paragraphs = input.body
		.split(/\n{2,}/)
		.map(
			(p) =>
				`<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#18181b">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`,
		)
		.join("");

	const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px 28px">
<tr><td style="font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#18181b;padding-bottom:24px">Quartier Flow</td></tr>
<tr><td><h1 style="margin:0 0 16px;font-size:20px;line-height:28px;color:#18181b">${escapeHtml(input.title)}</h1>${paragraphs}</td></tr>
<tr><td style="padding-top:8px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:8px">Abrir no Quartier Flow</a></td></tr>
</table>
<p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:18px;color:#71717a">Você recebeu este email porque usa o Quartier Flow. <a href="${escapeHtml(preferences)}" style="color:#71717a">Escolha quais avisos receber por email</a>.</p>
</td></tr></table>
</body></html>`;

	const text = [
		input.title,
		"",
		input.body,
		"",
		`Abrir no Quartier Flow: ${link}`,
		"",
		`Escolha quais avisos receber por email: ${preferences}`,
	].join("\n");

	return { subject: input.title, html, text };
}
