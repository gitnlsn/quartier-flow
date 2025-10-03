import "~/styles/globals.css";

import type { Metadata } from "next";
import { Funnel_Sans } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "Quartier Flow - Gestão de Condomínios",
	description: "Gestão de condomínios simplificada e moderna",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const funnelSans = Funnel_Sans({
	subsets: ["latin"],
	variable: "--font-funnel-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="pt-BR" className={`${funnelSans.variable}`}>
			<body className={funnelSans.className}>
				<TRPCReactProvider>{children}</TRPCReactProvider>
			</body>
		</html>
	);
}
