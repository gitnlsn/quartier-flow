import type { ReactNode } from "react";

interface ButtonProps {
	children: ReactNode;
	variant?: "primary" | "secondary" | "outline";
	size?: "sm" | "md" | "lg";
	href?: string;
	onClick?: () => void;
	className?: string;
	type?: "button" | "submit" | "reset";
}

export function Button({
	children,
	variant = "primary",
	size = "md",
	href,
	onClick,
	className = "",
	type = "button",
}: ButtonProps) {
	const baseClasses =
		"inline-block font-bold transition-all duration-300 text-center";

	const variantClasses = {
		primary:
			"border-2 border-white bg-white text-black hover:bg-black hover:text-white",
		secondary:
			"border-2 border-gray-600 bg-gray-600 text-white hover:bg-transparent hover:border-white",
		outline:
			"border-2 border-white bg-transparent text-white hover:bg-white hover:text-black",
	};

	const sizeClasses = {
		sm: "px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base",
		md: "px-4 py-2 text-base md:px-8 md:py-4 md:text-lg",
		lg: "px-6 py-3 text-lg md:px-10 md:py-5 md:text-xl",
	};

	const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

	if (href) {
		return (
			<a href={href} className={classes}>
				{children}
			</a>
		);
	}

	return (
		<button type={type} onClick={onClick} className={classes}>
			{children}
		</button>
	);
}
