# Architecture du projet — Lyova Tâches

Application **React + TypeScript + Vite**, données dans **Supabase (PostgreSQL)**.
Organisation inspirée du **MVC**, en français, pour rester simple à reprendre.

```
src/
├── App.tsx              Point d'entrée de l'interface (assemble tout)
├── main.tsx             Démarrage React + service worker (PWA)
│
├── modele/              ── M (Modèle) : données + types ──
│   ├── types.ts         Tous les types TypeScript (Workspace, Board, Task, Document…)
│   ├── donnees.ts       Couche d'accès aux données (cœur) : espaces, membres,
│   │                    dossiers, bureaux, colonnes, tâches, documents, automatisations,
│   │                    notifications… Ré-exporte aussi les modules ci-dessous.
│   ├── statistiques.ts  Données des statistiques (useStatsData)
│   └── equipes.ts       Équipes, accès (périmètre/rôle), invitations, mentions, liens documents
│
├── vues/                ── V (Vue) : écrans complets ──
│   ├── Dashboard.tsx     Tableau de bord
│   ├── Kanban.tsx        Tableau Kanban (drag & drop)
│   ├── Documents.tsx     Traitement de texte (style Word)
│   ├── Stats.tsx         Statistiques
│   ├── Teams.tsx         Équipes & accès
│   ├── Trash.tsx         Corbeille (30 jours)
│   ├── Agenda.tsx · MyTasks.tsx · Archives.tsx · Automations.tsx
│
├── composants/          ── V (Vue) : composants réutilisables ──
│   ├── Header.tsx · Sidebar.tsx · TaskDrawer.tsx · SettingsPanel.tsx
│   ├── InviteWizard.tsx · AccessEditor.tsx · AIPanel.tsx · SearchModal.tsx
│   ├── LoginScreen.tsx · CreateFolderModal.tsx
│
├── controleur/          ── C (Contrôleur) : état + logique de l'appli ──
│   └── AppContext.tsx   État global (écran actif, bureau ouvert, thème…) + actions
│
└── outils/              ── Utilitaires transverses ──
    ├── supabase.ts      Client Supabase
    ├── cache.ts         Cache local (hors-ligne)
    ├── syncQueue.ts     File de synchronisation hors-ligne
    ├── dialog.tsx       Modales (confirm/prompt propres, sans pop-up natif)
    ├── richtext.tsx · status.ts · access.ts · boardIO.ts · sanitizer.ts
    ├── rate-limit.ts
    └── validation/      Validation (auth…)
```

## Repères rapides
- **Ajouter un écran** → un fichier dans `vues/`, branché dans `App.tsx`.
- **Ajouter une requête base de données** → une fonction dans `modele/` (le bon domaine).
- **Changer l'état global / une action** → `controleur/AppContext.tsx`.
- **Schéma de la base** → fichiers SQL dans `supabase/`.

> Note : `modele/donnees.ts` ré-exporte `statistiques.ts` et `equipes.ts`, donc tout
> s'importe simplement depuis `modele/donnees` (ou le sous-module précis).
