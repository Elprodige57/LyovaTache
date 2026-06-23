# PROMPT À EXÉCUTER DEMAIN — Équipes · Invitations · Accès · Notifications

> Bloc **base de données** (reporté au 2026-06-24). À coller tel quel pour reprendre.
> Référence visuelle imposée : `C:\Users\mehad\Downloads\invite_acces_wizard.html` (wizard 4 étapes).
> App : React + Vite + TypeScript + Supabase, espace = `workspace`. NE PAS toucher au `.env` (ignoré).
> Règle d'or du projet : **aucune donnée factice**, modales web propres (pas de `confirm`/`prompt` natifs — utiliser `src/lib/dialog.tsx`).

---

## 1. Objectif fonctionnel (mots de l'utilisateur, reformulés)

1. **Équipes par service** : créer des équipes (Dev, Design, Support… « équipe 1, 2, 3 »), y ranger des personnes par service.
2. **Côté admin** pour faire rejoindre quelqu'un :
   - chercher un **email déjà dans la base** (autocomplétion sur les membres existants), **ou** inviter un **nouvel email**.
3. **Ajouter une personne à l'espace** :
   - par défaut → **accès à tous les dossiers** de l'espace ;
   - ou accès **restreint** à certains **dossiers** ;
   - ou accès **restreint** à certains **tableaux** seulement.
4. **Rôles** (RBAC) : Membre / Éditeur / Observateur.
5. **Taguer des personnes** sur une tâche et **leur envoyer une notification** sur leur espace perso.
6. Le wizard envoie (option cochée) une **notification in-app + email**.

---

## 2. Schéma SQL à ajouter (migration `supabase/teams_access.sql`)

```sql
-- Équipes (services)
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  service text,                       -- "Développement", "Design", "Support"…
  color text not null default '#5b50e8',
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  primary key (team_id, member_id)
);

-- Accès d'un membre à l'espace : périmètre + rôle
create table if not exists member_access (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  scope text not null default 'full'          -- 'full' | 'folders' | 'boards'
    check (scope in ('full','folders','boards')),
  role text not null default 'member'         -- 'member' | 'editor' | 'viewer'
    check (role in ('member','editor','viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, member_id)
);

create table if not exists member_folder_access (
  member_id uuid not null references members(id) on delete cascade,
  folder_id uuid not null references folders(id) on delete cascade,
  primary key (member_id, folder_id)
);

create table if not exists member_board_access (
  member_id uuid not null references members(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  primary key (member_id, board_id)
);

-- Invitations par email (personnes pas encore dans la base)
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('member','editor','viewer')),
  scope text not null default 'full' check (scope in ('full','folders','boards')),
  folder_ids uuid[] default '{}',
  board_ids uuid[] default '{}',
  message text,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Mentions sur tâche (tag + notif)
create table if not exists task_mentions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now()
);
```

**RLS** : activer sur chaque table + une policy ouverte à `anon, authenticated` (même schéma que `setup_full.sql`, via la boucle DO-block déjà utilisée), pour rester en mode démo. L'enforcement fin des rôles se fait d'abord **côté client** (MVP) ; durcissement RLS par rôle = étape ultérieure.

---

## 3. Logique d'accès (résolution)

Fonction utilitaire `accessibleBoardIds(member, folders, accessRows)` :

- `scope = 'full'` → **tous** les `board.id` de l'espace.
- `scope = 'folders'` → tous les tableaux des `member_folder_access.folder_id`.
- `scope = 'boards'` → exactement `member_board_access.board_id`.

À appliquer comme **filtre** dans `useFolders` / `useStatsData` / la Sidebar pour la personne connectée (sauf rôle **Propriétaire/Admin** = voit tout).

Rôles :
- **Observateur (viewer)** : lecture seule → masquer tous les boutons créer/éditer/supprimer.
- **Membre (member)** : CRUD tâches dans son périmètre.
- **Éditeur (editor)** : + gérer colonnes + inviter.

---

## 4. UI à brancher (calquée sur `invite_acces_wizard.html`)

Composant React `InviteWizard.tsx` (modale), ouvert depuis **Paramètres → Compte/Membres** et depuis un nouveau **panneau Admin → Équipes**.

**Étape 1 — Qui** : onglet « Une personne » / « Un groupe (équipe) ».
- Recherche personne = requête `members` de l'espace (autocomplétion email/nom, **vrais membres**).
- Recherche groupe = liste des `teams`.
- « ou inviter par email » → crée une `invitation` si l'email n'existe pas dans `members`.
- Multi-sélection (pills).

**Étape 2 — Périmètre** : 3 cartes radio → `full` / `folders` / `boards`.
- `folders` → liste réelle des `folders` (avec nb de tableaux).
- `boards` → grille réelle des `boards` (dossier + couleur).

**Étape 3 — Rôle & détails** : 3 cartes radio (member/editor/viewer) + message libre + case « envoyer une notification ».

**Étape 4 — Récap** + bouton Confirmer → **persistance réelle** :
- membre existant → upsert `member_access` (+ `member_folder_access` / `member_board_access`).
- email inconnu → insert `invitations` (status `pending`).
- équipe → appliquer l'accès à **tous** ses `team_members`.
- si case cochée → insert `notifications` (member_id ciblé) **et** appel Edge Function email.

---

## 5. Email (test vs réel)

Edge Function Supabase `send-invite` (Resend ou SMTP) :
- **Mode test** : envoyer à `leprodige57@gmail.com`.
- **Mode réel** : envoyer à l'email du profil de la personne (modifiable dans son profil).
- Variable d'env `INVITE_TEST_MODE=true|false` côté fonction.

---

## 6. Notifications « espace perso »

- Réutiliser la table `notifications` (a déjà `member_id`).
- **Tag sur tâche** = insert `task_mentions` + insert `notifications` (`member_id` = taggé, message « X t'a tagué sur la tâche … »).
- La vue Notifications existante filtre déjà par membre connecté → rien à recâbler côté lecture.

---

## 7. Critères d'acceptation

- [ ] Créer/éditer/supprimer une équipe ; y ajouter/retirer des membres.
- [ ] Wizard 4 étapes fidèle au modèle ; persistance réelle (pas de mock).
- [ ] Inviter un email **existant** (autocomplété) **et** un **nouvel** email (invitation pending).
- [ ] Accès `full` / `folders` / `boards` réellement appliqué au filtrage (Sidebar, dossiers, stats).
- [ ] Rôle viewer = lecture seule effective.
- [ ] Tag sur tâche → notification reçue dans l'espace perso de la personne.
- [ ] Email test → `leprodige57@gmail.com` ; réel → email profil (modifiable).
- [ ] `npx tsc --noEmit` + `npm run build` OK.

---

## 8. Ordre d'exécution conseillé

1. Migration SQL (section 2) sur la base Supabase de l'utilisateur (projet `omommpatezyyoqxdyael`) — **demander confirmation avant d'exécuter sur la prod**.
2. Hooks `useTeams`, `useMemberAccess`, `useInvitations` + CRUD dans `useData.ts`.
3. `InviteWizard.tsx` (les 4 étapes) + panneau **Admin → Équipes**.
4. Filtrage d'accès dans `useFolders`/Sidebar/`useStatsData`.
5. Tag sur tâche → `task_mentions` + notification (dans `TaskDrawer.tsx`).
6. Edge Function `send-invite` (email test/réel).
7. Typecheck + build + commit.
