interface SectionHeaderProps {
	title: string;
	subtitle?: string;
	align?: "left" | "center" | "right";
	className?: string;
}

export function SectionHeader({
	title,
	subtitle,
	align = "center",
	className = "",
}: SectionHeaderProps) {
	const alignClasses = {
		left: "text-left",
		center: "text-center",
		right: "text-right",
	};

	return (
		<div className={`mb-8 md:mb-16 ${alignClasses[align]} ${className}`}>
			<h2 className="mb-2 font-bold text-3xl md:mb-4 md:text-5xl">{title}</h2>
			{subtitle && (
				<p className="text-base text-gray-400 md:text-xl">{subtitle}</p>
			)}
		</div>
	);
}
