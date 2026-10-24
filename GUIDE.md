# GAME//HUB — Complete Guide
Pure **HTML + CSS + JavaScript**. No libraries, no server, no build step.

## 1. Three ways to open it
| Option | Open this | Best for |
|---|---|---|
| **A. ALL-IN-ONE** | `GAME-HUB-ALL-IN-ONE.html` (one file: hub + all 4 games + the Trap Lab) | simplest, nothing can be "missing" |
| **B. Open folder** | `index.html` in `Game-Hub-Open/` (31 files in ONE folder, no sub-folders; don't rename) | editing, adding games, GitHub Pages |
| **C. Single games** | any file in `Single-File-Games/` | share one game |

## 2. The games
1. **Wild Animal Runner** (`runner.html`)  2. **Rail Rush** (`surfer.html`)  3. **Spacewar Infinity** (`spacewar.html`)
4. **Classic Bounce · Trap Lab Edition** (`bounce.html`) — the MERGED game:
   - Campaign: 11 levels, 5 keys per level, coins, monsters, 5 lives (7/5/4/3 by difficulty), 7 ball colours.
   - **Every Trap Lab hazard is in the levels:** floor spikes, popping thorns, acid pools*, sticky mud (-60% speed), moving laser beams, rotating fire-bars, anti-gravity zones (+ceiling spikes), ceiling crushers, flames, spike turrets, falling spikes, sliding spikes, homing missiles (Hard+), electric rings*, trampolines, moving/floating walls, monsters. (*unlocked with the Hazard Shop.)
   - **Hazard Shop** (menu): Pixel Spikes (skin), Acid Pools, Electric Ring Blocks — paid with **trap-coins** earned in the campaign (coins×10 + 50 per level). The wallet and unlocks are shared with the Lab.
   - **🧪 Trap Lab** (menu button): the full Trap Lab opens inside the game — trap dashboard, AI-bot physics playground (Bounce + Subway), unlock shop, wave generator, designer studio (chained combos, reaction window, 1-hit KO vs HP).
   - Studio features in the campaign: live **DANGER meter + REACTION window (ms)** HUD, **Health-points mode** (settings), **Chained combos** (settings), difficulty EASY→NIGHTMARE.
   - Controls: ←/→ move, Space/↑ jump, ↓ fast-fall (needed in anti-gravity zones), Esc pause, Enter confirm, R restart level.

## 3. Works on every device
- **Desktop / laptop:** keyboard + mouse. **Tablet / phone:** on-screen buttons (touch pad sits below the game), swipe in Rail Rush, full-screen menus on small screens. S/M/L/FIT size buttons + fullscreen.
- **Button / keypad phones (KaiOS, Nokia-style, any keypad browser):** `compat.js` turns the keypad into game keys — **2/4/6/8 = arrows, 5 = OK (menus) or jump/fire (in game), 0 = Space, soft-left / Back / * = pause, soft-right = Enter, # = restart.** D-pad moves the focus in menus. Keypad mode switches on automatically on keypad phones; on other devices turn on "Keypad-phone keys" in the hub profile panel (or open any page with `?keypad=1`). Weak devices get LITE mode (no glow/texture effects, compact title bar).
- Old-browser safe code: no `async/await`, no optional chaining, no CSS `inset`, grid/`clamp()` fallbacks, pointer-events with touch/mouse fallback. If a script fails, a visible banner explains instead of a blank page.
- Not suitable: Opera Mini "extreme" mode (it cannot run JavaScript games).

## 4. Files (open folder)
- Hub: `index.html`, `hub.css`, `hub.js`, `storage.js`, `compat.js`, `shell.js`
- `runner.html/.js` · `surfer.html/.js` · `bounce.html/.js` · `trap-lab.html` (self-contained, used by the Bounce Lab button)
- Spacewar: `spacewar.html` + `sw-style/menu/game/effects.css` + `sw-storage … sw-main.js` (13 files, order matters)

## 5. Accounts, difficulty, cloud
Hub 👤: sign up (name/email + 6-digit PIN, hashed), per-game best scores, **shared difficulty** (EASY/NORMAL/HARD/NIGHTMARE: speed, trap density, spacing, damage, lives), LCD day theme. For a cloud: give `Store.backend` your own `{get(k),set(k,v)}` returning Promises (`storage.js`). PINs are a convenience lock, not real security.

## 6. Add a game / extend
Add files with unique names → add an object to `GAMES` in `hub.js` + a card in `index.html` → load `compat.js`, `storage.js`, `shell.js` → call `Store.saveScore('id',score)` and read `Store.diff()`. Bounce traps: `gen()` in `bounce.js`. Trap Lab engine: `class Sim` in `trap-lab.html`. Every code section has WHY / HOW / IMPROVE comments.

## 7. Testing status (honest)
Verified in real **Chromium** (desktop, tablet, phone and a simulated 240×320 KaiOS keypad phone with keypad keys): all pages load with no errors, all 11 Bounce levels run at NIGHTMARE with every trap, the shop/wallet/Lab round trip works (also nested inside the ALL-IN-ONE file), Spacewar passes its scripted 12-level simulation. **Not tested** on real Safari, Firefox, KaiOS devices or physical phones — old-browser support is by careful coding, so please report any problem with the device/browser name.
