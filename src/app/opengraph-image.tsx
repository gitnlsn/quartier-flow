import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Quartier Flow - Gestão de Condomínios Simplificada";
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = "image/png";

export default async function Image() {
	return new ImageResponse(
		<div
			style={{
				background: "black",
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "80px",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					border: "4px solid white",
					padding: "60px",
					width: "100%",
					height: "100%",
				}}
			>
				<div
					style={{
						fontSize: 80,
						fontWeight: 900,
						color: "white",
						textAlign: "center",
						marginBottom: 20,
						letterSpacing: "-0.05em",
					}}
				>
					Quartier Flow
				</div>
				<div
					style={{
						fontSize: 48,
						color: "#9CA3AF",
						textAlign: "center",
						marginBottom: 40,
					}}
				>
					Gestão de Condomínios Simplificada
				</div>
				<div
					style={{
						display: "flex",
						gap: 40,
						flexWrap: "wrap",
						justifyContent: "center",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 12,
							fontSize: 28,
							color: "#D1D5DB",
						}}
					>
						🔍 Transparência
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 12,
							fontSize: 28,
							color: "#D1D5DB",
						}}
					>
						💬 Comunicação
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 12,
							fontSize: 28,
							color: "#D1D5DB",
						}}
					>
						⚡ Automação
					</div>
				</div>
			</div>
		</div>,
		{
			...size,
		},
	);
}
