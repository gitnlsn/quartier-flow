"use client";

import { ArrowLeft, Lock } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";
import {
	Card,
	ErrorMessage,
	HelpLink,
	Loading,
	PageTitle,
	errorMessage,
} from "../../_components/ui";

/**
 * Which notifications also come by email (docs/features/16). The inbox in
 * the app always gets everything; mandatory types can't be turned off.
 */
export default function NotificationPreferencesPage() {
	const utils = api.useUtils();
	const prefs = api.notification.preferences.useQuery();
	const set = api.notification.setPreference.useMutation({
		onMutate: async ({ type, enabled }) => {
			await utils.notification.preferences.cancel();
			const previous = utils.notification.preferences.getData();
			utils.notification.preferences.setData(undefined, (rows) =>
				rows?.map((r) => (r.type === type ? { ...r, email: enabled } : r)),
			);
			return { previous };
		},
		onError: (_error, _input, context) => {
			if (context?.previous) {
				utils.notification.preferences.setData(undefined, context.previous);
			}
		},
		onSettled: () => utils.notification.preferences.invalidate(),
	});

	const groups = new Map<string, NonNullable<typeof prefs.data>>();
	for (const row of prefs.data ?? []) {
		groups.set(row.group, [...(groups.get(row.group) ?? []), row]);
	}

	return (
		<div className="space-y-6">
			<PageTitle
				title="Preferências de notificação"
				subtitle="Tudo aparece em Notificações, no app. Escolha o que também chega por email."
				actions={
					<>
						<HelpLink slug="notificacoes" />
						<a
							href="/painel/notificacoes"
							className={buttonVariants({ variant: "outline", size: "lg" })}
						>
							<ArrowLeft aria-hidden />
							Notificações
						</a>
					</>
				}
			/>
			<ErrorMessage message={errorMessage(set.error ?? prefs.error)} />
			{prefs.isLoading ? (
				<Loading />
			) : (
				[...groups].map(([group, rows]) => (
					<Card key={group} title={group}>
						<ul className="divide-y">
							{rows.map((row) => {
								const id = `pref-${row.type}`;
								return (
									<li
										key={row.type}
										className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
									>
										<label htmlFor={id} className="min-w-0 flex-1 space-y-0.5">
											<span className="block font-medium">{row.label}</span>
											<span className="block text-muted-foreground text-sm">
												{row.description}
											</span>
										</label>
										<span className="flex shrink-0 items-center gap-2">
											<span className="text-muted-foreground text-sm">
												Email
											</span>
											{row.mandatory ? (
												<Lock
													className="size-4 text-muted-foreground"
													aria-label="Obrigatório"
												/>
											) : null}
											<Switch
												id={id}
												checked={row.email}
												disabled={row.mandatory}
												onCheckedChange={(enabled) =>
													set.mutate({
														type: row.type,
														channel: "email",
														enabled,
													})
												}
											/>
										</span>
									</li>
								);
							})}
						</ul>
					</Card>
				))
			)}
		</div>
	);
}
