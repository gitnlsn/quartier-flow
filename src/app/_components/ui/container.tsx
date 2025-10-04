import type { ReactNode } from "react";

interface ContainerProps {
	children: ReactNode;
	size?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "5xl" | "6xl" | "7xl";
	className?: string;
}

const sizeClasses = {
	sm: "max-w-2xl",
	md: "max-w-3xl",
	lg: "max-w-4xl",
	xl: "max-w-5xl",
	"2xl": "max-w-6xl",
	"4xl": "max-w-7xl",
	"5xl": "max-w-[90rem]",
	"6xl": "max-w-[100rem]",
	"7xl": "max-w-[110rem]",
};

export function Container({
	children,
	size = "2xl",
	className = "",
}: ContainerProps) {
	return (
		<div className={`mx-auto w-full ${sizeClasses[size]} ${className}`}>
			{children}
		</div>
	);
}
