# Relations et diagrammes ERD

Le dictionnaire exhaustif des relations et cardinalités se trouve dans
[TABLE_CATALOG.md](TABLE_CATALOG.md). Les diagrammes ci-dessous montrent les
agrégats structurants ; afficher 195 tables dans un seul diagramme le rendrait
illisible et non vérifiable.

## Carte des contextes

```mermaid
flowchart LR
  AUTH["Supabase Auth"] --> IAM["iam"]
  IAM --> PROGRESS["progress"]
  IAM --> COMMERCE["commerce"]
  IAM --> AI["ai"]
  MEDIA["media"] --> LEARNING["learning"]
  MEDIA --> PRACTICE["practice"]
  MEDIA --> ANATOMY["anatomy"]
  KNOWLEDGE["knowledge"] --> LEARNING
  KNOWLEDGE --> PRACTICE
  KNOWLEDGE --> ANATOMY
  LEARNING --> PRACTICE
  LEARNING --> PROGRESS
  PRACTICE --> PROGRESS
  PRACTICE --> CLINICAL["clinical"]
  ANATOMY --> PRACTICE
  CLINICAL --> PROGRESS
  PROGRESS --> GAMIFICATION["gamification"]
  GAMIFICATION --> COMMERCE
  PROGRESS --> AI
  KNOWLEDGE --> AI
  PROGRESS --> ANALYTICS["analytics"]
  ENGAGEMENT["engagement"] --> IAM
  OPERATIONS["operations"] --> ANALYTICS
  GOVERNANCE["governance"] --> KNOWLEDGE
  GOVERNANCE --> LEARNING
```

## Contenu et banque pédagogique

```mermaid
erDiagram
  FORMATIONS ||--o{ FORMATION_VERSIONS : versions
  FORMATION_VERSIONS ||--o{ BLOCKS : contains
  BLOCKS ||--o{ PATHS : contains
  PATHS ||--o{ LESSONS : contains
  LESSONS ||--o{ LESSON_VERSIONS : versions
  LESSON_VERSIONS }o--o{ COMPETENCIES : covers
  LESSON_VERSIONS }o--o{ QUESTION_BANKS : selects
  QUESTION_BANKS ||--o{ QUESTIONS : contains
  QUESTIONS ||--o{ QUESTION_VERSIONS : versions
  QUESTION_VERSIONS ||--o{ CHOICES : offers
  QUESTION_VERSIONS ||--o{ ANSWER_KEYS : grades
  QUESTION_VERSIONS }o--o{ COMPETENCIES : measures
  QUESTION_VERSIONS }o--o{ SOURCE_SECTIONS : cites
  SOURCE_DOCUMENTS ||--o{ SOURCE_VERSIONS : versions
  SOURCE_VERSIONS ||--o{ SOURCE_SECTIONS : contains
```

## Progression et SRS

```mermaid
erDiagram
  USER_ACCOUNTS ||--o{ ENROLLMENTS : owns
  USER_ACCOUNTS ||--|| USER_LEARNING_STATE : has
  USER_ACCOUNTS ||--o{ LESSON_PROGRESS : tracks
  LESSONS ||--o{ LESSON_PROGRESS : aggregates
  USER_ACCOUNTS ||--o{ LESSON_ATTEMPTS : performs
  LESSON_VERSIONS ||--o{ LESSON_ATTEMPTS : pins
  LESSON_ATTEMPTS ||--o{ EXERCISE_ATTEMPTS : contains
  EXERCISE_ATTEMPTS ||--o{ QUESTION_ATTEMPTS : contains
  QUESTION_VERSIONS ||--o{ QUESTION_ATTEMPTS : answers
  QUESTION_ATTEMPTS ||--o| MISTAKES : may_create
  USER_ACCOUNTS ||--o{ COMPETENCY_MASTERY : owns
  COMPETENCIES ||--o{ COMPETENCY_MASTERY : estimates
  FLASHCARDS ||--o{ REVIEW_ITEMS : schedules
  REVIEW_ITEMS ||--o{ REVIEW_EVENTS : produces
```

## Économie, récompenses et coffres

```mermaid
erDiagram
  USER_ACCOUNTS ||--o{ WALLETS : owns
  CURRENCY_DEFINITIONS ||--o{ WALLETS : denominates
  WALLETS ||--o{ WALLET_LEDGER : proves
  CATALOG_ITEMS ||--o{ INVENTORY : describes
  USER_ACCOUNTS ||--o{ INVENTORY : owns
  INVENTORY ||--o{ INVENTORY_EVENTS : proves
  REWARD_BUNDLES ||--o{ REWARD_COMPONENTS : contains
  USER_ACCOUNTS ||--o{ REWARD_GRANTS : receives
  REWARD_BUNDLES ||--o{ REWARD_GRANTS : instantiates
  CHEST_TYPES ||--o{ LOOT_TABLES : versions
  LOOT_TABLES ||--o{ LOOT_TABLE_ENTRIES : contains
  USER_ACCOUNTS ||--o{ CHEST_INSTANCES : owns
  CHEST_INSTANCES ||--|| CHEST_OPENINGS : opens_once
  CHEST_OPENINGS ||--o{ CHEST_REWARDS : reveals
  REWARD_GRANTS ||--o| CHEST_OPENINGS : credits
```

## Pulse IA

```mermaid
erDiagram
  USER_ACCOUNTS ||--o{ AI_CONVERSATIONS : owns
  AI_CONVERSATIONS ||--o{ AI_MESSAGES : contains
  AI_MESSAGES }o--o{ SOURCE_SECTIONS : cites
  USER_ACCOUNTS ||--o{ USER_MEMORIES : consents_to
  USER_MEMORIES ||--o{ MEMORY_EMBEDDINGS : embeds
  AI_CONVERSATIONS ||--o{ CONTEXT_SNAPSHOTS : uses
  USER_ACCOUNTS ||--o{ RECOMMENDATIONS : receives
  USER_ACCOUNTS ||--o{ ADAPTIVE_LEARNING_EVENTS : decisions
  AI_MESSAGES ||--o{ AI_SAFETY_EVENTS : checked_by
```

