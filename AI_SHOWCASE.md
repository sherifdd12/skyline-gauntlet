# AI-Powered Workflow Story: how one non-programmer shipped a booth game

**Skyline Gauntlet** was built by one person who does not write code, working with AI coding
agents inside the JetBrains toolchain. This is an honest account of how that worked: what the
humans did, what the agents did, and what we learned.

## The team

| Who | Role |
|---|---|
| **Sherif** (human) | Product owner. Picked the hackathon, played every build and reported back, made the calls, owns the accounts and the submission. |
| **Claude** (coding agent) | Lead engineer. Read the rules, designed the game, wrote all the TypeScript, ran the tests, and set up the repo and deployment. |
| **Junie** (JetBrains coding agent, run from **JetBrains Air** inside WebStorm) | Feature engineer. Built gamepad support end to end from one brief, with its own unit tests. |
| **WebStorm** | The project's home: opening, running and inspecting the code, Git integration, and the `.idea` settings committed here. |

## 1. Rules first, code second

Before writing a line of code, the agent read the official rules and the Category 3
"Submission Specifics" in full. It turned them into a checklist in [PLAN.md](PLAN.md).
Every judge requirement became a concrete feature:

| Judge requirement | Feature it became |
|---|---|
| "start → play → clear ending/score screen" | Attract mode → 3-2-1 → three 20 s rounds → results card → tag entry → saved |
| "resets cleanly between players" | Fresh state for every run; idle timeouts on every screen |
| "remains responsive during sustained use" | Built-in **soak test**: an autoplay bot with an FPS and heap readout |
| "local live leaderboard … without Wi-Fi" | IndexedDB + `BroadcastChannel` second-screen board, zero network |
| "showcase a useful gamer skill" | Flick, Track and Clutch rounds, each mapped to a 0–100 skill rating |
| Riot IP rules, no copyrighted music | Every visual drawn in code, every sound synthesized with WebAudio |

## 2. The first playable build in one session

The agent scaffolded a TypeScript + Vite project and wrote the core loop, the three rounds and
the offline leaderboard. It type-checked with `tsc --noEmit` and then **verified the build
itself**: it opened the game in a browser and started the autoplay bot. It confirmed a full
session (start → three rounds → results → save) and that the run appeared on `board.html`,
with no console errors.

## 3. The human playtest that changed everything

The bot is a superhuman player, so its scores said nothing about real people. The key moment
came when Sherif played with a mouse and sent a screenshot:

> **2,314 points** — Flick 27 · Track **4** · Clutch **5**
> "7% time on target", "8 threats · 17 escaped"

That was the data we needed. The agent read it as a difficulty problem, not a skill problem:
the drone moved at about 600 px/s and Clutch targets vanished too fast for a casual fan. It
retuned:

- Track: drone speed roughly halved, target radius 42 → 58, a gentler speed ramp.
- Clutch: targets live about 1.5× longer, spawn slower, and the escape penalty dropped from −50 to −30.
- Skill ratings: re-calibrated so a typical player lands at 50–70.

The second playtest, minutes later: **8,054 points, ratings 63 / 88 / 58.** Fun for a
first-timer, with room to climb. Track was now slightly too easy, so the agent steepened only
the late-round speed.

**Lesson:** the AI wrote the code, but only a human could say whether it was fun. The tight loop
of playtest screenshot → targeted change → push → live in a minute is the real productivity win.

## 4. Two agents, one codebase: Junie builds gamepad support

Booths often have controllers, not just mice. We used **JetBrains Air** in WebStorm to hand that
feature to **Junie** as a separate agent session, with one written brief. The brief named the files
(`src/main.ts`, not the scoring logic in `src/game.ts`), the API (the browser Gamepad API with no new
packages), and the acceptance checks (deadzone, edge-triggered shooting, idle-timer reset, initials
entry with the D-pad, `npm run build` must pass).

What Junie did, in about five minutes:

- Read the state machine, wrote a plan, then added `src/gamepad.ts`: a small, testable sampler
  (deadzone, delta-time movement, edge-triggered buttons, multiple pads, reconnects).
- Wired it into the main loop and the initials screen, added a "🎮 Controller connected" hint on the
  attract screen, and documented the controls in the README.
- Wrote `tests/gamepad.test.mjs` (3 tests, run with `npm test`) and confirmed that the build passed.

**Human-in-the-loop moments.** Air asked for approval before each shell command, so Sherif saw
every command first. The session also stopped once mid-task and was resumed with a one-line
follow-up. Junie itself noted that it had not tested with a physical controller.

**Cross-agent review.** Claude then reviewed Junie's diff line by line, re-ran the build and tests,
and drove the game in a browser with a simulated controller. It confirmed the connection hint
appears and that pressing A starts a run. Only after that was the change committed. One agent
builds and a second agent verifies, with a human approving each step.

## 5. Shipping

The agent also handled the release:

- Created the public GitHub repo with an MIT license and a README.
- Added a GitHub Actions workflow, so every push redeploys the game to GitHub Pages.
- Committed WebStorm's `.idea` project settings as evidence of the toolchain.

## 6. Iterating after submission: Ghost Duel and the skill card

After submitting, the team asked a harder question: what turns an aim test into an experience at the booth?
The agent proposed three ideas, and the human picked two:

- **Ghost Duel.** Every run records its crosshair path and running score. The next player races a translucent
  ghost of today's #1 on the same daily course, with a live lead or deficit. Unit tests cover the recorder,
  the interpolation and the daily seed. It was verified in the browser by letting the soak bot race its own ghost.
- **Take-home skill card.** After saving, a QR code opens a phone-sized card. The whole result is packed into the
  link fragment, so the booth PC stays offline and no personal data is stored anywhere.
- **Hands-free demo mode (`?demo=TAGS`).** It plays real sessions without the test overlay. The agent used it to
  record the new demo footage with headless Chrome, then cut it into the video with ffmpeg and a synthesized voice-over.

## 7. What worked and what didn't

**Worked**
- Asking the agent to restate the judging criteria as features *before* coding.
- A built-in autoplay bot. It doubled as a regression test and as proof of booth reliability.
- Short human playtests with screenshots. One screenshot was worth more than any spec.

**Didn't (at first)**
- Tuning difficulty from bot runs. Superhuman bots make every round look easy.
- Assuming "challenging" means "fun" at a booth. Fans waiting in line want a quick win first.

## Tools used

- **JetBrains Air + Junie** (JetBrains AI Ultimate): agent session that built gamepad support and its tests.
- **WebStorm**: project home, run and inspect, Git; `.idea` committed.
- **AI coding agent (Claude)**: design, implementation, testing, deployment.
- **GitHub + GitHub Actions + Pages**: open-source repo and always-live demo.
