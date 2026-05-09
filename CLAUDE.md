# ORBIT Task Control — Claude Code Guide

## Project Overview

ORBIT is a sci-fi flavoured personal task manager built with **Astro + vanilla JS modules** (no runtime framework — all DOM manipulation is hand-rolled). It ships two views:

- **Saturn view** — tasks orbit a Saturn planet as glowing SVG spheres. The ring a task sits on encodes its status (inner = todo, outer = in-progress). The selected task snaps to the front of the ring with smooth animation.
- **List view** — a flat list with subtask connector lines and subtle status/priority indicators.

The aesthetic is deep-space mission control: `Space Mono` + `Orbitron` fonts, neon glows (cyan, teal, violet, gold), glass-morphism panels with corner brackets, a scanlines overlay, and animated starfield + nebula canvas. New interactions should feel like issuing commands from a starship bridge — bold in Saturn view, precise in list view.

Data is persisted to `localStorage` under the key `orbit-tasks`. There is no backend.

---

## File Map

```
src/
  pages/index.astro     — HTML shell; contains the version string in <div class="s-version">
  styles/global.css     — all CSS (single file)
  js/
    taskStore.js        — state object + localStorage save()
    taskModal.js        — all rendering (renderList, updateTaskBox) + all CRUD actions
    orbitRenderer.js    — Saturn SVG animation engine (requestAnimationFrame)
    main.js             — keyboard event wiring + focus management
package.json            — canonical version field
```

---

## Git Workflow — Required Every Session

### Before starting any work

```bash
git checkout main && git pull
git checkout -b feature/short-description-XX   # XX = GitHub issue number
```

Always work on a dedicated branch. Never commit directly to `main`.

### Commit message format

- **Title line**: short imperative phrase, ending with `(#XX)`
- **Body**: include `Fixes #XX` so GitHub auto-closes the issue when the PR merges
- **Footer**: always append the Co-Authored-By trailer

```
Add subtask continuation mode (#23)

Fixes #23

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Use a heredoc to avoid shell quoting issues:

```bash
git commit -m "$(cat <<'EOF'
Title here (#XX)

Fixes #XX

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Version Bumping — Required on Every Commit

Update **both** files every time, in the same commit as the feature:

| File | What to change |
|------|----------------|
| `package.json` | `"version": "X.Y.Z"` |
| `src/pages/index.astro` | `<div class="s-version">vX.Y.Z</div>` |

### Bump rules

| Change type | Bump |
|-------------|------|
| Every commit, even tiny fixes | **patch** Z+1 |
| Significant new user-visible feature | **minor** Y+1, reset Z to 0 |
| Fundamental architecture change | **major** X+1, reset Y and Z to 0 |

Never commit without a version bump. The version number in the UI is a quick sanity check that the deployed build has the latest changes.

---

## Task Data Model

```js
{
  text:      string,
  done:      boolean,
  id:        number,      // Date.now()
  subtasks:  [{ text, done, id }],
  status:    'todo' | 'inprogress',
  important: boolean,
}
```

When reading tasks from localStorage or importing JSON, always normalise missing fields:
- `task.status || 'todo'`
- `!!t.important`
- `t.subtasks || []`

This ensures backward compatibility when new fields are added.

---

## Saturn Ring Layout

```
CX = 350, CY = 230          — planet centre in the 700×460 SVG viewBox
RING_TILT = -0.18 rad       — applied to all ellipses for the tilted-ring look

STATUS_RINGS:
  todo        rx=158  ry=40   col: rgba(77,201,255,…)   — inner ring (closest to planet)
  inprogress  rx=222  ry=56   col: rgba(0,255,204,…)    — outer ring
```

Task planets sit at their ring's `(rx, ry)` ellipse. SVG drawing order matters: elements appended later appear in front. The correct order per task is:

1. Gold aura circle (behind planet body)
2. Gold ring outline (behind planet body)
3. Planet glow halo
4. Planet body circle
5. ✓ checkmark or ★ star text (on top)

---

## Adding a New Keyboard Shortcut

1. Add the key handler in `main.js` inside the `keydown` switch/if block.
2. Implement the action in `taskModal.js` (or add it there if new).
3. Add the shortcut to the panel in `src/pages/index.astro`:
   ```html
   <div class="shortcut"><span class="key">X</span> Description</div>
   ```
4. If the shortcut is context-sensitive to the selected task, update the `subHint` string in `updateTaskBox()` in `taskModal.js`.

---

## UI / UX Philosophy

### Always keyboard-first

Every feature must be fully operable without a mouse. Mouse click support is additive, not primary.

### Visual language over text labels

- Use dots, glows, auras, animations, and colour before reaching for words.
- Toasts confirm actions; particle bursts celebrate completions. Keep the visual theatre consistent.
- Status in list view: a 7 px dot (hollow for todo, solid pulsing teal for in-progress). No text.
- Priority in list view: a gold ★ that fades in with a glow — always in the DOM (transparent when unset) so the row height never shifts.

### Saturn view — be bold

Selected planets are larger (r=11 vs r=8) with `selectedGlow` filter. Important tasks get a gold aura circle (r+16, `selectedGlow`), a gold ring outline (r+8), and a ★ floated above. Status is communicated entirely by ring position — inner vs outer orbit.

### List view — be subtle

Subtasks are indented as separate `.subtask-row` DOM elements with a `.subtask-connector` line and `.subtask-dot`. The highlight bar (`#sel-highlight`) tracks the selected row via `top`/`height` CSS, not class toggling — this allows smooth transitions.

### Colour palette

| Role | Hex |
|------|-----|
| Neon violet | `#b060ff` |
| Cyan | `#4dc9ff` |
| Teal | `#00ffcc` |
| Orange | `#ff9d3d` |
| Pink | `#ff5cf7` |
| Gold (priority) | `#ffc857` |
| Danger | `#ff4d6d` |
| Deep space bg | `#050314` |

---

## Common Pitfalls

**SVG drawing order** — elements appended later are in front. Gold aura/ring must be appended *before* the planet body, or the planet will cover them.

**`state.selectedSubIdx`** — always reset to `-1` when changing `state.selectedIdx`. j/k navigate tasks and clear sub-selection; Arrow Up/Down navigate subtasks within the current task.

**`renderList()` vs `updateTaskBox()`** — `renderList()` does a full DOM rebuild (call it after any mutation and on view switch). `updateTaskBox()` runs every animation frame — keep it cheap; only rebuild the subtask DOM when the `subsKey` cache key changes.

**CSS `::before` pseudo-elements** — they only work correctly when there is no conflicting inline `style`. When activating a class like `.priority`, clear the corresponding inline `borderColor` and `boxShadow` first so the class rules take effect.

**Both version files** — `package.json` AND `src/pages/index.astro`. Missing one is the most common version-bump error.

**`STATUS_CYCLE` guard on import** — when importing tasks, filter `status` through `STATUS_CYCLE.includes(t.status) ? t.status : 'todo'` to reject stale or invalid values.
