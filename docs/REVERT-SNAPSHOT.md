# Revert snapshot — Phase 2 plug-and-play

Created before Phase 2 rollout. Use these commits to restore pre-change state.

| Repo                        | Branch | Commit    | Revert command                                                        |
| --------------------------- | ------ | --------- | --------------------------------------------------------------------- |
| trg-site                    | main   | `6971a87` | `git checkout pre-phase2-plug-and-play` or `git reset --hard 6971a87` |
| seo-dashboard-platform      | main   | `9e34c3b` | `git reset --hard 9e34c3b` (note: may have local WIP)                 |
| michael-the-homebuyer-astro | master | `047631e` | `git reset --hard 047631e`                                            |
| ibuyuglyhouses-astro        | main   | `c97c6fa` | `git reset --hard c97c6fa`                                            |
| mtcrenovations-astro        | main   | `851ef17` | `git reset --hard 851ef17`                                            |
| canadianSmartSavingsWebsite | master | `1e74e95` | `git reset --hard 1e74e95`                                            |

**Git tag (trg-site only):** `pre-phase2-plug-and-play` → `6971a87`

Phase 1 tag (earlier): `pre-ponytail-phase1` → `c3d5fdb`

After Phase 2 commits land, record new SHAs below.

## Phase 2 commits (2026-06-30)

| Repo                        | Commit    | Message |
| --------------------------- | --------- | ------- |
| trg-site                    | `1ffaecf` | docs: plan + revert snapshot |
| seo-dashboard-platform      | `abc7610` | feat(phase2): industry profiles, keywords, CE links |
| michael-the-homebuyer-astro | `33f66bd` | docs: Ponytail Phase 2 |
| ibuyuglyhouses-astro        | `5b6231b` | docs: Ponytail Phase 2 |
| mtcrenovations-astro        | `3772d4f` | docs: Ponytail Phase 2 |
| canadianSmartSavingsWebsite | `bf105eb` | docs: Ponytail Phase 2 |
