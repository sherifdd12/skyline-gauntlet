# Skyline Gauntlet — Cloud9 x JetBrains Hackathon 2026 (Category 3: Event Mini Game)

Deadline: **2027-01-12 11:00 PT** (= 22:00 Kuwait). Judging Jan 27 – Feb 3, winners ~Feb 8.
Prizes in category: $6,000 best / $2,000 runner-up. Bonus: $1,000 Best AI-Powered Workflow Story.

## What judges check (from Submission Specifics)
- Complete loop: start → play → clear end/score screen.
- Under 3 minutes per session, high replayability, no tutorial needed (mouse-only / single button).
- Booth-ready: resets cleanly between players, stays responsive under sustained use.
- Next level: tests a real competitive-gamer skill (aim/flick/reaction); **local live leaderboard on a
  separate monitor, works without Wi-Fi**.
- Criteria (equal): Tech use of JetBrains tools, Design (complete product), Impact (real problem for
  real audience), Idea novelty, Presentation (video ≤ 3 min).
- No Riot names/art. Original assets only. No copyrighted music.

## Concept
A 75-second "skill gauntlet" of three 20-second micro-rounds, mouse only:
1. **Flick** — targets appear anywhere; score = hits, speed, precision.
2. **Track** — keep cursor on a moving drone.
3. **Clutch** — reaction + decision: shoot only the enemy-colored targets, never the ally ones.
End screen: score, per-skill breakdown, a **skill profile** ("Flick specialist — top 12% today"),
rank on today's leaderboard, enter 3 initials (arcade style, filtered).

## Booth features (our differentiator)
- **Second-screen leaderboard**: open `/board` in another window on another monitor; synced live via
  BroadcastChannel + IndexedDB on the same PC — zero network.
- **Attract mode**: after idle, the game shows the top 10 + a demo loop; any click starts.
- **Auto reset**: idle timeout on every screen returns to attract mode; no state leaks between players.
- **Staff panel** (hidden shortcut + PIN): daily reset, export CSV, sound on/off, round length.
- **Offline PWA**: works with no internet after first load; also runnable from a USB stick.
- **Soak test**: automated bot plays thousands of sessions; we record FPS + memory stay flat (proof
  for "remains responsive during sustained use").

## Tech
TypeScript + Vite + Canvas 2D, no backend. Hosted free on GitHub Pages. MIT license.
Built in **WebStorm** (free non-commercial) with **JetBrains Air / Junie** + Claude; commit `.idea`.

## Who does what
- Claude: all code, assets (generated SVG/procedural), tests, README, write-ups, video script.
- Sherif: Devpost account + join hackathon (gets JetBrains codes within 5 business days), GitHub
  account, install WebStorm, open/run project in it, record the video, submit under his name.

## Milestones
1. Playable core loop + end screen (local).
2. Leaderboard + second screen + attract/reset + staff panel.
3. Polish: sound (procedural WebAudio), juice, accessibility, PWA offline.
4. Soak test + README + AI_SHOWCASE.md (bonus story).
5. GitHub repo + Pages deploy; video script; Devpost text. Submit early (by ~Jan 5).

## Status (2026-11-20)
- Done: playable loop, offline board, staff panel, soak test, sparks, NEW #1 banner, difficulty tuned
  from two human playtests (2,314 → 8,054; ratings 63/88/58), repo + Pages live, AI_SHOWCASE.md,
  SUBMISSION.md (description, methodology, video script).
- TODO when JetBrains codes arrive (to sherifdd@gmail.com): activate All Products Pack + AI Ultimate,
  then build at least one real feature through **JetBrains Air / Junie** inside WebStorm (the bonus
  prize counts only JetBrains IDEs, Junie or Air) and add it to AI_SHOWCASE.md + tooling section.
- Ideas: gamepad support, QR skill card, per-event theme, accessibility (color-blind safe ally marker
  already uses a check mark shape, not color only).
