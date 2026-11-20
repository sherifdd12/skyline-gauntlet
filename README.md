# Skyline Gauntlet

A 60-second aim gauntlet built for the **Cloud9 booth**. Three 20-second rounds test three
real competitive-FPS skills, then every player gets a skill profile and a spot on a live
leaderboard on the booth's second screen. **No Wi-Fi needed.**

> Entry for **Cloud9 x JetBrains: Sky's The Limit Hackathon 2026**, Category 3 (Event Mini Game).

## The rounds

| Round | Skill | How it works |
|---|---|---|
| **Flick** | Flick aim and reaction | Click each target as it appears. Faster hits score more. Targets shrink over the round. |
| **Track** | Smooth tracking | Keep the crosshair on a drone that speeds up. Points build up while you stay on it. |
| **Clutch** | Target discrimination under pressure | Shoot orange threats before they escape. Hitting a blue ally costs 200 points. |

At the end, each player sees a total score, a 0–100 rating per skill, a title
(*Flick Specialist*, *Tracking Machine*, *Clutch Brain*, *All-Rounder*, *Complete Pro*),
today's rank and percentile. They then enter a 3-character arcade tag.

## Controls

Use the mouse to aim and click to shoot. A connected gamepad is optional: use the left stick to aim,
A or the right trigger to shoot, and A or Start to begin. On the tag screen, use the D-pad to select
and change letters, then press A to save. You can switch between mouse and controller at any time.

## Built for the booth

- **Second-screen live leaderboard.** Open `board.html` on a second monitor. It shows today's
  top 10 and the best Flick, Track and Clutch scores, and updates the moment a run is saved.
  Both windows talk through `BroadcastChannel` and IndexedDB on the same PC, with **zero network**.
- **Clean reset between players.** Every run starts from fresh state. If a player walks away
  mid-run, the game returns to attract mode after 12 seconds. On the result screens, the score
  is saved automatically after 25 seconds of no input and the game resets.
- **Attract mode.** It shows today's top 5 and an animated demo. A click anywhere starts a run.
- **Staff panel.** Press `Ctrl+Shift+S` and enter the PIN (default `0909`; change it with `?pin=1234`).
  From there staff can reset today's board (with a confirm step), export every run as CSV,
  mute the sound, open the leaderboard window, or start the soak test.
- **Tag filter.** Offensive 3-letter tags are replaced automatically.
- **Soak test.** An autoplay bot plays real sessions back to back, with an on-screen readout of
  sessions, FPS, minimum FPS and JS heap. It shows the game stays responsive over long use.
- **No asset licensing worries.** All visuals are drawn in code and all sound is synthesized
  with WebAudio. There are no third-party images, fonts or music.

## Run it

```bash
npm install
npm run dev        # game: http://localhost:5173  ·  leaderboard: http://localhost:5173/board.html
npm run build      # static build in dist/ (works from any static host or a local folder server)
```

Booth setup: open the game full-screen (F11) on the player monitor. On the second monitor,
open `board.html`, or open it from the staff panel.

## Tech

TypeScript + Vite + Canvas 2D, no runtime dependencies and no backend.
`src/game.ts` holds the rounds and scoring, `src/main.ts` the state machine, booth logic and soak bot,
`src/store.ts` the offline leaderboard, `src/board.ts` the second screen and `src/audio.ts` the
procedural sound.

## Built with JetBrains

Developed in **WebStorm**, with AI coding agents working through JetBrains tooling.
The `.idea` folder is committed as evidence. See [AI_SHOWCASE.md](AI_SHOWCASE.md) for the AI workflow story.

## License

MIT. See [LICENSE](LICENSE).
