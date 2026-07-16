# Boutique Premium MedLingo — Plan de mise en œuvre

Objectif : ajouter une **boutique** avec monnaie in-app (pièces), **coffres de compensation** quand les vies tombent à 0, **avatars/badges exclusifs**, et un **abonnement Premium** débloquant des cas cliniques avancés — le tout compatible free ↔ premium.

---

## 1. Modèle économique

**Free (reste riche)**
- Toutes les unités actuelles (vocabulaire, anatomie, pathologies, DEA base)
- 5 vies + régénération 15 min
- Coffre de compensation à chaque « game over » (1× / 4h max, anti-farm)
- Pulse IA : 10 messages / jour
- Boutique de cosmétiques payable en **pièces gagnées**

**Premium (9,99 €/mois — 79,99 €/an)**
- ❤️ Vies illimitées
- 🧠 Cas cliniques avancés (nouvelle unité verrouillée)
- 🤖 Pulse IA illimité + mode « coach quotidien »
- 🎨 Avatars / cadres / fonds exclusifs (tag « Premium »)
- 🏆 Badge animé « Membre Premium »
- 📊 Statistiques avancées + export PDF
- 🚫 Zéro pub future

---

## 2. Base de données (nouvelles tables)

Toutes en `public.*`, RLS activée, GRANT `authenticated` + `service_role`.

| Table | Rôle |
|---|---|
| `wallets` | `user_id`, `coins`, `gems` (soft currency / hard currency) |
| `coin_transactions` | historique gains/dépenses (source, amount, ref) |
| `shop_items` | catalogue : `code`, `type` (avatar/frame/background/badge/booster/chest), `price_coins`, `price_gems`, `premium_only`, `rarity`, `asset_url`, `active` |
| `user_inventory` | items possédés (`user_id`, `item_code`, `equipped`, `acquired_at`) |
| `chests` | définitions (`code`, `tier` bronze/argent/or/légendaire, `loot_table` jsonb) |
| `chest_openings` | `user_id`, `chest_code`, `opened_at`, `rewards` jsonb, `source` (compensation / shop / mission) |
| `subscriptions` | `user_id`, `status`, `plan`, `current_period_end`, `stripe_customer_id`, `stripe_subscription_id` |
| `entitlements` (vue) | résout `is_premium` par user (subscription active OU compte staff) |
| `premium_content` | flag `is_premium` sur unités/leçons (colonne ajoutée à `curriculum` côté code ou table `lesson_flags`) |

Fonctions SQL :
- `grant_compensation_chest(user_id)` — SECURITY DEFINER, vérifie cooldown 4h, insère `chest_openings` + crédite loot.
- `has_active_subscription(user_id)` — utilisée dans policies pour contenu premium.
- `spend_coins(user_id, amount, reason)` — transaction atomique.

---

## 3. Paiement — Stripe seamless (Lovable Payments)

- Enable via `enable_stripe_payments` (built-in, pas de compte à créer)
- Tax handling : **managed_payments** (produit digital, SaaS)
- 2 produits : `premium_monthly`, `premium_annual`
- Webhook `/api/public/webhooks/stripe` (vérif signature) → met à jour `subscriptions`
- Server fn `createCheckoutSession` + `openCustomerPortal`

---

## 4. Coffre de compensation (flow « 0 vie »)

Déclenché dans `use-progress.ts` quand `hearts` passe à 0 :

1. Appel serverFn `claimCompensationChest()` (cooldown 4h côté SQL).
2. Modal plein écran animée : coffre qui s'ouvre, confettis, loot révélé carte par carte.
3. Loot table bronze : 20-50 pièces, 1 vie bonus, chance 5% skin commun.
4. CTA en bas : « Vies illimitées avec Premium → » (soft-sell, jamais bloquant).
5. Si Premium actif : coffre argent (loot ×2) + zéro paywall.

---

## 5. Boutique — routes & UI

Nouvelle route `/boutique` avec 4 onglets :

- **Coffres** — bronze (gratuit 24h), argent (500 pièces), or (2000), légendaire (Premium ou 50 gems)
- **Avatars** — grille filtrable (Étudiant, IFSI, DEA, SAMU…), premium tagués 👑
- **Personnalisation** — cadres, fonds, titres (référence `project-knowledge`)
- **Premium** — pricing card mensuel/annuel, liste d'avantages, CTA Stripe Checkout

Composants :
- `ShopCard`, `ChestOpeningModal`, `PremiumBadge`, `PaywallDialog` (réutilisable)
- `useWallet()`, `useInventory()`, `useSubscription()`, `useEntitlements()` (hooks React Query)

Intégrations existantes :
- `TopBar` : affiche pièces + icône couronne Premium
- `profil.tsx` : vitrine avatars/cadres équipés, bouton « Gérer abonnement »
- Écran fin de leçon : bonus pièces (5-15 selon étoiles) → alimente boutique naturellement

---

## 6. Contenu Premium — cas cliniques avancés

- Nouvelle unité `cas-cliniques-avances` dans `curriculum.ts` avec `premiumOnly: true`
- 15 cas multi-étapes (bilan ABCDE → décision → justification) rédigés progressivement
- Sur la carte du parcours : cadenas doré + tap → `PaywallDialog`
- Preview gratuite : 1er cas jouable pour créer l'envie

---

## 7. Gating — comment on décide Free vs Premium

Un seul hook `useEntitlements()` → `{ isPremium, unlimitedHearts, premiumContent }`.

Utilisé partout :
- `use-progress.loseHeart()` : no-op si `unlimitedHearts`
- Router loader d'une leçon premium : redirect vers paywall si `!premiumContent`
- Composants cosmétiques : filtre `premium_only` dans la boutique
- Server-side : policies RLS sur `premium_content` valident `has_active_subscription()`

---

## 8. Découpage en lots livrables

**Lot A — Fondations économie (1 turn)**
Migration wallets/coin_transactions/shop_items/user_inventory + seed catalogue initial + hook `useWallet` + affichage pièces dans TopBar + récompense pièces en fin de leçon.

**Lot B — Coffres & compensation (1 turn)**
Migration chests/chest_openings + SQL `grant_compensation_chest` + `ChestOpeningModal` + hook 0-vie dans `use-progress`.

**Lot C — Boutique UI (1-2 turns)**
Route `/boutique` complète (4 onglets), inventaire, équipement avatar/cadre, intégration profil.

**Lot D — Premium & Stripe (1 turn)**
`enable_stripe_payments` + produits + subscriptions table + webhook + `useEntitlements` + `PaywallDialog` + application du gating (vies illimitées, cas cliniques verrouillés).

**Lot E — Contenu premium (1 turn, itératif)**
Unité cas cliniques avancés + intégration parcours.

---

## Détails techniques

- **Sécurité** : toutes les écritures monnaie/inventaire passent par `createServerFn` + `requireSupabaseAuth` → jamais depuis le client. Le client ne peut PAS s'auto-créditer des pièces.
- **RLS** : lecture `user_inventory`/`wallets` scopée `auth.uid()`. `shop_items` en lecture `anon+authenticated` (catalogue public).
- **Anti-triche coffre** : cooldown 4h vérifié SQL-side, pas JS.
- **Webhook Stripe** : `/api/public/webhooks/stripe`, vérif signature HMAC, `supabaseAdmin` importé dans le handler.
- **Compat rétro** : users existants → wallet créé à la volée à première lecture ; aucune donnée perdue.
- **Design** : cohérent avec palette Duolingo énergique + Space Grotesk actuelle, animations Framer Motion sur coffres/paywall.

---

**Dis-moi par quel lot je démarre** (recommandé : **Lot A** pour poser l'économie, puis B pour le hook émotionnel du coffre de compensation).
