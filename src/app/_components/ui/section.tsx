import type { ReactNode } from "react";

interface SectionProps {
	children: ReactNode;
	id?: string;
	className?: string;
}

export function Section({ children, id, className = "" }: SectionProps) {
	return (
		<section
			id={id}
			className={`w-full px-2 py-8 md:px-6 md:py-20 ${className}`}
		>
			{children}
		</section>
	);
}
