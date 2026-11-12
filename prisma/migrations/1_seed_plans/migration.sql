-- Plan catalog (docs/features/18): reference data every environment needs,
-- otherwise onboarding step 3 shows no plans and nobody can sign up.
-- PLACEHOLDER PRICES. Create-only: plans that already exist (by key) are left
-- untouched. Change prices with a new migration (UPDATE ... WHERE "key" = ...).
INSERT INTO "Plan" ("id", "key", "name", "description", "residentSeatCents", "sindicoSeatCents", "updatedAt")
VALUES
  ('plan_essencial', 'essencial', 'Essencial', 'Gestão de condomínios, moradores e cobrança mensal.', 300, 1500, CURRENT_TIMESTAMP),
  ('plan_profissional', 'profissional', 'Profissional', 'Tudo do Essencial, com suporte prioritário.', 450, 2000, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
