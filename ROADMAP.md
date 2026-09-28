# ORBIT Multi-Platform Roadmap

Personal reference doc — captures the plan agreed on so it survives even if
the chat that produced it is lost. Update this as decisions change; don't
let it go stale.

## Vision

ORBIT becomes the single personal system for tasks + habits, present as:
- **macOS app** (native, with real Notification Center widgets)
- **Android app** (native, with home-screen widgets)
- **Web app** (existing Netlify site stays as the browser fallback)

All three share the same synced data — not per-device localStorage.

## Environment

- Primary dev machine: a MacBook running **UTM** with a Fedora Linux VM.
  Claude Code runs inside the Fedora VM.
- Fedora VM can build/test: the Astro/JS core, Tauri's Linux/web targets,
  and the **full Android app** (Android SDK/Gradle/emulator all run fine
  on Linux).
- Anything touching Apple's frameworks (Xcode, WidgetKit, SwiftUI-for-widgets,
  AppKit, code signing/notarization) **requires the macOS host** — Xcode
  doesn't run on Linux and there's no viable workaround. Swift-the-language
  runs on Linux, but the frameworks needed here don't.
- Workflow for macOS-specific work: develop/write code in Fedora, commit +
  push to GitHub, pull on the macOS host, build/run/test in Xcode there,
  report errors back for fixes.
- A shared folder between the Mac host and the Fedora VM is set up as a
  faster alternative to git round-trips for local testing (see setup notes
  below) — optional, git pull works fine too.

## Sequencing (do not reorder without reason)

**1. Habit tracking (current branch: `feature/habit-tracking`)** — ✅ built
- Built as a *new view inside ORBIT* (Nebula view) — not a separate app.
  One codebase, `orbit-habits` localStorage key alongside `orbit-tasks`.
- **Visual concept finalized**: nebula/constellation hybrid. Each habit is
  its own constellation (a "mystery" — check-in star positions are
  deterministic-hash-generated, not user-arranged) inside one shared,
  pannable/zoomable nebula canvas. Colour is the one thing the user
  deliberately picks per habit (`C` cycles it); shape never is.
- Views now cycle forward-only via Shift+Tab: saturn → list → nebula → saturn.
- See CLAUDE.md's "Habit Data Model" and File Map sections for the
  implementation (`habitModal.js`, `nebulaRenderer.js`).
- **Next up: Black Hole.** A shared trash/undo system for both tasks and
  habits — deleting either currently discards it immediately (matches how
  task deletion already worked). The user's idea: deleted items visually
  float in a "black hole" area instead of vanishing, and can be restored
  from there. Deliberately deferred out of the nebula-garden build to keep
  that session focused — plan this as its own feature, touching task
  deletion too (not just habits) since it's a shared mechanism.

**2. Backend + auth (Netlify DB + Netlify Functions)**
- Moved earlier than originally planned: multi-device (Mac + Android + web)
  needs synced data, so this can't be deferred to "later" anymore.
- Netlify DB (Turso/SQLite-backed) + a small Functions API layer for
  read/write of tasks + habits.
- Auth: solo/personal use, so a hardcoded API key is sufficient — no need
  for full multi-user auth unless sharing with others later.

**3. Tauri 2.0 shell (macOS app + Android app)**
- Tauri 2.0 unified desktop + mobile targets — one Astro/JS frontend
  builds to macOS, Android, and stays a web app.
- Both native apps talk to the Netlify Functions API (not local files),
  so data is always in sync across devices.
- Gives real system notifications, menu bar presence (macOS), persistent
  window, on both native platforms.

**4. Native OS widgets (last — can't be done cross-platform)**
- **macOS**: Swift + WidgetKit extension. Thin, read-only view over the
  same backend API. Must be built/signed on the macOS host via Xcode.
- **Android**: Kotlin + Glance/RemoteViews widget. Also thin/read-only.
  Can be built and tested directly in the Fedora VM — no Mac needed.

### Anti-patterns to avoid
- Don't build Tauri before the backend exists — you'd migrate
  localStorage → files → database twice for nothing.
- Don't try to hand-roll true desktop/home-screen widgets via a
  cross-platform tool — WidgetKit and Android widgets both require native
  code, there's no shortcut.

## UTM Shared Folder — setup notes

Fedora VM already has the guest-side config in `/etc/fstab`:
```
share   /mnt/macos    9p    trans=virtio,version=9p2000.L,rw,_netdev,nofail   0 0
/mnt/macos  /media/share  fuse.bindfs  map=501/1000:@20/@1000,x-systemd.requires=/mnt/macos  0 0
```
(`501/1000:@20/@1000` maps macOS UID 501 (default first user) / group 20
(`staff`) to the Fedora `fedora` user UID/GID 1000 — adjust if your Mac
user isn't UID 501.)

This currently fails to mount (`special device share does not exist`)
because UTM isn't presenting the share yet. To fix, **on the macOS host**:

1. Open UTM, select the Fedora VM, shut it down if running.
2. Edit the VM → **Sharing** tab.
3. Set **Directory Share Mode** to `VirtFS` (matches the `share` tag
   already in fstab — don't rename it, or update fstab to match).
4. Pick/create a folder on the Mac to share (e.g. a dedicated
   `~/orbit-share` folder).
5. Save, start the VM.
6. Back in Fedora: `sudo mount /mnt/macos` (or reboot) — it should mount
   using the existing fstab entry, then appear (UID-mapped) at
   `/media/share`.

## Where this stands (last updated 2026-07-24)

- On `feature/habit-tracking`: Nebula view (habit tracking) is built —
  add/select/check-in/edit/delete/recolour habits, streak + total-count
  display, pan/zoom canvas with keyboard-driven camera (`j`/`k` recenters,
  `Z` zooms to fit). Version bumped to 0.6.0.
- Black Hole (trash/undo for tasks + habits) is the next planned feature —
  not started yet.
- Shared folder is confirmed working (`/media/share` mounted both ways).
- Netlify DB / Tauri / widgets: not started, sequenced above.
