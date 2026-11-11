"use client";

import { useEffect, useState } from "react";

/**
 * Recorded walkthrough. With "reduce motion" on, it waits for a click
 * before playing (an animated GIF can't be paused, only not loaded).
 */
export function WalkthroughGif({ src, alt }: { src: string; alt: string }) {
	const [reduced, setReduced] = useState(false);
	const [play, setPlay] = useState(false);
	useEffect(() => {
		setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	}, []);

	if (reduced && !play) {
		return (
			<button
				type="button"
				onClick={() => setPlay(true)}
				className="flex aspect-[1172/808] w-full items-center justify-center border border-gray-800 bg-gray-950 text-gray-300 text-sm hover:border-white hover:text-white"
			>
				Ver animação: {alt}
			</button>
		);
	}
	// Plain <img>: next/image would re-encode the animated GIF.
	return (
		<img
			src={src}
			alt={alt}
			width={1172}
			height={808}
			loading="lazy"
			className="h-auto w-full border border-gray-800 bg-white"
		/>
	);
}
