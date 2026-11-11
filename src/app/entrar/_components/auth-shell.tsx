import type { ReactNode } from "react";

/** Light frame for sign-in and signup (same theme as the app area). */
export function AuthShell({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<div className="app flex min-h-screen items-center justify-center px-4 py-10">
			<main className="w-full max-w-md animate-fade-in">
				<a
					href="/"
					className="mb-6 block text-center font-bold font-sans text-xl tracking-tight"
				>
					Quartier Flow
				</a>
				<div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
					<h1 className="mb-6 font-semibold text-2xl tracking-tight">
						{title}
					</h1>
					{children}
				</div>
			</main>
		</div>
	);
}

export const secondaryButtonClass =
	"inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border bg-background px-4 font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButtonClass =
	"inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
