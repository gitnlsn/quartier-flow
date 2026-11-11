import type { ReactNode } from "react";

/** Shared black/white frame for the sign-in pages. */
export function AuthShell({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<div className="relative min-h-screen bg-black text-white">
			<div className="fixed inset-0 overflow-hidden bg-dot-pattern" />
			<main className="relative z-10 flex min-h-screen items-center justify-center p-2 md:p-8">
				<div className="w-full max-w-md animate-slide-up border-2 border-white bg-black p-4 md:p-8">
					<a
						href="/"
						className="mb-8 block font-extrabold text-xl tracking-tight"
					>
						Quartier Flow
					</a>
					<h1 className="mb-6 font-bold text-2xl md:text-3xl">{title}</h1>
					{children}
				</div>
			</main>
		</div>
	);
}

export const secondaryButtonClass =
	"w-full border-2 border-white bg-black px-4 py-3 font-bold text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButtonClass =
	"w-full border-2 border-white bg-white px-4 py-3 font-bold text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50";
