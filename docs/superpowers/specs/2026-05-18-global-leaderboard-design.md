# Leaderboard global — design

Date : 2026-05-18

## Objectif

Permettre d'enregistrer le meilleur score de chaque joueur sur un service en
ligne, et d'afficher un classement global. Contrainte directrice : **rester le
plus simple possible**.

## Décisions de cadrage

| Question | Choix |
| --- | --- |
| Infrastructure | Petit serveur custom hébergé par l'utilisateur |
| Identité des joueurs | Pseudo sans compte ; un identifiant généré est gardé sur l'appareil |
| Granularité | Deux classements séparés : Pioche 1 et Pioche 3 |
| Emplacement du serveur | Dossier `server/` dans ce dépôt (package.json séparé) |
| Déclenchement de l'affichage | GET à l'ouverture du sheet Classement uniquement |

## Principes

- **Opt-in total.** Le leaderboard est activé par une variable d'environnement
  de build, `VITE_LEADERBOARD_URL`. Si elle est absente : aucune entrée de
  menu, aucun appel réseau, le build web/natif se comporte exactement comme
  aujourd'hui.
- **Best-effort.** Toute opération réseau est non bloquante. Un échec est
  silencieux (loggé en dev seulement). Le jeu reste 100 % jouable hors-ligne ;
  le `bestScore` local du `statsStore` reste la source de vérité locale.
- **Pas d'anti-triche.** Pseudo sans compte = identité spoofable. C'est assumé.
  Le seul garde-fou est un token partagé pour empêcher les écritures
  anonymes depuis l'extérieur (voir Sécurité).

## Architecture

### Serveur — `server/`

Package Node + TypeScript autonome, isolé du build de l'app (son propre
`package.json`, pas inclus dans le bundle Vite/Capacitor).

- **Stack** : [Hono](https://hono.dev/) (micro-framework HTTP, dépendance
  unique) + `better-sqlite3` (base = un seul fichier, accès synchrone, zéro
  service à installer).
- **Base** : fichier SQLite (`leaderboard.db` par défaut, chemin
  configurable). Schéma — une seule table :

  ```sql
  CREATE TABLE IF NOT EXISTS scores (
    player_id  TEXT    NOT NULL,
    mode       INTEGER NOT NULL,           -- 1 ou 3
    name       TEXT    NOT NULL,
    score      INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,           -- epoch ms
    PRIMARY KEY (player_id, mode)
  );
  CREATE INDEX IF NOT EXISTS idx_scores_mode_score
    ON scores (mode, score DESC);
  ```

  Une ligne par `(player_id, mode)` : la table reste petite et le `GET` est
  trivial.

- **Routes** :

  - `POST /scores` — corps JSON `{ playerId, name, mode, score }`.
    *Upsert* qui conserve le **maximum** :

    ```sql
    INSERT INTO scores (player_id, mode, name, score, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(player_id, mode) DO UPDATE SET
      name       = excluded.name,
      score      = MAX(scores.score, excluded.score),
      updated_at = excluded.updated_at;
    ```

    Validation : `mode ∈ {1,3}`, `score` entier `≥ 0`, `name` non vide et
    tronqué à 24 caractères, `playerId` non vide. Réponse `204` en succès,
    `400` si invalide, `401` si token absent/incorrect.

  - `GET /leaderboard?mode=1|3` — renvoie le top 50 trié par `score DESC`,
    puis `updated_at ASC` (le plus ancien à égalité gagne le meilleur rang) :
    `{ entries: [{ playerId, name, score }, ...] }`. Réponse `400` si `mode`
    invalide.

- **Config** (variables d'environnement serveur) :
  - `PORT` — port d'écoute (défaut `8787`).
  - `DB_PATH` — chemin du fichier SQLite (défaut `./leaderboard.db`).
  - `LEADERBOARD_TOKEN` — token partagé exigé sur `POST /scores`.
- **CORS** : autoriser le `GET` et le `POST` depuis l'origine de l'app.

### Client — `src/leaderboard/`

Nouveau module, en dehors de `src/game/` (qui reste pur). Trois parties :

1. **Identité du joueur** — stockée dans le `settingsStore` existant (déjà
   persisté en IndexedDB) :
   - `playerId: string` — généré paresseusement via `crypto.randomUUID()` la
     première fois qu'un pseudo est défini.
   - `leaderboardName: string` — le pseudo. Vide par défaut.
   - Migration : `normalizeSettings` doit défaulter ces deux champs (`''`)
     pour les réglages déjà persistés, sans changer `schemaVersion`.

2. **Client d'API** — `src/leaderboard/api.ts` :
   - `isLeaderboardEnabled()` — `true` si `VITE_LEADERBOARD_URL` est définie.
   - `submitScore({ playerId, name, mode, score })` — `POST /scores` avec le
     header `Authorization: Bearer <VITE_LEADERBOARD_TOKEN>`. Best-effort :
     toute erreur est avalée.
   - `fetchLeaderboard(mode)` — `GET /leaderboard?mode=…`, renvoie
     `LeaderboardEntry[]` ou lève (le sheet gère l'état d'erreur).

3. **UI** :
   - **Saisie du pseudo** : un champ texte dans le sheet Réglages, libellé
     « Pseudo (classement) ». Tant qu'il est vide, aucune soumission n'a lieu.
     Définir un pseudo non vide alloue le `playerId` s'il n'existe pas encore.
   - **Sheet Classement** : nouveau sheet accessible depuis le menu (entrée
     masquée si `isLeaderboardEnabled()` est `false`). Deux listes — Pioche 1
     et Pioche 3 — chacune affichant rang / pseudo / score. La ligne du
     `playerId` courant est surlignée. États gérés : chargement, erreur
     réseau (avec bouton « Réessayer »), liste vide.

### Flux de données

**Soumission d'un score** (à la victoire) :

1. Le `Board` enregistre la partie via `recordGame` comme aujourd'hui.
2. Si le leaderboard est activé **et** qu'un pseudo non vide est défini, le
   `Board` appelle `submitScore` avec le **`bestScore` local du mode joué**
   (lu dans `statsStore`, pas le score brut de la partie).
   - Effet recherché : envoyer le meilleur score *de tous les temps* rend la
     soumission auto-réparatrice — une soumission ratée hors-ligne est
     rattrapée à la victoire en ligne suivante. Pas de file d'attente
     persistante à maintenir.
3. Le serveur fait l'upsert `MAX`. Aucun retour n'est attendu côté client.

**Consultation du classement** :

1. À l'ouverture du sheet Classement, déclencher `fetchLeaderboard(1)` et
   `fetchLeaderboard(3)`.
2. Afficher les deux listes ; surligner la ligne du joueur courant.
3. Aucun rafraîchissement automatique ; le sheet ne fetche qu'à l'ouverture.

## Gestion des erreurs

- `submitScore` : best-effort total. Échec réseau, `4xx`, `5xx` → avalé
  (loggé via `console.warn` en dev uniquement). Jamais de remontée à l'UI.
- `fetchLeaderboard` : en cas d'échec, le sheet affiche un message d'erreur
  et un bouton « Réessayer ». Le reste de l'app n'est pas affecté.
- `VITE_LEADERBOARD_URL` absente → `isLeaderboardEnabled()` renvoie `false`,
  l'entrée de menu est masquée et aucun appel n'est tenté.
- Serveur : entrée invalide → `400` ; token manquant/incorrect → `401`.

## Sécurité

- `POST /scores` exige `Authorization: Bearer <token>`. Le token est partagé
  (env serveur `LEADERBOARD_TOKEN`, env build client `VITE_LEADERBOARD_TOKEN`).
  But : bloquer les écritures anonymes, pas l'utilisateur déterminé — le token
  est embarqué dans le bundle client et reste donc extractible.
- `GET /leaderboard` est public (lecture seule).
- `name` tronqué à 24 caractères et `score` borné à un entier positif côté
  serveur pour éviter les valeurs aberrantes.
- Aucune protection anti-triche au-delà : choix assumé du « plus simple
  possible » avec une identité par pseudo.

## Tests

- **Serveur** : `POST` (upsert garde le max, validation, `401` sans token) et
  `GET` (tri, filtre par mode, `400` si mode invalide), sur une base SQLite
  en mémoire.
- **Client** : `api.ts` testé avec `fetch` mocké — `submitScore` avale les
  erreurs, `isLeaderboardEnabled` réagit à la variable d'env, `fetchLeaderboard`
  parse la réponse. Migration du `settingsStore` testée (champs défaultés).
- **UI** : test léger du sheet Classement (rendu des deux listes, état
  d'erreur), dans l'esprit de `Board.test.tsx`.

## Hors périmètre (YAGNI)

- Comptes, mots de passe, login social, multi-appareils.
- Synchronisation hors-ligne avec file d'attente persistante (l'auto-réparation
  via `bestScore` couvre le besoin).
- Classements par temps ou par nombre de coups (le besoin exprimé est le
  score).
- Pagination, rafraîchissement temps réel, classement amical/régional.
- Anti-triche, modération des pseudos.
