#!/usr/bin/env node

/**
 * Enhanced Website Content Crawler
 *
 * Usage: npx tsx scripts/crawler.ts [options] <url>
 *
 * Options:
 *   -h, --help         Show help
 *   -j, --json         Output JSON only (compact format)
 *   -t, --text         Include raw text
 *   -m, --main         Include main content
 *   -H, --header       Include header content
 *   -f, --footer       Include footer content
 *   -s, --aside        Include aside/sidebar content
 *   -c, --html         Include clean HTML
 *   -l, --links        Include links
 *   -T, --tables       Include tables
 *   -L, --lists        Include lists
 *   -i, --images       Include images
 *   -a, --all          Include all content (default if no flags specified)
 *
 * Examples:
 *   npx tsx scripts/crawler.ts --json --text --links https://example.com
 *   npx tsx scripts/crawler.ts -jtml https://example.com
 *   npx tsx scripts/crawler.ts --all --json https://example.com
 */

import { URL } from "node:url";
import { parseArgs } from "node:util";
import puppeteer, { type Page } from "puppeteer";

// Colors for console output
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
};

function log(message: string, color = colors.reset) {
	console.log(`${color}${message}${colors.reset}`);
}

function logError(message: string) {
	log(`❌ ${message}`, colors.red);
}

function logSuccess(message: string) {
	log(`✅ ${message}`, colors.green);
}

function logInfo(message: string) {
	log(`ℹ️  ${message}`, colors.blue);
}

interface LinkData {
	href: string;
	text: string;
}

interface ExtractedContent {
	cleanHtml: string;
	structuralHtml: string;
	rawText: string;
	mainContent: string;
	headerContent: string;
	footerContent: string;
	asideContent: string;
	links: LinkData[];
	tables: string[][][]; // 2D arrays for each table
	lists: string[][]; // Arrays for each list
	images: string[];
}

interface CrawlResult {
	url: string;
	title: string;
	timestamp: string;
	content: ExtractedContent;
}

interface CrawlOptions {
	json: boolean;
	text: boolean;
	main: boolean;
	header: boolean;
	footer: boolean;
	aside: boolean;
	html: boolean;
	structure: boolean;
	links: boolean;
	tables: boolean;
	lists: boolean;
	images: boolean;
	all: boolean;
}

interface JSONOutput {
	url: string;
	title: string;
	timestamp: string;
	rawText?: string;
	mainContent?: string;
	headerContent?: string;
	footerContent?: string;
	asideContent?: string;
	cleanHtml?: string;
	structuralHtml?: string;
	links?: LinkData[];
	tables?: string[][][];
	lists?: string[][];
	images?: string[];
	error?: string;
}

interface VerboseJSONOutput extends JSONOutput {
	summary?: {
		textLength: number;
		linkCount: number;
		tableCount: number;
		listCount: number;
		imageCount: number;
	};
	content?: {
		rawText?: string;
		mainContent?: string;
		headerContent?: string;
		footerContent?: string;
		asideContent?: string;
		cleanHtml?: string;
		structuralHtml?: string;
		links?: LinkData[];
		tables?: string[][][];
		lists?: string[][];
		images?: string[];
	};
}

// Validate URL
function isValidUrl(urlString: string): boolean {
	try {
		new URL(urlString);
		return true;
	} catch {
		return false;
	}
}

// Extract structured content from the page
async function extractContent(page: Page): Promise<ExtractedContent> {
	return await page.evaluate(() => {
		// Get raw text first
		const rawText =
			document.body?.innerText || document.body?.textContent || "";

		// Extract semantic content sections before cloning
		const mainElement = document.querySelector(
			'main, [role="main"], #main, .main, article, .content, #content',
		);
		const mainContent = mainElement
			? (
					(mainElement as HTMLElement).innerText ||
					mainElement.textContent ||
					""
				).trim()
			: "";

		const headerElement = document.querySelector(
			'header, [role="banner"], #header, .header',
		);
		const headerContent = headerElement
			? (
					(headerElement as HTMLElement).innerText ||
					headerElement.textContent ||
					""
				).trim()
			: "";

		const footerElement = document.querySelector(
			'footer, [role="contentinfo"], #footer, .footer',
		);
		const footerContent = footerElement
			? (
					(footerElement as HTMLElement).innerText ||
					footerElement.textContent ||
					""
				).trim()
			: "";

		const asideElements = document.querySelectorAll(
			'aside, [role="complementary"], #sidebar, .sidebar, .aside',
		);
		const asideContent = Array.from(asideElements)
			.map((el) =>
				((el as HTMLElement).innerText || el.textContent || "").trim(),
			)
			.filter((text) => text.length > 0)
			.join("\n\n");

		// Clone the body to work with
		const bodyClone = document.body.cloneNode(true) as HTMLElement;

		// Remove unwanted elements
		const unwantedSelectors = [
			"script",
			"style",
			"noscript",
			"iframe",
			"svg",
			".advertisement",
			".ads",
			"#cookie-banner",
		];

		for (const selector of unwantedSelectors) {
			try {
				const elements = bodyClone.querySelectorAll(selector);
				for (const el of elements) {
					el.parentNode?.removeChild(el);
				}
			} catch (e) {
				// Skip if selector fails
			}
		}

		// Aggressive HTML cleaning - keep only essential content-related attributes
		let cleanHtml = bodyClone.innerHTML;

		// First pass: Remove common unnecessary attributes
		const unnecessaryAttrs = [
			"class",
			"id",
			"style",
			"target",
			"rel",
			"role",
			"tabindex",
			"lang",
			"dir",
			"translate",
			"contenteditable",
			"draggable",
			"spellcheck",
			"autocomplete",
			"autocorrect",
			"autocapitalize",
			"autofocus",
			"align",
			"justify",
			"valign",
			"bgcolor",
			"border",
			"cellpadding",
			"cellspacing",
			"width",
			"height",
			"size",
			"color",
			"face",
			"clear",
			"noshade",
			"nowrap",
			"hspace",
			"vspace",
			"shape",
			"coords",
			"accesskey",
			"data-testid",
			"data-id",
			"data-type",
			"data-value",
			"data-index",
			"data-key",
			"data-label",
			"data-target",
			"data-toggle",
			"data-dismiss",
			"data-placement",
			"data-content",
			"data-original-title",
			"aria-hidden",
			"aria-label",
			"aria-labelledby",
			"aria-describedby",
			"aria-expanded",
			"aria-selected",
			"aria-controls",
			"aria-current",
			"aria-live",
			"aria-atomic",
			"aria-relevant",
			"aria-busy",
			"xmlns",
			"xml:lang",
			"epub:type",
			"property",
			"typeof",
			"vocab",
			"itemprop",
			"itemscope",
			"itemtype",
			"itemid",
			"itemref",
			"loading",
			"decoding",
			"importance",
			"integrity",
			"crossorigin",
			"referrerpolicy",
			"sandbox",
			"allowfullscreen",
			"allowpaymentrequest",
			"srcdoc",
			"srcset",
			"sizes",
			"as",
			"media",
			"ping",
			"scope",
			"async",
			"defer",
			"nomodule",
			"nonce",
			"fetchpriority",
			"blocking",
			"disabled",
			"readonly",
			"required",
			"checked",
			"selected",
			"multiple",
			"pattern",
			"min",
			"max",
			"step",
			"minlength",
			"maxlength",
			"placeholder",
			"form",
			"formaction",
			"formenctype",
			"formmethod",
			"formnovalidate",
			"formtarget",
			"list",
			"download",
			"hreflang",
			"media",
			"type",
			"reversed",
			"start",
			"compact",
			"charset",
			"content",
			"http-equiv",
			"scheme",
			"open",
			"usemap",
			"ismap",
			"cite",
			"datetime",
			"pubdate",
			"manifest",
			"contextmenu",
			"dropzone",
			"slot",
			"hidden",
			"inert",
			"is",
			"part",
			"exportparts",
			"virtualkeyboardpolicy",
			"enterkeyhint",
			"inputmode",
			"to",
		];

		// Remove all these attributes using a loop for efficiency
		for (const attr of unnecessaryAttrs) {
			const regex = new RegExp(`\\s${attr}="[^"]*"`, "gi");
			cleanHtml = cleanHtml.replace(regex, "");
			const regexSingle = new RegExp(`\\s${attr}='[^']*'`, "gi");
			cleanHtml = cleanHtml.replace(regexSingle, "");
			const regexNoValue = new RegExp(`\\s${attr}(?=\\s|>)`, "gi");
			cleanHtml = cleanHtml.replace(regexNoValue, "");
		}

		// Remove all event handler attributes (on*)
		cleanHtml = cleanHtml.replace(/\son\w+="[^"]*"/gi, "");
		cleanHtml = cleanHtml.replace(/\son\w+='[^']*'/gi, "");

		// Remove all data-* attributes
		cleanHtml = cleanHtml.replace(/\sdata-[\w-]+="[^"]*"/gi, "");
		cleanHtml = cleanHtml.replace(/\sdata-[\w-]+='[^']*'/gi, "");
		cleanHtml = cleanHtml.replace(/\sdata-[\w-]+(?=\s|>)/gi, "");

		// Remove all aria-* attributes
		cleanHtml = cleanHtml.replace(/\saria-[\w-]+="[^"]*"/gi, "");
		cleanHtml = cleanHtml.replace(/\saria-[\w-]+='[^']*'/gi, "");
		cleanHtml = cleanHtml.replace(/\saria-[\w-]+(?=\s|>)/gi, "");

		// Remove any custom attributes (x-*, v-*, ng-*, etc.)
		cleanHtml = cleanHtml.replace(/\s[xvng]-[\w-]+="[^"]*"/gi, "");
		cleanHtml = cleanHtml.replace(/\s[xvng]-[\w-]+='[^']*'/gi, "");
		cleanHtml = cleanHtml.replace(/\s:[\w-]+="[^"]*"/gi, "");
		cleanHtml = cleanHtml.replace(/\s:[\w-]+='[^']*'/gi, "");
		cleanHtml = cleanHtml.replace(/\s@[\w-]+="[^"]*"/gi, "");
		cleanHtml = cleanHtml.replace(/\s@[\w-]+='[^']*'/gi, "");

		// Clean up multiple spaces and normalize
		cleanHtml = cleanHtml.replace(/\s+/g, " ");
		cleanHtml = cleanHtml.replace(/>\s+</g, "><");
		cleanHtml = cleanHtml.trim();

		// Extract links with href and text
		const linkElements = bodyClone.querySelectorAll("a[href]");
		const links: LinkData[] = Array.from(linkElements)
			.map((link) => {
				const anchor = link as HTMLAnchorElement;
				return {
					href: anchor.href,
					text: (anchor.innerText || anchor.textContent || "").trim(),
				};
			})
			.filter((link) => link.href && link.text);

		// Extract tables as 2D arrays
		const tableElements = bodyClone.querySelectorAll("table");
		const tables: string[][][] = Array.from(tableElements)
			.map((table) => {
				const rows = Array.from(table.querySelectorAll("tr"));
				return rows
					.map((row) => {
						const cells = Array.from(row.querySelectorAll("td, th"));
						return cells.map(
							(cell) =>
								(cell as HTMLElement).innerText?.trim() ||
								cell.textContent?.trim() ||
								"",
						);
					})
					.filter((row) => row.length > 0);
			})
			.filter((table) => table.length > 0);

		// Extract lists as arrays
		const listElements = bodyClone.querySelectorAll("ul, ol");
		const lists: string[][] = Array.from(listElements)
			.map((list) => {
				const items = Array.from(list.querySelectorAll("li"));
				return items
					.map(
						(item) =>
							(item as HTMLElement).innerText?.trim() ||
							item.textContent?.trim() ||
							"",
					)
					.filter((text) => text.length > 0);
			})
			.filter((list) => list.length > 0);

		// Extract image sources
		const imageElements = bodyClone.querySelectorAll("img[src]");
		const images: string[] = Array.from(imageElements)
			.map((img) => (img as HTMLImageElement).src)
			.filter((src) => src?.startsWith("http"));

		// Extract ultra-clean structural HTML
		const structureClone = document.body.cloneNode(true) as HTMLElement;

		// Remove all script, style, meta, and SVG elements (they're usually icons/decorative)
		const toRemove = structureClone.querySelectorAll(
			"script, style, noscript, link[rel='stylesheet'], meta, svg, canvas",
		);
		for (const elem of toRemove) {
			elem.remove();
		}

		// Process all elements to keep only essential attributes
		const allElements = structureClone.querySelectorAll("*");
		for (const element of allElements) {
			if (!(element instanceof HTMLElement)) continue;

			const tagName = element.tagName.toLowerCase();
			const attrs = Array.from(element.attributes);

			// Store original attributes
			const originalAttrs: Record<string, string> = {};
			for (const attr of attrs) {
				originalAttrs[attr.name] = attr.value;
			}

			// Remove all attributes
			for (const attr of attrs) {
				element.removeAttribute(attr.name);
			}

			// Add back only essential structural attributes based on element type
			switch (tagName) {
				case "a":
					if (originalAttrs.href) element.setAttribute("href", "#");
					break;
				case "img":
					if (originalAttrs.src) element.setAttribute("src", "[image]");
					if (originalAttrs.alt) element.setAttribute("alt", originalAttrs.alt);
					break;
				case "input":
					if (originalAttrs.type && originalAttrs.type !== "text")
						element.setAttribute("type", originalAttrs.type);
					if (originalAttrs.name)
						element.setAttribute("name", originalAttrs.name);
					break;
				case "select":
				case "textarea":
					if (originalAttrs.name)
						element.setAttribute("name", originalAttrs.name);
					break;
				case "form":
					element.setAttribute("method", originalAttrs.method || "post");
					break;
				case "label":
					if (originalAttrs.for) element.setAttribute("for", originalAttrs.for);
					break;
				case "th":
				case "td":
					if (originalAttrs.colspan)
						element.setAttribute("colspan", originalAttrs.colspan);
					if (originalAttrs.rowspan)
						element.setAttribute("rowspan", originalAttrs.rowspan);
					break;
				case "option":
					if (originalAttrs.value)
						element.setAttribute("value", originalAttrs.value);
					break;
			}
		}

		// Collapse redundant wrapper divs and spans
		const wrappers = structureClone.querySelectorAll("div, span");
		for (const wrapper of wrappers) {
			if (!(wrapper instanceof HTMLElement)) continue;

			// Check if this is a redundant wrapper (no attributes, single child)
			if (
				wrapper.attributes.length === 0 &&
				wrapper.children.length === 1 &&
				wrapper.children[0] instanceof HTMLElement
			) {
				const child = wrapper.children[0];
				const parent = wrapper.parentElement;
				if (parent) {
					parent.replaceChild(child, wrapper);
				}
			}
		}

		// Normalize common patterns to semantic HTML
		const semanticMap: Record<string, string> = {
			navigation: "nav",
			sidebar: "aside",
			content: "main",
			"main-content": "main",
			footer: "footer",
			header: "header",
			article: "article",
			section: "section",
		};

		// Try to identify semantic elements by common patterns
		const divsToCheck = structureClone.querySelectorAll("div");
		for (const div of divsToCheck) {
			if (!(div instanceof HTMLElement)) continue;

			// Check text content or position for semantic hints
			const textContent = (div.textContent || "").toLowerCase();
			for (const [pattern, semantic] of Object.entries(semanticMap)) {
				if (textContent.includes(pattern)) {
					const newElement = document.createElement(semantic);
					while (div.firstChild) {
						newElement.appendChild(div.firstChild);
					}
					div.parentElement?.replaceChild(newElement, div);
					break;
				}
			}
		}

		let structuralHtml = structureClone.innerHTML;
		// Clean up whitespace
		structuralHtml = structuralHtml.replace(/\s+/g, " ");
		structuralHtml = structuralHtml.replace(/>\s+</g, "><");
		structuralHtml = structuralHtml.trim();

		return {
			cleanHtml,
			structuralHtml,
			rawText: rawText.trim(),
			mainContent,
			headerContent,
			footerContent,
			asideContent,
			links,
			tables,
			lists,
			images,
		};
	});
}

// Main crawler function
async function crawlWebsite(url: string, silent = false): Promise<CrawlResult> {
	if (!silent) logInfo(`Starting to crawl: ${url}`);

	const browser = await puppeteer.launch({
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-blink-features=AutomationControlled",
			"--disable-gpu",
			"--disable-web-security",
			"--disable-features=IsolateOrigins,site-per-process,AudioServiceOutOfProcess,TranslateUI",
			"--no-first-run",
			"--no-zygote",
			"--single-process",
			"--disable-extensions",
			"--disable-plugins",
			"--disable-images",
			"--disable-default-apps",
			"--disable-sync",
			"--disable-translate",
			"--disable-notifications",
			"--disable-background-timer-throttling",
			"--disable-backgrounding-occluded-windows",
			"--disable-renderer-backgrounding",
			"--disable-ipc-flooding-protection",
			"--disable-popup-blocking",
			"--disable-hang-monitor",
			"--disable-component-update",
			"--disable-domain-reliability",
			"--disable-client-side-phishing-detection",
			"--mute-audio",
			"--no-default-browser-check",
			"--autoplay-policy=no-user-gesture-required",
			"--ignore-certificate-errors",
		],
		defaultViewport: {
			width: 1920,
			height: 1080,
		},
		ignoreDefaultArgs: ["--enable-automation"],
	});

	try {
		const page = await browser.newPage();

		// Set a realistic user agent
		await page.setUserAgent(
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		);

		// Enable request interception to block unnecessary resources
		await page.setRequestInterception(true);

		// Block images, videos, fonts, stylesheets, and other media to speed up loading
		page.on("request", (request) => {
			const resourceType = request.resourceType();
			const url = request.url();

			// Block resource types that are not needed for content extraction
			const blockedResourceTypes = [
				"image",
				"media",
				"font",
				"stylesheet",
				"texttrack",
				"object",
				"beacon",
				"csp_report",
				"imageset",
				"websocket",
				"manifest",
				"other",
			];

			// Block common tracking and analytics domains
			const blockedDomains = [
				"google-analytics.com",
				"googletagmanager.com",
				"facebook.com",
				"facebook.net",
				"twitter.com",
				"linkedin.com",
				"pinterest.com",
				"reddit.com",
				"doubleclick.net",
				"cloudflare.com",
				"segment.io",
				"segment.com",
				"hotjar.com",
				"mixpanel.com",
				"amplitude.com",
				"sentry.io",
				"bugsnag.com",
				"intercom.io",
				"drift.com",
				"crisp.chat",
			];

			const shouldBlock =
				blockedResourceTypes.includes(resourceType) ||
				blockedDomains.some((domain) => url.includes(domain)) ||
				url.includes(".jpg") ||
				url.includes(".jpeg") ||
				url.includes(".png") ||
				url.includes(".gif") ||
				url.includes(".svg") ||
				url.includes(".ico") ||
				url.includes(".woff") ||
				url.includes(".woff2") ||
				url.includes(".ttf") ||
				url.includes(".eot") ||
				url.includes(".mp4") ||
				url.includes(".avi") ||
				url.includes(".webm") ||
				url.includes(".mp3") ||
				url.includes(".wav");

			if (shouldBlock) {
				request.abort();
			} else {
				request.continue();
			}
		});

		// Additional performance optimizations
		await page.setBypassCSP(true); // Bypass Content Security Policy
		await page.setCacheEnabled(false); // Disable cache since we're doing one-time crawls
		await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
		await page.setDefaultNavigationTimeout(30000);
		await page.setDefaultTimeout(30000);

		// Inject CSS to disable animations and transitions
		await page.evaluateOnNewDocument(() => {
			const style = document.createElement("style");
			style.textContent = `
				*, *::before, *::after {
					animation-duration: 0s !important;
					animation-delay: 0s !important;
					transition-duration: 0s !important;
					transition-delay: 0s !important;
				}
			`;
			document.head.appendChild(style);
		});

		// Block iframe loading
		await page.evaluateOnNewDocument(() => {
			// Override iframe creation
			const originalCreateElement = document.createElement.bind(document);
			(
				document as Document & { createElement: typeof document.createElement }
			).createElement = <K extends keyof HTMLElementTagNameMap>(
				tagName: K,
				options?: ElementCreationOptions,
			): HTMLElementTagNameMap[K] => {
				if (tagName.toLowerCase() === "iframe") {
					const div = originalCreateElement("div");
					div.textContent = "[iframe blocked]";
					return div as unknown as HTMLElementTagNameMap[K];
				}
				return originalCreateElement(tagName, options);
			};
		});

		// Disable JavaScript execution for even faster loading (optional - comment out if JS is needed)
		// await page.setJavaScriptEnabled(false);

		if (!silent) logInfo("Loading page...");
		await page.goto(url, {
			waitUntil: "domcontentloaded", // Changed from networkidle2 for faster loading
			timeout: 30000, // Reduced timeout since we're blocking resources
		});

		// Wait for content to stabilize (reduced wait time since we're blocking media)
		if (!silent) logInfo("Waiting for content to load...");
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Scroll to load lazy content
		if (!silent) logInfo("Scrolling to load dynamic content...");
		await page.evaluate(() => {
			return new Promise<void>((resolve) => {
				let totalHeight = 0;
				const distance = 100;
				const timer = setInterval(() => {
					const scrollHeight = document.body.scrollHeight;
					window.scrollBy(0, distance);
					totalHeight += distance;

					if (totalHeight >= scrollHeight) {
						clearInterval(timer);
						resolve();
					}
				}, 100);
			});
		});

		// Wait for any lazy-loaded content (reduced wait time)
		await new Promise((resolve) => setTimeout(resolve, 1000));

		if (!silent) logInfo("Extracting content...");
		const content = await extractContent(page);

		// Get page title
		const title = await page.title();

		const result: CrawlResult = {
			url,
			title,
			timestamp: new Date().toISOString(),
			content,
		};

		if (!silent) logSuccess("Content extracted successfully!");
		return result;
	} finally {
		await browser.close();
	}
}

// Output JSON in compact format
function outputJSON(result: CrawlResult, options: CrawlOptions) {
	const output: JSONOutput = {
		url: result.url,
		title: result.title,
		timestamp: result.timestamp,
	};

	// Include only requested fields
	if (options.text) output.rawText = result.content.rawText;
	if (options.main) output.mainContent = result.content.mainContent;
	if (options.header) output.headerContent = result.content.headerContent;
	if (options.footer) output.footerContent = result.content.footerContent;
	if (options.aside) output.asideContent = result.content.asideContent;
	if (options.html) output.cleanHtml = result.content.cleanHtml;
	if (options.structure) output.structuralHtml = result.content.structuralHtml;
	if (options.links) output.links = result.content.links;
	if (options.tables) output.tables = result.content.tables;
	if (options.lists) output.lists = result.content.lists;
	if (options.images) output.images = result.content.images;

	// Output compact JSON (no formatting)
	console.log(JSON.stringify(output));
}

// Display results
function displayResults(
	result: CrawlResult,
	options: CrawlOptions = {
		json: false,
		text: true,
		main: true,
		header: true,
		footer: true,
		aside: true,
		html: true,
		structure: false,
		links: true,
		tables: true,
		lists: true,
		images: true,
		all: true,
	},
) {
	console.log(`\n${"=".repeat(80)}`);
	log("🌐 WEBSITE CRAWL RESULTS", colors.cyan);
	console.log("=".repeat(80));

	log(`📍 URL: ${result.url}`, colors.blue);
	log(`📅 Crawled: ${result.timestamp}`, colors.blue);
	log(`📄 Title: ${result.title}`, colors.green);

	// Display semantic content sections based on options
	if (options.main) {
		console.log("\n📖 MAIN CONTENT:");
		console.log("-".repeat(40));
		console.log(result.content.mainContent || "No main content found");
	}

	if (options.header) {
		console.log("\n📌 HEADER CONTENT:");
		console.log("-".repeat(40));
		console.log(result.content.headerContent || "No header content found");
	}

	if (options.footer) {
		console.log("\n📍 FOOTER CONTENT:");
		console.log("-".repeat(40));
		console.log(result.content.footerContent || "No footer content found");
	}

	if (options.aside) {
		console.log("\n📎 ASIDE CONTENT:");
		console.log("-".repeat(40));
		console.log(result.content.asideContent || "No aside content found");
	}

	if (options.text) {
		console.log("\n📝 RAW TEXT:");
		console.log("-".repeat(40));
		console.log(result.content.rawText);
	}

	if (options.html) {
		console.log("\n🔧 CLEAN HTML:");
		console.log("-".repeat(40));
		console.log(result.content.cleanHtml);
	}

	if (options.structure) {
		console.log("\n🏗️ STRUCTURAL HTML:");
		console.log("-".repeat(40));
		console.log(result.content.structuralHtml);
	}

	// Display links
	if (options.links && result.content.links.length > 0) {
		console.log("\n🔗 LINKS:");
		console.log("-".repeat(40));
		for (const [index, link] of result.content.links.entries()) {
			console.log(`${index + 1}. [${link.text}] -> ${link.href}`);
		}
	}

	// Display tables
	if (options.tables && result.content.tables.length > 0) {
		console.log("\n📊 TABLES:");
		console.log("-".repeat(40));
		for (const [tableIndex, table] of result.content.tables.entries()) {
			console.log(
				`Table ${tableIndex + 1} (${table.length} rows x ${table[0]?.length || 0} columns):`,
			);
			// Show all rows
			for (const row of table) {
				console.log(`  ${row.join(" | ")}`);
			}
			console.log();
		}
	}

	// Display lists
	if (options.lists && result.content.lists.length > 0) {
		console.log("\n📋 LISTS:");
		console.log("-".repeat(40));
		for (const [listIndex, list] of result.content.lists.entries()) {
			console.log(`List ${listIndex + 1} (${list.length} items):`);
			for (const item of list) {
				console.log(`  • ${item}`);
			}
			console.log();
		}
	}

	// Display images
	if (options.images && result.content.images.length > 0) {
		console.log("\n🖼️  IMAGES:");
		console.log("-".repeat(40));
		for (const [index, image] of result.content.images.entries()) {
			console.log(`${index + 1}. ${image}`);
		}
	}

	console.log(`\n${"=".repeat(80)}`);
	log(
		`📊 Summary: ${result.content.rawText.length} chars, ${result.content.links.length} links, ${result.content.tables.length} tables, ${result.content.lists.length} lists, ${result.content.images.length} images`,
		colors.yellow,
	);
	console.log("=".repeat(80));

	// Export as JSON for programmatic use - FULL CONTENT, NO TRUNCATION
	if (!options.json) {
		// Only show verbose JSON in non-JSON mode
		console.log("\n💾 FULL JSON OUTPUT:");
		console.log("-".repeat(40));
		const jsonOutput: VerboseJSONOutput = {
			url: result.url,
			title: result.title,
			timestamp: result.timestamp,
			summary: {
				textLength: result.content.rawText.length,
				linkCount: result.content.links.length,
				tableCount: result.content.tables.length,
				listCount: result.content.lists.length,
				imageCount: result.content.images.length,
			},
			content: {},
		};

		// Include only requested fields in JSON output
		if (options.text && jsonOutput.content)
			jsonOutput.content.rawText = result.content.rawText;
		if (options.main && jsonOutput.content)
			jsonOutput.content.mainContent = result.content.mainContent;
		if (options.header && jsonOutput.content)
			jsonOutput.content.headerContent = result.content.headerContent;
		if (options.footer && jsonOutput.content)
			jsonOutput.content.footerContent = result.content.footerContent;
		if (options.aside && jsonOutput.content)
			jsonOutput.content.asideContent = result.content.asideContent;
		if (options.html && jsonOutput.content)
			jsonOutput.content.cleanHtml = result.content.cleanHtml;
		if (options.structure && jsonOutput.content)
			jsonOutput.content.structuralHtml = result.content.structuralHtml;
		if (options.links && jsonOutput.content)
			jsonOutput.content.links = result.content.links;
		if (options.tables && jsonOutput.content)
			jsonOutput.content.tables = result.content.tables;
		if (options.lists && jsonOutput.content)
			jsonOutput.content.lists = result.content.lists;
		if (options.images && jsonOutput.content)
			jsonOutput.content.images = result.content.images;

		console.log(JSON.stringify(jsonOutput, null, 2));
	}
}

// Parse command-line arguments
function parseArguments(): { url: string; options: CrawlOptions } {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		options: {
			help: { type: "boolean", short: "h" },
			json: { type: "boolean", short: "j" },
			text: { type: "boolean", short: "t" },
			main: { type: "boolean", short: "m" },
			header: { type: "boolean", short: "H" },
			footer: { type: "boolean", short: "f" },
			aside: { type: "boolean", short: "s" },
			html: { type: "boolean", short: "c" },
			structure: { type: "boolean", short: "S" },
			links: { type: "boolean", short: "l" },
			tables: { type: "boolean", short: "T" },
			lists: { type: "boolean", short: "L" },
			images: { type: "boolean", short: "i" },
			all: { type: "boolean", short: "a" },
		},
		allowPositionals: true,
	});

	if (values.help) {
		console.log(`
Website Content Crawler

Usage: npx tsx scripts/crawler.ts [options] <url>

Options:
  -h, --help         Show help
  -j, --json         Output JSON only (compact format)
  -t, --text         Include raw text
  -m, --main         Include main content
  -H, --header       Include header content
  -f, --footer       Include footer content
  -s, --aside        Include aside/sidebar content
  -c, --html         Include clean HTML
  -S, --structure    Include ultra-clean structural HTML
  -l, --links        Include links
  -T, --tables       Include tables
  -L, --lists        Include lists
  -i, --images       Include images
  -a, --all          Include all content (default if no flags specified)

Examples:
  npx tsx scripts/crawler.ts --json --text --links https://example.com
  npx tsx scripts/crawler.ts -jtml https://example.com
  npx tsx scripts/crawler.ts --all --json https://example.com
`);
		process.exit(0);
	}

	const url = positionals[0];

	if (!url) {
		logError("Please provide a URL to crawl");
		console.log("Use --help for usage information");
		process.exit(1);
	}

	// If no specific content flags are set, default to all
	const hasContentFlags =
		values.text ||
		values.main ||
		values.header ||
		values.footer ||
		values.aside ||
		values.html ||
		values.structure ||
		values.links ||
		values.tables ||
		values.lists ||
		values.images ||
		values.all;

	const options: CrawlOptions = {
		json: Boolean(values.json),
		text: Boolean(values.text) || Boolean(values.all) || !hasContentFlags,
		main: Boolean(values.main) || Boolean(values.all) || !hasContentFlags,
		header: Boolean(values.header) || Boolean(values.all) || !hasContentFlags,
		footer: Boolean(values.footer) || Boolean(values.all) || !hasContentFlags,
		aside: Boolean(values.aside) || Boolean(values.all) || !hasContentFlags,
		html: Boolean(values.html) || Boolean(values.all) || !hasContentFlags,
		structure: Boolean(values.structure),
		links: Boolean(values.links) || Boolean(values.all) || !hasContentFlags,
		tables: Boolean(values.tables) || Boolean(values.all) || !hasContentFlags,
		lists: Boolean(values.lists) || Boolean(values.all) || !hasContentFlags,
		images: Boolean(values.images) || Boolean(values.all) || !hasContentFlags,
		all: Boolean(values.all) || !hasContentFlags,
	};

	return { url, options };
}

// Main execution
async function main() {
	const { url, options } = parseArguments();

	if (!isValidUrl(url)) {
		logError("Invalid URL provided");
		console.log("Please provide a valid HTTP/HTTPS URL");
		process.exit(1);
	}

	try {
		const result = await crawlWebsite(url, options.json);

		if (options.json) {
			outputJSON(result, options);
		} else {
			displayResults(result, options);
		}
	} catch (error) {
		if (!options.json) {
			logError(`Failed to crawl website: ${(error as Error).message}`);
		} else {
			// Output error as JSON
			console.log(JSON.stringify({ error: (error as Error).message }));
		}
		process.exit(1);
	}
}

// Handle process termination
process.on("SIGINT", () => {
	log("\n\nCrawler interrupted by user", colors.yellow);
	process.exit(130);
});

// Run the main function
main().catch((error) => {
	logError(`Fatal error: ${error.message}`);
	console.error(error);
	process.exit(1);
});
