import { Fragment } from "react";

import { type Block, type Inline, TERMS } from "~/lib/terms";

const STYLES = {
	/** Marketing site (/termos): black background, Saira, large type. */
	site: {
		h2: "mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl",
		h3: "mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl",
		p: "mb-6 text-base leading-relaxed md:text-lg",
		ul: "mb-8 ml-6 list-disc space-y-2",
		li: "text-base md:text-lg",
		a: "underline decoration-gray-600 hover:decoration-white",
	},
	/** App area (plan signing): compact, readable inside a scroll panel. */
	app: {
		h2: "mt-6 mb-2 font-semibold text-base first:mt-0",
		h3: "mt-4 mb-1.5 font-medium text-sm",
		p: "mb-3 text-muted-foreground text-sm leading-relaxed",
		ul: "mb-3 ml-5 list-disc space-y-1 text-muted-foreground text-sm",
		li: "",
		a: "underline underline-offset-2 hover:text-foreground",
	},
};

type Variant = keyof typeof STYLES;

function Inlines({ parts, variant }: { parts: Inline[]; variant: Variant }) {
	return parts.map((part, i) =>
		typeof part === "string" ? (
			<Fragment key={i}>{part}</Fragment>
		) : (
			<a
				key={i}
				href={part.href}
				target={variant === "app" ? "_blank" : undefined}
				rel={variant === "app" ? "noreferrer" : undefined}
				className={STYLES[variant].a}
			>
				{part.text}
			</a>
		),
	);
}

function Blocks({ blocks, variant }: { blocks: Block[]; variant: Variant }) {
	const s = STYLES[variant];
	return blocks.map((block, i) =>
		"p" in block ? (
			<p key={i} className={s.p}>
				<Inlines parts={block.p} variant={variant} />
			</p>
		) : (
			<ul key={i} className={s.ul}>
				{block.ul.map((item, j) => (
					<li key={j} className={s.li}>
						<Inlines parts={item} variant={variant} />
					</li>
				))}
			</ul>
		),
	);
}

/** The Termos de Uso text (src/lib/terms.ts) in the site or app style. */
export function TermsContent({ variant }: { variant: Variant }) {
	const s = STYLES[variant];
	return TERMS.map((section) => (
		<section key={section.title}>
			<h2 className={s.h2}>{section.title}</h2>
			{section.blocks && <Blocks blocks={section.blocks} variant={variant} />}
			{section.subsections?.map((sub) => (
				<Fragment key={sub.title}>
					<h3 className={s.h3}>{sub.title}</h3>
					<Blocks blocks={sub.blocks} variant={variant} />
				</Fragment>
			))}
		</section>
	));
}
