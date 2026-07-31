# Pokémon Mayhem

A browser-based, turn-by-turn Pokémon battle simulator. Build a squad under a
20-point budget (or draft one), then fight through a 16-team single-elimination
Pokémon League against gym leaders and champions — with live HP bars, type
matchups, abilities, passives, and mid-battle evolutions.

**100% client-side.** No server, no build step, no dependencies. Open
`pokemon-mayhem.html` in a browser and play.

## Files

| File | Role |
|---|---|
| `pokemon-mayhem.html` | Page markup + all CSS (tabs, cards, battle stage, modal, confetti) |
| `pokemon-mayhem-data.js` | Dataset: all 1025 Pokémon + evolution map. Exposes `window.POKEMON`, `window.POKE_EVO` |
| `pokemon-mayhem-game.js` | Pure logic: costs, HP, abilities/passives, damage, battles, rosters. Exposes `window.PM` |
| `pokemon-mayhem-ui.js` | DOM layer: budget builder, draft mode, league bracket, battle narration |
| `pokemon-mayhem-explained.html` | Player-facing guide to every mechanic (spoilers) |
| `pokemon-ratings-guide.html` | Player-facing list of hidden ratings (spoilers) |

Load order matters: the HTML loads `data.js` → `game.js` → `ui.js`.
`game.js` has **no DOM access**, so it also runs headless under Node (see Testing).

## Architecture

```
data.js ──► game.js ──► ui.js ──► DOM
 (facts)     (rules)    (render + events)
```

- **`data.js`** — each Pokémon: `{ id, name, types[], role, rating, s:{hp,atk,def,spa,spd,spe} }`.
  `rating` (hidden in-game) drives cost and damage. `POKE_EVO` maps id → evolved-form ids.
- **`game.js`** — an IIFE that reads the data and publishes the `PM` API (below).
- **`ui.js`** — an IIFE that renders everything and replays battle event streams with delays.

## The `PM` API (game.js)

| Member | What it does |
|---|---|
| `P`, `byName`, `byRole` | The 1025 Pokémon, plus name/role indexes |
| `BUDGET` (20), `CAP` (6) | Team-building limits |
| `costOf(m)` | Rating → 1–10 point cost (quadratic curve) |
| `teamScore(team)` | Display-only squad rating (depth + variety bonuses) |
| `battle(A, B)` | Full match. Returns `{ aWins, score, edge, events[] }` |
| `aiBudgetTeam(name, budget, strength)` | Random rival squad; `strength` 0–1 scales spend |
| `aiDraftTeam` / `movesOf` / `shuffle` | Draft helper, move names per type, Fisher-Yates |
| `gymLeaders(n)` | Draw `n` of the 12 boss trainers (fixed canonical teams) |
| `RIVAL_LEADERS`, `avatarOf(name)` | Johto rival names, trainer portrait URL |
| `spriteOf(m)`, `ovrClass(r)` | Sprite URL, rating color class |

### Battle event stream

`battle()` never touches the DOM — it returns an ordered `events[]` array the UI
replays. Every event carries a snapshot of both fighters (`aMon/aHp/aMax/aTag`,
`bMon/…`) plus:

| `t` | Meaning |
|---|---|
| `send` | A Pokémon enters (leads or replaces a fainted one) |
| `hit` | An attack landed — `dmg`, `side`, narrated text (effectiveness, crits) |
| `ability` | An ability/passive fired (Intimidate, Sturdy, Static, Moxie…) |
| `evolve` | Evolution / Mega / Gigantamax (`side`, updated `tag`) |
| `faint` / `info` | KO / flavor lines |

### How a battle runs (game.js `battle`)

1. Both teams queue up in order; HP = `70 + 30 × f(baseHP)` (70–100).
2. Per duel: faster Pokémon attacks first, sides alternate. Entry abilities
   (Intimidate) fire on send-out; Megas/G-Max may trigger when losing.
3. Damage = `24 × strengthRatio^0.6 × statRatio × typeMult^0.8 × rand × crit`,
   then ability/passive multipliers, clamped 5–65 (5–110 if super effective,
   ≤4 if blocked by an immunity). Strength scales with current HP (fatigue).
4. Winner stays in with its wounds, may evolve (30%), heals if Regenerator.
5. Repeat until one team is out.

All tuning constants live at the top of `game.js`: the `ABILITIES` / `PASSIVES`
effect tables, `SIG` / `SIG_PASSIVE` canonical assignments, `MEGA_CHANCE`,
`EVO_CHANCE`, `BOOST`, `SURGE`, and the damage numbers inside the hit loop.

### League bracket (ui.js `runLeague`)

16 teams: you + 6 boss trainers (`gymLeaders(6)`) + 9 random-budget rivals.
Your Qualifier opponent is drawn from the 3 weakest rivals; bosses are seeded
into the later bracket. Damage persists between rounds. If you lose, the
bracket still resolves and the verdict names the tournament winner.

## Testing

`game.js` runs headless — simulate thousands of battles from the repo folder:

```bash
node --check pokemon-mayhem-game.js && node --check pokemon-mayhem-ui.js
node -e '
global.window = {};
require("./pokemon-mayhem-data.js");
require("./pokemon-mayhem-game.js");
const PM = window.PM;
let errs = 0;
for (let i = 0; i < 500; i++) {
  const A = PM.aiBudgetTeam("A", PM.BUDGET, 1);
  const B = PM.aiBudgetTeam("B", PM.BUDGET, 0.5);
  try { PM.battle(A, B); } catch (e) { errs++; }
}
console.log("errors:", errs);
'
```

For UI changes, open `pokemon-mayhem.html` and run a league + a draft battle.

## Contributing

- **Balance tweaks**: edit the constants in `game.js` (ability/passive tables,
  damage clamps, `MEGA_CHANCE`/`EVO_CHANCE`). Re-run the simulation above —
  zero errors and no runaway battles is the bar.
- **New abilities/passives**: add an entry to `ABILITIES`/`PASSIVES`, assign it
  in `SIG`/`SIG_PASSIVE` (or the fallback pools), hook its effect into the hit
  loop in `battle()`, and push an `ability` event so it narrates in the log.
- **New boss trainers**: add to `GYM_TEAMS` (names must exist in `byName`;
  one form per evolutionary line) and verify the trainer portrait resolves via
  `avatarOf`.
- **Keep the layering**: `game.js` must stay DOM-free, `ui.js` must not
  compute game rules. No frameworks, no build tools, no external libraries.
- If a change alters player-facing mechanics, update
  `pokemon-mayhem-explained.html` to match.

