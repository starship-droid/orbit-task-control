# ORBIT Task Control — Agent Guide

ORBIT is a sci-fi personal task manager: Astro shell + vanilla JS modules, SVG Saturn animation, localStorage persistence. No backend, no runtime framework.

Read `CLAUDE.md` for full architectural detail. This file is the condensed rule set for any AI agent contributing to this repo.

---

## Mandatory Rules

### 1. Branch per task

```bash
git checkout main && git pull
git checkout -b feature/short-description-XX   # XX = GitHub issue number
```

Never commit directly to `main`.

### 2. Commit message format

Every commit must include:
- Title ending with `(#XX)`
- Body line `Fixes #XX` (closes the GitHub issue on merge)
- Co-Authored-By footer

```
Title here (#XX)

Fixes #XX

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### 3. Bump the version on every commit

Update **both** files in the same commit:
- `package.json` → `"version"` field
- `src/pages/index.astro` → `<div class="s-version">vX.Y.Z</div>`

Bump rules:
- **Patch** (Z+1) — every commit, even minor fixes
- **Minor** (Y+1, Z=0) — significant new user-visible feature
- **Major** (X+1, Y=Z=0) — fundamental architecture change

---

## Architecture at a Glance

| File | Role |
|------|------|
| `src/js/taskStore.js` | `state` object, `save()` to localStorage |
| `src/js/taskModal.js` | All rendering + CRUD actions |
| `src/js/orbitRenderer.js` | Saturn SVG animation loop |
| `src/js/main.js` | Keyboard wiring + focus management |
| `src/styles/global.css` | All CSS (single file) |
| `src/pages/index.astro` | HTML shell + version display |

### Task shape
```js
{ text, done, id, subtasks: [{ text, done, id }], status: 'todo'|'inprogress', important }
```
Always normalise missing fields on read: `task.status || 'todo'`, `!!t.important`, `t.subtasks || []`.

### Saturn rings
- Inner ring (rx=158): `todo`
- Outer ring (rx=222): `inprogress`

---

## UI Principles

- **Keyboard-first** — every feature must work without a mouse.
- **Visual over verbal** — use glows, dots, auras, and animation before text labels.
- **Saturn view**: bold and theatrical (large glows, gold auras for priority, size difference for selected).
- **List view**: subtle and precise (7 px status dot, transparent ★ that fades in for priority, subtask connector lines).
- **Toasts** confirm actions; **particle bursts** celebrate them. Keep the space-mission theatre consistent.

---

## Adding a Shortcut

1. Key handler → `main.js` keydown block
2. Action function → `taskModal.js`
3. Shortcut display → `src/pages/index.astro` shortcuts panel
4. Context hint → `subHint` string in `updateTaskBox()` if task-context-sensitive

---

## Watch-outs

- SVG drawing order: append gold aura/ring *before* the planet body circle.
- Reset `state.selectedSubIdx = -1` whenever `state.selectedIdx` changes.
- `renderList()` = full DOM rebuild; `updateTaskBox()` = runs every frame, keep it cheap.
- Clearing inline `style` before applying a CSS class that uses `::before`.
- Version bump: both files, every commit.
