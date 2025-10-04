import type { ReactNode } from "react";

interface CardProps {
	children: ReactNode;
	variant?: "default" | "ghost" | "bordered";
	hover?: boolean;
	className?: string;
}

export function Card({
	children,
	variant = "default",
	hover = true,
	className = "",
}: CardProps) {
	const baseClasses =
		"border border-gray-800 bg-black/50 backdrop-blur-sm transition-all duration-300";

	const variantClasses = {
		default: hover
			? "hover:border-white hover:shadow-2xl hover:shadow-white/10"
			: "",
		ghost: "bg-transparent backdrop-blur-none",
		bordered: "border-2",
	};

	return (
		<div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
			{children}
		</div>
	);
}
