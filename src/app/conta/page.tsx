import { redirect } from "next/navigation";

/** Account home moved to /painel, the single area for every user. */
export default function ContaPage() {
	redirect("/painel");
}
