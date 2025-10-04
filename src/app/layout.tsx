import "~/styles/globals.css";

import type { Metadata } from "next";
import { Saira } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "Quartier Flow - Gestão de Condomínios",
	description: "Gestão de condomínios simplificada e moderna",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const saira = Saira({
	subsets: ["latin"],
	variable: "--font-saira",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="pt-BR" className={`${saira.variable}`}>
			<body className={`${saira.className}`}>
				<TRPCReactProvider>{children}</TRPCReactProvider>
			</body>
		</html>
	);
}
