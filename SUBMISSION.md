# Devpost submission kit (drafts)

## Project name
Skyline Gauntlet

## Elevator pitch (≤ 200 chars)
A 60-second aim gauntlet for the Cloud9 booth: Flick, Track, Clutch. Every fan leaves with a skill profile and a spot on an offline live leaderboard.

## Category
Category 3: Event Mini Game

## Links
- Live demo: https://sherifdd12.github.io/skyline-gauntlet/
- Leaderboard screen: https://sherifdd12.github.io/skyline-gauntlet/board.html
- Repo: https://github.com/sherifdd12/skyline-gauntlet
- Bonus (AI workflow story): https://github.com/sherifdd12/skyline-gauntlet/blob/main/AI_SHOWCASE.md
- Video: https://youtu.be/yrsl56O2jBU

## Text description
**Inspiration.** Booth lines are long and attention spans are short. We wanted something any fan
can play in about a minute that still feels like esports: real aim skills, a score worth
bragging about, and a big screen that makes the line want to beat the top score.

**What it does.** Three 20-second rounds, mouse only:
1. **Flick**: hit targets that appear anywhere. Faster hits are worth more, and targets shrink over the round.
2. **Track**: keep your crosshair on a drone that speeds up.
3. **Clutch**: shoot orange threats and never hit blue allies. Speed under pressure, plus judgment.

Each player gets a total score, a 0–100 rating per skill, a title (Flick Specialist, Tracking
Machine, Clutch Brain, All-Rounder, Complete Pro), today's rank and percentile, and an arcade-style
3-letter tag. Beating the day's best triggers a **NEW #1 TODAY!** celebration.

**Booth-ready by design.**
- **Offline live leaderboard on a second monitor**: `board.html` updates instantly via
  BroadcastChannel and IndexedDB on the same PC, with no Wi-Fi or server.
- **Clean reset**: fresh state every run, and idle timeouts on every screen return the game to attract mode.
- **Attract mode** with today's top 5.
- **Staff panel** (Ctrl+Shift+S + PIN): reset the day, export CSV, toggle sound, open the board, run the soak test.
- **Soak test**: an autoplay bot plays sessions back to back with an FPS and heap readout, to prove sustained responsiveness.
- **No licensing risk**: every visual is drawn in code and every sound is synthesized. No third-party assets, no Riot content.

**How we built it.** TypeScript + Vite + Canvas 2D, no backend. Developed in WebStorm, with an AI
coding agent writing the implementation and a human playtester driving the tuning (see AI_SHOWCASE.md).

**Challenges.** Difficulty tuning. Our first human playtest scored 4/100 on Track. Bots make
everything look easy, so we retuned from real human data until a first-timer landed at 50–70.

**Controllers welcome.** Mouse or gamepad: left stick aims, A or the right trigger shoots, and the D-pad enters your tag.

**What's next.** A per-event branded theme, and a QR "skill card" fans can take home.

## Methodology write-up (short)
We turned the Category 3 judging notes into a feature checklist before coding. These were: a
complete loop, under 3 minutes, intuitive controls, clean reset, sustained responsiveness, a
useful gamer skill, and an offline local leaderboard. Each round isolates one competitive-FPS
skill (flick, tracking, target discrimination), and per-skill ratings turn a score into
feedback. Reliability is enforced in code (idle resets, fresh state per run) and proven with a
built-in soak test. The leaderboard uses only browser storage and same-machine messaging, so the
booth keeps working without connectivity.

## Tooling explanation
- **WebStorm**: the project's IDE: opening, running and inspecting the TypeScript/Vite project,
  Git integration. Project settings (`.idea`) are committed.
- **JetBrains Air + Junie**: we launched a Junie agent session from Air inside WebStorm with one
  written brief. Junie built optional gamepad support (`src/gamepad.ts`, main-loop and
  initials-screen wiring, README) and wrote unit tests (`npm test`). Every shell command required
  approval in Air.
- **Claude (coding agent)**: wrote the core game and deployment, then reviewed Junie's diff and
  verified it with the build, tests and a simulated controller in the browser before committing.

## Video script (target 2:30)
| Time | On screen | Voice-over / caption |
|---|---|---|
| 0:00–0:15 | Attract screen, then click | "Booth lines are long. Fans have a minute. Skyline Gauntlet turns that minute into an esports skill test." |
| 0:15–0:35 | Flick round | "Round one, Flick: hit targets fast. Speed scores more, and targets shrink." |
| 0:35–0:55 | Track round | "Round two, Track: stay on the drone as it speeds up." |
| 0:55–1:15 | Clutch round | "Round three, Clutch: orange are threats, blue are allies. Hit an ally and you pay." |
| 1:15–1:35 | Results card, tag entry | "Every fan gets a skill profile, today's rank, and a tag." |
| 1:35–1:55 | Second window: board.html updating live | "A second monitor shows today's top 10, updating instantly, with no Wi-Fi." |
| 1:55–2:15 | Staff panel; soak test HUD running | "Staff tools: reset, export, mute. And a built-in soak test proves it stays smooth for hours." |
| 2:15–2:30 | WebStorm: the Air session where Junie built gamepad support, then the GitHub repo | "Built in WebStorm. Junie, run from JetBrains Air, added controller support, and a second agent reviewed it. Open source, MIT." |

Recording tip: use the free Xbox Game Bar (Win+G) or OBS, 1080p. Music: none, or a royalty-free
track you have rights to.
