import "~/styles/globals.css";

import type { Metadata } from "next";
import { Saira } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { StructuredData } from "./_components/structured-data";

export const metadata: Metadata = {
	title: "Quartier Flow - Gestão de Condomínios Simplificada",
	description:
		"Plataforma completa para gestão de condomínios com sistema de pagamentos, controle de inadimplência, comunicação com moradores e automação de processos. Cadastre-se na lista de espera.",
	keywords: [
		"gestão de condomínios",
		"administração condominial",
		"software para condomínios",
		"sistema de pagamentos condomínio",
		"controle de inadimplência",
		"comunicação com moradores",
		"automação condomínio",
		"plataforma condominial",
		"administradora de condomínios",
		"síndico profissional",
	],
	authors: [{ name: "Quartier Flow" }],
	creator: "Quartier Flow",
	publisher: "Quartier Flow",
	metadataBase: new URL("https://quartierflow.com"),
	alternates: {
		canonical: "/",
	},
	openGraph: {
		type: "website",
		locale: "pt_BR",
		url: "https://quartierflow.com",
		title: "Quartier Flow - Gestão de Condomínios Simplificada",
		description:
			"Plataforma completa para gestão de condomínios com sistema de pagamentos, controle de inadimplência, comunicação com moradores e automação de processos.",
		siteName: "Quartier Flow",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "Quartier Flow - Gestão de Condomínios Simplificada",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Quartier Flow - Gestão de Condomínios Simplificada",
		description:
			"Plataforma completa para gestão de condomínios com sistema de pagamentos, controle de inadimplência e automação de processos.",
		images: ["/android-chrome-512x512.png"],
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
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
			<head>
				<StructuredData />
			</head>
			<body className={`${saira.className}`}>
				<TRPCReactProvider>{children}</TRPCReactProvider>
			</body>
		</html>
	);
}
