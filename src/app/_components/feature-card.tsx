import { Card } from "./ui";

interface FeatureCardProps {
	icon: string;
	title: string;
	description: string;
	delay?: string;
}

export function FeatureCard({
	icon,
	title,
	description,
	delay = "",
}: FeatureCardProps) {
	return (
		<Card className={`group p-2 md:p-8 ${delay}`}>
			<div className="mb-2 text-2xl md:mb-4 md:text-4xl">{icon}</div>
			<h3 className="mb-1 font-bold text-base md:mb-3 md:text-xl">{title}</h3>
			<p className="text-gray-400 text-sm md:text-base">{description}</p>
		</Card>
	);
}
