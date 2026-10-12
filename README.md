# Log Monitor Dashboard

Dashboard de monitoring de logs en temps réel. L'application consomme un flux **Server-Sent Events (SSE)** (route `/logs/stream` de l'API) et affiche les logs reçus au fur et à mesure.

Objectifs & Fonctionnalités :

- **Performance** : Expérience fluide malgré les interruptions momentanées de l'API, virtualisation du DOM, lazy parsing.
- **UX** : Affichage clair et transparent permettant d'analyser rapidement les logs en fonction de différents filtres (recherche par texte, tri par niveau, par type de service), possibilité de filtrer par user id ou request id à la volée, affichage des détails d'un log avec la possibilité de copier le contenu brut d'un log. Gestion des interruptions réseaux et pause dans le streaming des logs.
- **Ingestion SSE optimisée** : statuts réseau en temps réel, pause/reprise sans couper la connexion, et reconnexion manuelle via un *circuit breaker*.
- **Rendu virtualisé** : via `react-virtuoso` pour supporter des milliers de lignes sans perte de framerate, avec auto-scroll intelligent.
- **Transparence UX** : les pertes de données (saturation mémoire ou coupure réseau) sont matérialisées par de faux logs injectés dans le flux.
- **Thèmes** : Light/Dark mode persistant (Tailwind).

---

## 🚀 Démarrage

### Prérequis
- **Node.js ≥ 20.19** (requis par Vite 8).

### Installation & exécution

Cloner le projet, se placer dans le répertoire du projet

```bash
npm install
npm run dev
```
L'application sera accessible sur **http://localhost:5173**.

### Scripts
- `npm run dev` : Lancement du serveur de développement.
- `npm run build` : Typecheck (`tsc -b`) puis build optimisé via Vite.
- `npm run preview` : Serveur local pour tester le build de production.
- `npm run lint` / `npm run lint:fix` : Analyse ESLint (correction automatique avec `:fix`).
- `npm run format` / `npm run format:check` : Formatage Prettier (vérification en CI).

> Note : Aucune variable d'environnement ou configuration CORS n'est nécessaire pour faire tourner le projet localement.

---

## 🏗 Architecture

L'application suit une architecture **Feature-Sliced Design (FSD)** simplifiée pour garantir la séparation des responsabilités (UI générique, logique métier, etc.).

- **`core/`** : Briques transverses (types partagés, contexte du thème).
- **`components/ui/`** : Primitives UI réutilisables et "dumb" (`Button`, `Badge`, `Drawer`, etc.).
- **`features/logs/`** : Le domaine métier, scindé en couches (`api`, `hooks`, `utils`, `components`).

### Cycle de vie de la donnée
La logique réseau est totalement découplée de React. `streamManager` (TypeScript pur) s'occupe de l'ingestion, tandis que `LogDashboard` se limite à l'orchestration des hooks.

```
EventSource.onmessage
   └─ string brute (zéro parsing) → pushRaw()
                                      │
                      flush (toutes les 300ms)
                                      ▼
   → parseBatch() (seulement sur les logs gardés en mémoire)
   → buildMarkers() (détection des trous / coupures)
   → onBatch({ logs, markers })
                                      │
   setLogs(prev => appendBatch()) ─── ▼ ─── useLogStream
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
           useLogMetrics                             useLogFilters
     (calcul des agrégats)                    (filtres, tri, virtualisation)
```

### Modèle de données
Les types se répartissent entre `src/core/types/index.ts` (transverses) et `src/features/logs/types.ts` (domaine). Le parsing du flux se limite à un `JSON.parse` en `LogEntry`, le reste (marqueurs de pertes, statuts) est géré côté client.

#### Types transverses (`core/types`)

```ts
type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'closed' | 'offline'
type SortOrder = 'asc' | 'desc'
```

- `ConnectionStatus` : état de la connexion SSE. `connecting` au démarrage, `connected` flux ouvert, `error` tentative échouée (retry en cours), `offline` disjoncteur ouvert (reconnexion manuelle requise), `closed` arrêt volontaire (`stop()`).
- `SortOrder` : sens du tri chronologique appliqué après filtrage.

#### Types du domaine (`features/logs/types.ts`)

**`LogLevel`** sévérité, sert au style, aux filtres et à l'ordre d'éviction.

```ts
type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical'
```

**`LogEntry`** un log applicatif tel que reçu du serveur (après `JSON.parse`).

| Champ | Type | Description |
|---|---|---|
| `id` | `string` | Identifiant unique ; sert au dédoublonnage dans `appendBatch`. |
| `timestamp` | `string` | Date ISO 8601, précision **microseconde** (`2026-10-11T23:48:37.868406Z`), gérée par `formatTimestamp`. |
| `level` | `LogLevel` | Sévérité de l'événement. |
| `service` | `string` | Service émetteur (alimente le filtre par service). |
| `message` | `string` | Message lisible. |
| `duration_ms` | `number` | Durée de l'opération en millisecondes. |
| `metadata` | `LogMetadata` | Métadonnées structurées (voir ci-dessous). |

**`LogMetadata`**  sous-objet de `LogEntry` ; cible des filtres à la volée.

| Champ | Type | Description |
|---|---|---|
| `request_id` | `string` | Corrélation de requête ; filtrable. |
| `user_id` | `number` | Utilisateur ; filtrable. |
| `http_status` | `number` | Code HTTP ; regroupé en `2xx` / `4xx` / `5xx`. |

**`LogGap`**  marqueur synthétique injecté dans le flux pour matérialiser une perte. Ce n'est **pas** un log serveur : il est créé côté client (`markerBuilder`).

```ts
type GapKind = 'evicted' | 'dropped' | 'disconnected'

interface LogGap {
  id: string          // id synthétique préfixé "gap-"
  isGap: true         // discriminant, cf. isGapEntry()
  kind: GapKind
  count: number       // nombre de logs concernés (0 pour une coupure réseau)
  timestamp: string
  durationMs?: number // renseigné pour 'disconnected' : durée de l'interruption
  breakdown?: Partial<Record<LogLevel, number>> // renseigné pour 'evicted' : répartition par niveau
}
```

| `kind` | Origine | Champs spécifiques |
|---|---|---|
| `dropped` | troncature du tampon à l'ingestion (rafale / pause) | `count` |
| `disconnected` | coupure réseau | `durationMs` |
| `evicted` | éviction mémoire (marqueur cumulatif) | `count`, `breakdown` |

**`LogItem`**  union réellement stockée et affichée.

```ts
type LogItem = LogEntry | LogGap

function isGapEntry(item: LogItem): item is LogGap {
  return (item as LogGap).isGap === true
}
```

`isGapEntry` est le garde de type discriminant : il permet de traiter les marqueurs à part (jamais filtrés, jamais évincés).

**Types de filtres**  état de la barre de contrôle.

```ts
type HttpStatusFilter = 'all' | '2xx' | '4xx' | '5xx'
type LogLevelFilter = LogLevel | 'all'
```

#### Contrats du moteur SSE (`features/logs/api/streamManager.ts`)

```ts
interface LogStreamBatch {
  logs: LogEntry[]
  markers: LogGap[]
}

interface LogStreamManagerOptions {
  url: string
  maxLogs?: number
  flushIntervalMs?: number
  maxReconnectAttempts?: number
  minReconnectDelayMs?: number
  maxReconnectDelayMs?: number
  onBatch: (batch: LogStreamBatch) => void   // appelé à chaque flush (jamais vide)
  onStatus: (status: ConnectionStatus) => void
}

interface LogStreamManager {
  start(): void
  stop(): void
  setPaused(paused: boolean): void  // n'agit que sur l'affichage, la connexion reste ouverte
  reconnect(): void                 // reconnexion manuelle (après ouverture du disjoncteur)
  clearBuffers(): void              // purge l'historique
}
```

- `LogStreamBatch` : unité livrée à chaque flush (logs parsés **+** marqueurs détectés).
- `LogStreamManagerOptions` : tout est injectable ; les valeurs par défaut sont les constantes documentées dans « Comportements détaillés ».
- `LogStreamManager` : contrat impératif consommé par les hooks (React n'entre jamais dans le moteur).

> Les hooks exposent également leurs propres interfaces de retour : `UseLogStreamResult`, `UseLogFiltersResult`, qui agrègent l'état, les setters et les valeurs dérivées (liste filtrée, métriques) consommés par les composants.

---

## Choix techniques

### 1. Performances & Rate Limiting
- **Lazy Parsing** : L'API `onmessage` empile uniquement des strings brutes. Le `JSON.parse` n'est exécuté que lors du flush (toutes les 300ms) et uniquement sur les éléments n'ayant pas été tronqués.
- **Throttling du rendu** : Les logs sont mis en mémoire tampon et injectés par lots. Quel que soit le débit du backend, l'application ne fera jamais plus de ~3 rendus par seconde.
- **Page Visibility API** : Si l'onglet passe en arrière-plan, le rendu React est mis en pause pour économiser le CPU/RAM, mais l'ingestion des chaînes brutes continue.

### 2. Gestion de la mémoire
- **Éviction intelligente** : La limite de l'historique est fixée à **5000 logs**. En cas de dépassement, la politique d'éviction sacrifie en priorité les logs de faible importance (`debug < info < warning...`), puis les plus anciens. Les erreurs critiques ne sont jamais jetées.

### 3. Résilience réseau
La reconnexion native d'`EventSource` est désactivée au profit d'un système custom :
- **Backoff exponentiel** : Délai de reconnexion progressif doublé à chaque échec (1s → 30s) pour ne pas solliciter l'API sans relâche.
- **Circuit breaker** : Au bout de **3 échecs consécutifs**, le système arrête d'essayer et bascule en mode `offline` (reconnexion manuelle requise).

---

## 🧭 Comportements détaillés

Cette section décrit pas à pas ce qui se passe, et avec quelles valeurs, dans les trois situations sensibles. Les constantes citées sont définies dans `src/features/logs/api/streamManager.ts` et `src/features/logs/utils/evictionPolicy.ts`.

### 1. Coupure réseau (perte de la connexion SSE)

| Constante | Valeur | Rôle |
|---|---|---|
| `MIN_RECONNECT_DELAY_MS` | `1000` (1 s) | Délai de base du backoff |
| `MAX_RECONNECT_DELAY_MS` | `30000` (30 s) | Plafond du backoff |
| `MAX_RECONNECT_ATTEMPTS` | `3` | Seuil d'ouverture du circuit breaker |

Déroulé :

1. `EventSource.onerror` se déclenche. La **reconnexion automatique native** du navigateur est désactivée (on ferme nous-mêmes la source) pour piloter le retry. Le statut passe à `error` (ou reste `connecting` au tout premier essai).
2. L'instant de début de coupure (`outageStartedAt`) est mémorisé s'il ne l'était pas déjà.
3. Le compteur d'échecs `attempt` est incrémenté.
4. Délai avant la prochaine tentative : `min(30 s, 1 s × 2^(attempt-1))`. En pratique : 1 s, puis 2 s, puis 4 s.
5. **Circuit breaker** : dès que `attempt > 3` (4ᵉ échec consécutif), plus aucune tentative automatique. Le statut passe à `offline` et un bouton rouge « Serveur hors ligne — Reconnecter » apparaît : la reconnexion devient **manuelle**.
6. À la reconnexion réussie (`onopen`), le compteur retombe à `0`, le statut repasse à `connected`, et un **marqueur de coupure** est injecté dans le flux avec la durée totale de l'interruption : `[HH:mm:ss.SSS] Connexion interrompue — rétablie après X`.

> Les marqueurs de coupure ne sont jamais filtrés ni évincés : l'interruption reste toujours visible.

### 2. Pause du flux (et onglet en arrière-plan)

| Constante | Valeur | Rôle |
|---|---|---|
| `FLUSH_INTERVAL_MS` | `300` (ms) | Cadence d'injection dans l'affichage |
| `MAX_LOGS` | `5000` | Taille maximale du tampon de chaînes brutes |

La pause **ne coupe pas** la connexion SSE : le flux continue d'arriver côté réseau. Seule l'**injection dans l'affichage** (le flush) est suspendue.

Déroulé :

1. Pause manuelle (bouton Pause) **ou** onglet masqué (`document.hidden`, via la Page Visibility API) → le flush ne pousse plus rien vers React. Le statut réseau reste `connected`.
2. Pendant la pause, `onmessage` continue d'empiler les chaînes brutes dans le tampon `incoming`, borné à `MAX_LOGS = 5000`. Au-delà, les plus anciennes chaînes non affichées sont **tronquées silencieusement** et comptabilisées comme `dropped`.
3. À la reprise, un flush **immédiat** est déclenché (sans attendre les 300 ms). Le tampon accumulé est parsé et injecté en un seul lot, et un **marqueur de pertes** est inséré s'il y a eu troncature : `[HH:mm:ss.SSS] N logs perdus à l'ingestion (rafale de données ou pause)`.

Repères UI tant que la pause est active : badge « Pause » dans la barre de contrôle et libellé « Flux en pause — réception en arrière-plan » au-dessus de la table.

### 3. Règles d'éviction mémoire

| Constante | Valeur | Rôle |
|---|---|---|
| `MAX_LOGS` | `5000` | Nombre maximal de logs conservés en mémoire |
| `LOG_LEVEL_PRIORITY` | `debug = 0 < info = 1 < warning = 2 < error = 3 < critical = 4` | Ordre de sacrifice (le plus bas part en premier) |

L'historique affiché est plafonné à **5000 logs**. Au-delà, on sacrifie des logs plutôt que de laisser grossir la mémoire et le DOM.

Déroulé de `appendBatch` à chaque flush :

1. **Dédoublonnage** par `id` : les logs déjà connus sont ignorés.
2. **Insertion des marqueurs** (pertes à l'ingestion, coupures réseau) en tête du lot.
3. **Éviction** (`evictOverflow`) si le total dépasse `MAX_LOGS` :
   - on classe les **vrais logs** par priorité croissante, puis par date (les plus anciens d'abord à priorité égale) ;
   - on retire les premiers de cette liste, à hauteur exacte du dépassement. Autrement dit : `debug` d'abord, puis `info`, etc. Les `error` / `critical` ne sont donc évincés **que** s'il n'y a pas assez de logs de priorité inférieure pour résorber le surplus ;
   - les **marqueurs ne sont jamais évincés**.
4. Un **marqueur d'éviction cumulatif** est inséré en tête : il **grossit** à chaque cycle au lieu de créer une nouvelle ligne, et indique la répartition par niveau : `[HH:mm:ss.SSS] N anciens logs supprimés pour préserver la mémoire (5 debug, 3 info, …)`.

Le compteur « Supprimés (mémoire) » de la barre de statistiques cumule évictions et pertes à l'ingestion (`evicted + dropped`).

---

## Qualité, Docker & CI

### Linting & formatting
- **ESLint** (config plate `eslint.config.js`) : `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`. Les règles de mise en forme sont désactivées au profit de Prettier via `eslint-config-prettier` (pas de conflit de règles).
- **Prettier** (`.prettierrc`) : `semi: false`, guillemets simples, 100 colonnes ; `.prettierignore` exclut `dist`, `node_modules`, etc.
- Scripts : `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`.

### Validation à l'exécution (Zod)
TypeScript ne protège pas des données JSON inattendues envoyées par le serveur. `parseBatch` (`src/features/logs/api/streamManager.ts`) valide donc chaque log avec un schéma **Zod** (`safeParse`) **avant de le stocker** : toute entrée non conforme au type `LogEntry` est écartée sans interrompre le traitement du lot. Une charge utile malformée ne peut donc pas casser l'application.

### Conteneurisation (Docker)
`Dockerfile` en prévision pour mise en production facilitée :
1. **build**  `node:24-alpine` : `npm ci` puis `npm run build` (produit `dist/`).
2. **runtime**  `nginx:1.27-alpine` : sert les fichiers statiques via `nginx.conf` (fallback SPA vers `index.html`, gzip, cache immuable sur `/assets`).

Le `.dockerignore` allège le contexte de build. Exemple :

```bash
docker build -t log-monitor-dashboard .
docker run --rm -p 8080:80 log-monitor-dashboard
# → http://localhost:8080
```

### Intégration continue (GitHub Actions)
`.github/workflows/ci.yml` s'exécute sur `push` et `pull_request` :
- **quality** : `npm ci` → `npm run lint` → `npm run format:check` → `npm run build` (Node 24) ;
- **docker** : build de l'image (sans push) pour valider le `Dockerfile`.

---

## 📦 Stack

| Technologie | Choix |
|---|---|
| Framework UI | React 19 + TypeScript (Strict) |
| Build & Dev | Vite 8 + Rolldown |
| Styles | Tailwind CSS v4 |
| Virtualisation | react-virtuoso |
| Validation runtime | Zod |
| Qualité de code | ESLint + Prettier |
| Conteneurisation | Docker (build Node → service Nginx) |
| CI | GitHub Actions |
| Icônes | lucide-react |

---

## 📁 Structure du projet

```
src/
├─ core/                     # Briques transverses
│  ├─ types/index.ts         # Types partagés
│  └─ theme/                 # Gestion du contexte du thème (clair / sombre)
├─ components/ui/            # Design system (Button, Badge, TextInput, Drawer...)
└─ features/logs/            # Feature domaine
   ├─ api/streamManager.ts   # Moteur SSE pur (sans React)
   ├─ hooks/                 # Logique métier React (Stream, Filtres, Métriques)
   ├─ utils/                 # Fonctions pures (Eviction, Marqueurs, Styles)
   └─ components/            # UI métier (Table, Row, StatsBar, ControlPanel...)
```
