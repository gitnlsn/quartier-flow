import type {
	Account,
	DefaultSession,
	NextAuthConfig,
	Profile,
	Session,
	User,
} from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

import { env } from "../../env.js";
import { db } from "../db";

// Google OAuth profile interface
interface GoogleProfile {
	email?: string;
	email_verified?: boolean;
	name?: string;
	picture?: string;
	sub?: string;
	[key: string]: unknown;
}

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
	interface Session extends DefaultSession {
		user: {
			id: string;
			// ...other properties
			// role: UserRole;
		} & DefaultSession["user"];
		accessToken?: string;
		error?: string;
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		accessToken?: string;
		refreshToken?: string;
		accessTokenExpires?: number;
		error?: string;
		googleAccessToken?: string;
		googleRefreshToken?: string;
		user?: {
			id: string;
			email?: string | null;
			name?: string | null;
			image?: string | null;
		};
	}
}

/**
 * JWT callback handler - exported for testing
 */
export async function handleJWTCallback({
	token,
	account,
	user,
	profile,
	trigger,
}: {
	token: JWT;
	account: Account | null;
	user?: User | AdapterUser;
	profile?: Profile;
	trigger?: "update" | "signIn" | "signUp";
	isNewUser?: boolean;
	session?: Session;
}): Promise<JWT> {
	// Database validation - ensure user still exists and is active
	// This runs on EVERY request to validate the session
	if (token.user?.id && !account) {
		try {
			const dbUser = await db.user.findUnique({
				where: { id: token.user.id },
				select: {
					id: true,
					email: true,
					name: true,
					image: true,
				},
			});

			if (!dbUser) {
				// User has been deleted from database - invalidate session
				console.error("User not found in database - invalidating session");
				throw new Error("SESSION_INVALID");
			}

			// Update token with fresh user data from database
			token.user = {
				id: dbUser.id,
				email: dbUser.email,
				name: dbUser.name,
				image: dbUser.image,
			};
		} catch (error) {
			// Database error or session invalid
			if (error instanceof Error && error.message === "SESSION_INVALID") {
				throw error;
			}
			// Log database errors but don't expose them
			console.error("Database validation error");
			throw new Error("SESSION_INVALID");
		}
	}

	// Initial sign in
	if (account && user) {
		// Log sign-in attempt without exposing sensitive data
		console.log(`Sign in attempt: ${account.provider}`);

		// Handle Google sign-in (primary authentication)
		if (account.provider === "google") {
			const userEmail = user.email;

			if (!userEmail) {
				throw new Error("Google account must provide email");
			}

			// Get email verification status from profile
			const isEmailVerified =
				(profile as GoogleProfile)?.email_verified === true;

			// Create or update user in database
			const dbUser = await db.user.upsert({
				where: { email: userEmail },
				update: {
					name: user.name || undefined,
					image: user.image || undefined,
					emailVerified: isEmailVerified ? new Date() : null,
				},
				create: {
					email: userEmail,
					name: user.name,
					image: user.image,
					emailVerified: isEmailVerified ? new Date() : null,
				},
			});

			// Save Google tokens to Account table
			if (account.access_token && account.providerAccountId && account.type) {
				try {
					await db.account.upsert({
						where: {
							provider_providerAccountId: {
								provider: account.provider,
								providerAccountId: account.providerAccountId,
							},
						},
						update: {
							access_token: account.access_token,
							refresh_token: account.refresh_token,
							expires_at: account.expires_at,
							token_type: account.token_type,
							scope: account.scope,
							id_token: account.id_token,
							session_state: account.session_state as string | undefined,
						},
						create: {
							user: {
								connect: {
									id: dbUser.id,
								},
							},
							type: account.type,
							provider: account.provider,
							providerAccountId: account.providerAccountId,
							access_token: account.access_token,
							refresh_token: account.refresh_token,
							expires_at: account.expires_at,
							token_type: account.token_type,
							scope: account.scope,
							id_token: account.id_token,
							session_state: account.session_state as string | undefined,
						},
					});
				} catch (error) {
					console.error("Error creating/updating Google account:", error);
					throw error;
				}
			} else {
				console.warn("Account creation skipped due to missing fields:", {
					access_token: !!account.access_token,
					providerAccountId: !!account.providerAccountId,
					type: !!account.type,
				});
			}

			// Return JWT with user info and tokens
			return {
				...token,
				accessToken: account.access_token,
				refreshToken: account.refresh_token,
				accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
				googleAccessToken: account.access_token,
				googleRefreshToken: account.refresh_token,
				user: {
					id: dbUser.id,
					email: dbUser.email,
					name: dbUser.name,
					image: dbUser.image,
				},
			};
		}
	}

	// Token refresh logic for Google
	if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
		return token;
	}

	// Access token has expired, try to update it
	if (token.refreshToken) {
		// Token expired, attempting refresh (no verbose logging)
		const refreshedTokens = await refreshGoogleAccessToken(
			token.refreshToken as string,
		);

		if (!refreshedTokens.error) {
			// Update tokens in Account table
			const userAccount = await db.account.findFirst({
				where: {
					userId: token.user?.id as string,
					provider: "google",
				},
			});

			if (userAccount && refreshedTokens.accessTokenExpires) {
				await db.account.update({
					where: { id: userAccount.id },
					data: {
						access_token: refreshedTokens.accessToken,
						expires_at: Math.floor(refreshedTokens.accessTokenExpires / 1000),
						refresh_token: refreshedTokens.refreshToken,
					},
				});
			}

			return {
				...token,
				accessToken: refreshedTokens.accessToken,
				accessTokenExpires: refreshedTokens.accessTokenExpires,
				refreshToken: refreshedTokens.refreshToken,
				googleAccessToken: refreshedTokens.accessToken,
				googleRefreshToken: refreshedTokens.refreshToken,
			};
		}

		// Failed to refresh access token
		return {
			...token,
			error: "SESSION_EXPIRED",
		};
	}

	return token;
}

/**
 * Refresh the Google access token using the refresh token
 */
async function refreshGoogleAccessToken(refreshToken: string) {
	try {
		const response = await fetch("https://oauth2.googleapis.com/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				client_id: env.AUTH_GOOGLE_ID,
				client_secret: env.AUTH_GOOGLE_SECRET,
				refresh_token: refreshToken,
				grant_type: "refresh_token",
			}),
		});

		const refreshedTokens = await response.json();

		if (!response.ok) {
			throw refreshedTokens;
		}

		return {
			accessToken: refreshedTokens.access_token,
			accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
			refreshToken: refreshedTokens.refresh_token ?? refreshToken, // Fall back to old refresh token
		};
	} catch (error) {
		// Don't expose detailed error information
		console.error("Token refresh failed");
		return {
			error: "SESSION_EXPIRED",
		};
	}
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
	providers: [
		// Google is the PRIMARY authentication provider - all users must sign in with Google first
		GoogleProvider({
			clientId: env.AUTH_GOOGLE_ID,
			clientSecret: env.AUTH_GOOGLE_SECRET,
			authorization: {
				params: {
					// "consent" forces showing consent screen to get refresh token
					// "select_account consent" also forces account selection
					prompt: "select_account consent",
					access_type: "offline",
					response_type: "code",
					scope:
						"openid email profile https://www.googleapis.com/auth/drive.file",
				},
			},
		}),
	],
	// Note: We're using JWT strategy so we manage the database manually in callbacks
	// adapter: PrismaAdapter(db), // Not needed with JWT strategy
	session: {
		strategy: "jwt", // Use JWT instead of database sessions for better token management
		maxAge: 12 * 60 * 60, // 12 hours for enhanced security
	},
	cookies: {
		sessionToken: {
			name: "next-auth.session-token",
			options: {
				httpOnly: true,
				sameSite: "lax",
				path: "/",
				secure: env.NODE_ENV === "production",
				maxAge: 12 * 60 * 60, // 12 hours for enhanced security
			},
		},
	},
	callbacks: {
		jwt: handleJWTCallback,
		async session({ session, token }) {
			// Send properties to the client
			if (token) {
				session.user.id = token.user?.id as string;
				session.accessToken = token.accessToken as string;
				session.error = token.error as string | undefined;
			}

			return session;
		},
		async signIn({ user, account, profile }) {
			if (
				account?.provider === "google" ||
				account?.provider === "facebook" ||
				account?.provider === "instagram"
			) {
				// Authentication attempt logged

				// For Google provider, check email verification
				if (account.provider === "google") {
					const googleProfile = profile as GoogleProfile;
					if (!googleProfile?.email_verified) {
						console.error("Google email is not verified");
						return false; // Prevent sign in if email is not verified
					}

					// Check if refresh token is present
					if (!account.refresh_token) {
						console.warn("No refresh token received from Google");
					}
				}
			}
			return true;
		},
	},
} satisfies NextAuthConfig;
