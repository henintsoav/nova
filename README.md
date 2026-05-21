# NOVA — Esports Organization Platform

Site web d'une organisation esports avec espace membres sécurisé, système de disponibilités hebdomadaires et gestion de scrims.

---

## Stack technique

| Couche | Outil |
|---|---|
| Frontend | React 18 + Vite 8 |
| Routing | React Router v6 (HashRouter — compatible GitHub Pages) |
| Auth + DB | Supabase (auth email + PostgreSQL + RLS) |
| i18n | Contexte maison, JSON par langue |
| Style | CSS vanilla + custom properties (pas de Tailwind) |
| Déploiement | GitHub Pages via `gh-pages` |

---

## Lancer le projet

```bash
npm install
cp .env.example .env   # remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
npm run deploy         # build + push sur gh-pages
```

**Variables d'environnement (.env) :**
```
VITE_SUPABASE_URL=https://dlfciuoreomgdcbyusic.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key Supabase>
```

**Base de données :** exécuter `supabase/schema.sql` puis `supabase/migration_v2.sql` dans le SQL Editor de Supabase.

---

## Structure des fichiers

```
src/
├── main.jsx                        # point d'entrée React
├── App.jsx                         # routes (HashRouter)
├── lib/
│   ├── supabase.js                 # client Supabase singleton (null-safe si .env absent)
│   └── roles.js                    # utilitaires de rôles (getRoleGame, canCreateProposal…)
├── contexts/
│   ├── AuthContext.jsx             # session, profile, signIn/signUp/signOut, isAdmin
│   └── I18nContext.jsx             # { t, lang, switchLang }, localStorage 'nova_lang'
├── i18n/
│   ├── fr.js                       # traductions françaises (langue par défaut)
│   └── en.js                       # traductions anglaises
├── components/
│   ├── ui/
│   │   ├── Button.jsx / .css
│   │   ├── Card.jsx / .css
│   │   └── Modal.jsx / .css
│   ├── layout/
│   │   ├── Header.jsx / .css       # logo centré, nav gauche, langue + login droite
│   │   ├── Footer.jsx / .css       # liens sociaux, liens de nav
│   │   └── Layout.jsx / .css
│   └── auth/
│       ├── LoginForm.jsx / .css    # login + inscription avec sélection de rôle
│       └── ProtectedRoute.jsx      # redirige vers modale login si non connecté
├── pages/
│   ├── Home.jsx / .css             # landing : hero, stats, jeux, CTA
│   ├── esport/
│   │   ├── Esport.jsx / .css       # hub avec les 3 jeux
│   │   ├── LoL.jsx                 # roster + calendrier LoL
│   │   ├── WildRift.jsx            # roster + calendrier Wild Rift
│   │   ├── Valorant.jsx            # roster + calendrier Valorant
│   │   └── GamePage.css            # styles communs aux pages jeu
│   ├── visual/
│   │   └── Visual.jsx / .css       # portfolio équipe créative
│   ├── event/
│   │   └── Event.jsx / .css        # calendrier événements
│   └── scrims/                     # ⚠️ zone protégée (auth requise)
│       ├── Scrims.jsx / .css       # conteneur tabs, gestion accès par rôle
│       ├── Schedule.jsx            # scrims confirmés, filtré par jeu selon rôle
│       ├── WeeklyAvailability.jsx / .css  # grille 7j × 14h-24h, slots cliquables
│       ├── Proposals.jsx / .css    # propositions de scrim, accepter/refuser
│       └── Availability.jsx        # ancien système (per-scrim, conservé)
├── styles/
│   ├── variables.css               # tokens CSS (couleurs, radii, shadows, transitions)
│   └── global.css                  # reset, utilities (.container, .badge, .page…)
└── supabase/
    ├── schema.sql                  # schéma initial (profiles, scrims, availability)
    └── migration_v2.sql            # migration rôles + weekly_slots + proposals
```

---

## Système de rôles

| Rôle | Calendrier | Disponibilités | Propositions |
|---|---|---|---|
| `member` | ✗ | ✗ | ✗ |
| `member_lol` | LoL uniquement | Ses propres créneaux | Accepter/Refuser |
| `member_wr` | Wild Rift uniquement | Ses propres créneaux | Accepter/Refuser |
| `member_valo` | Valorant uniquement | Ses propres créneaux | Accepter/Refuser |
| `coach_lol` | LoL | Grille agrégée (comptage) | Créer + Accepter/Refuser |
| `coach_wr` | Wild Rift | Grille agrégée | Créer + Accepter/Refuser |
| `coach_valo` | Valorant | Grille agrégée | Créer + Accepter/Refuser |
| `staff` | Tous les jeux | Toutes les grilles | Créer (tous jeux) |

**Le rôle est choisi à l'inscription** (dropdown dans le formulaire signup) et sauvegardé via les métadonnées Supabase auth → trigger SQL → table `profiles`.

---

## Base de données (Supabase)

### Tables principales

**`profiles`** — extension de `auth.users`
- `user_id` UUID (FK auth.users)
- `username`, `display_name`, `avatar_url`
- `role` : `member_lol | member_wr | member_valo | coach_lol | coach_wr | coach_valo | staff | member`
- `main_game` : `lol | wildrift | valorant | null`

**`scrims`** — scrims confirmés
- `game`, `date`, `time`, `opponent`, `format`, `status`, `notes`, `created_by`
- Statuts : `scheduled | confirmed | completed | cancelled`

**`weekly_slots`** — disponibilités hebdomadaires
- `user_id`, `game`, `day_of_week` (0=Lun…6=Dim), `hour` (0-23)
- Unique par `(user_id, game, day_of_week, hour)`

**`scrim_proposals`** — propositions de scrim (coach/staff)
- `game`, `proposed_date`, `proposed_time`, `opponent`, `format`, `min_players`, `status`
- Statuts : `open | confirmed | cancelled`
- Auto-confirmation : quand `min_players` acceptations → scrim créé automatiquement

**`proposal_responses`** — réponses des joueurs
- `proposal_id`, `user_id`, `response` : `accepted | declined`
- Unique par `(proposal_id, user_id)`

### RLS (Row Level Security)
Toutes les tables ont RLS activé. Les politiques vérifient le rôle via `profiles` :
- Les membres voient uniquement les données de leur jeu
- Les coaches créent/modifient les propositions de leur jeu
- Le staff accède à tout
- Chaque utilisateur écrit uniquement ses propres données

---

## Internationalisation (i18n)

- **Langue par défaut** : Français
- **Langues disponibles** : FR / EN
- **Persistance** : `localStorage` clé `nova_lang`
- **Switcher** : header, à droite du logo, format `FR · EN`
- **Accès** : `const { t, lang, switchLang } = useI18n()`
- **Ajouter une langue** : créer `src/i18n/xx.js` + enregistrer dans `I18nContext.jsx`

---

## Fonctionnalités

### Pages publiques
- **/** — Landing page : hero, stats, cards jeux, CTA scrims
- **/esport** — Hub avec les 3 divisions (LoL, Wild Rift, Valorant)
- **/esport/lol** — Roster + calendrier League of Legends
- **/esport/wildrift** — Roster + calendrier Wild Rift
- **/esport/valorant** — Roster + calendrier Valorant
- **/visual** — Portfolio de l'équipe créative (filtrable par type)
- **/event** — Calendrier des événements (à venir / passés)

### Zone membres (`/scrims` — auth requise)
- **Onglet Calendrier** : scrims confirmés, filtrés par jeu selon le rôle. Coach/staff peuvent créer/modifier/supprimer.
- **Onglet Disponibilités** : grille 7 jours × 14h–24h. Cliquer pour marquer ses créneaux. Les coaches voient le comptage agrégé par créneau (intensité verte = plus de joueurs disponibles).
- **Onglet Propositions** : les coaches/staff créent des propositions de scrim. Les membres acceptent/refusent. Quand `min_players` acceptations sont atteintes, un scrim est automatiquement créé et confirmé.

---

## Conventions de code

- **CSS** : fichier `.css` par composant, importé directement. Custom properties depuis `variables.css`. Pas de CSS Modules.
- **Composants UI** : `Button`, `Card`, `Modal` dans `src/components/ui/` — réutilisables partout.
- **Auth** : toujours via `useAuth()`. Ne jamais appeler Supabase auth directement dans les pages.
- **Rôles** : toujours via les fonctions de `src/lib/roles.js`. Ne jamais coder les strings de rôles en dur dans les composants.
- **Traductions** : toujours via `useI18n()`. Aucun texte UI hardcodé dans les composants.
- **Routing** : HashRouter. Toutes les URLs sont `/#/path`.
- **Supabase** : le client est `null` si le `.env` est absent (pas de crash, auth désactivée).

---

## GitHub

- **Repo** : [github.com/henintsoav/nova](https://github.com/henintsoav/nova)
- **Branche principale** : `main`
- **Déploiement** : `npm run deploy` → branche `gh-pages`
