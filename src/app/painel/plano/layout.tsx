import type { ReactNode } from "react";

import { AdminOnly } from "../_components/admin-only";

export default function Layout({ children }: { children: ReactNode }) {
	return <AdminOnly>{children}</AdminOnly>;
}
