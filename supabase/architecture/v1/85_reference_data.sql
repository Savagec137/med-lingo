-- Minimum non-pedagogical reference data.
-- Product content, prices, loot probabilities and medical knowledge are
-- deliberately not invented here.

INSERT INTO iam.permissions (code, domain, action, description)
VALUES
  ('users.read', 'users', 'read', 'Read user administration projections'),
  ('users.manage', 'users', 'manage', 'Manage account status and organization membership'),
  ('roles.manage', 'iam', 'manage', 'Manage roles and permission grants'),
  ('content.manage', 'content', 'manage', 'Create, review and publish learning content'),
  ('sources.validate', 'knowledge', 'validate', 'Validate source provenance and regulatory updates'),
  ('rewards.grant', 'gamification', 'grant', 'Grant server-authoritative rewards'),
  ('economy.manage', 'commerce', 'manage', 'Manage catalog, prices, loot and reconciliation'),
  ('analytics.read', 'analytics', 'read', 'Read aggregate product and learning analytics'),
  ('moderation.manage', 'governance', 'manage', 'Process moderation cases and actions'),
  ('feature_flags.manage', 'operations', 'manage', 'Manage feature rollout and overrides'),
  ('audit.read', 'governance', 'read', 'Read restricted security and audit trails')
ON CONFLICT (code) DO UPDATE
SET domain = EXCLUDED.domain,
    action = EXCLUDED.action,
    description = EXCLUDED.description;

INSERT INTO iam.roles (code, name, description, system_role)
VALUES
  ('learner', 'Apprenant', 'Default learning role', true),
  ('trainer', 'Formateur', 'Training follow-up role', true),
  ('content_editor', 'Éditeur pédagogique', 'Creates and updates draft content', true),
  ('medical_reviewer', 'Validateur médical', 'Performs medical content review', true),
  ('regulatory_reviewer', 'Validateur réglementaire', 'Reviews legal and regulatory sources', true),
  ('moderator', 'Modérateur', 'Processes moderation cases', true),
  ('administrator', 'Administrateur', 'Global operational administrator', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    system_role = EXCLUDED.system_role;

INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM iam.roles r
JOIN iam.permissions p ON
  (r.code = 'administrator')
  OR (r.code = 'content_editor' AND p.code = 'content.manage')
  OR (r.code = 'medical_reviewer' AND p.code IN ('content.manage', 'sources.validate'))
  OR (r.code = 'regulatory_reviewer' AND p.code = 'sources.validate')
  OR (r.code = 'moderator' AND p.code = 'moderation.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO commerce.currency_definitions (
  code, kind, display_name, maximum_balance, transferable, purchasable, active
)
VALUES
  ('coins', 'coins', 'Pièces', NULL, false, false, true),
  ('gems', 'gems', 'Gemmes', NULL, false, true, true),
  ('keys', 'keys', 'Clés', NULL, false, false, true),
  ('tickets', 'tickets', 'Tickets', NULL, false, false, true),
  ('energy', 'energy', 'Énergie', 100, false, false, true)
ON CONFLICT (code) DO UPDATE
SET kind = EXCLUDED.kind,
    display_name = EXCLUDED.display_name,
    maximum_balance = EXCLUDED.maximum_balance,
    transferable = EXCLUDED.transferable,
    purchasable = EXCLUDED.purchasable,
    active = EXCLUDED.active;

INSERT INTO commerce.entitlement_definitions (
  code, name, description, feature_flags, active
)
VALUES (
  'premium',
  'MedLingo Premium',
  'Entitlement racine pour les fonctions Premium',
  ARRAY['premium_content', 'premium_cosmetics', 'unlimited_hearts']::text[],
  true
)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    feature_flags = EXCLUDED.feature_flags,
    active = EXCLUDED.active;

INSERT INTO gamification.levels (
  level, title, minimum_total_xp, maximum_total_xp, benefits
)
VALUES
  (1, 'Débutant', 0, 100, '{}'::jsonb),
  (2, 'Apprenant', 100, 250, '{}'::jsonb),
  (3, 'Explorateur', 250, 500, '{}'::jsonb),
  (4, 'Praticien', 500, 900, '{}'::jsonb),
  (5, 'Confirmé', 900, 1500, '{}'::jsonb),
  (6, 'Avancé', 1500, 2400, '{}'::jsonb),
  (7, 'Expert', 2400, 3600, '{}'::jsonb),
  (8, 'Référent', 3600, 5200, '{}'::jsonb),
  (9, 'Maître', 5200, 7500, '{}'::jsonb),
  (10, 'Légende', 7500, NULL, '{}'::jsonb)
ON CONFLICT (level) DO UPDATE
SET title = EXCLUDED.title,
    minimum_total_xp = EXCLUDED.minimum_total_xp,
    maximum_total_xp = EXCLUDED.maximum_total_xp,
    benefits = EXCLUDED.benefits;

