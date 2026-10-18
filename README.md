# Wavefront - Kinetic Memory & Circle Reflex Game

[![Game Status](https://img.shields.io/badge/Game-Playable-brightgreen.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20HTML5%20Canvas-blue.svg)]()
[![Audio](https://img.shields.io/badge/Audio-Web%20Audio%20%2B%20MP3-orange.svg)]()
[![License](https://img.shields.io/badge/License-ISC-lightgrey.svg)]()

> **A high-octane 2D kinetic reflex & working-memory arcade game.**  
> Surf curved slide tracks, jump over rolling crescent juggernauts, and dodge intelligent homing needles across escalating mathematical wave cascades.

---


## Important Note

This game has been created with AI, I have only put it into a repo


## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/wavefront.git
cd wavefront

# Launch the local server
npm start
# or: node server.js
```
Open **`http://localhost:3000`** in any modern web browser.  
*(You can also double-click `index.html` directly).*

---

## 🎮 Controls

| Action | Keyboard | Touch / Mouse |
| :--- | :--- | :--- |
| **Slide Left / Right** | `A` / `D` or `Left` / `Right Arrow` | Click / Drag along track |
| **Jump Over Boulders** | `Spacebar` / `Up Arrow` / `W` | On-screen `⬆ JUMP` button |
| **Pause Game** | `P` or `Esc` | On-screen `⏸ PAUSE` button |

---

## 🧠 The Working-Memory Mechanic

Wavefront subverts traditional gaming reflexes to test your active working memory under pressure:

| Orb Signature | Visual Appearance | Type | Effect |
| :--- | :--- | :--- | :--- |
| **Player Orb** | Luminous Blue Circle | Self | Navigate tracks, dodge hazards, leap over boulders |
| **Hazard Orb** | **Striped Red** | ⚠️ Hazard | Deadly collision! Instant game over unless shielded |
| **Invulnerability** | **Solid Red** | ✨ Good Power-Up | 5.0s invincibility shield; safely smash hazard orbs |
| **Chrono Matrix** | **Solid Green** | ⏱️ Good Power-Up | Slows all incoming hazard balls to 35% speed for 6.0s |
| **Sensory Inversion**| **Striped Green** | ☠️ Trap! | Inverts movement controls (`Left` ↔ `Right`) for 5.0s |

> **Cognitive Rule of Thumb**:
> - **SOLID** = Beneficial (*Solid Red* = Invulnerable, *Solid Green* = Time Slow)
> - **STRIPED** = Threat / Trap (*Striped Red* = Lethal Death, *Striped Green* = Control Inversion)

---

## 📐 Mathematical Patterns & Dynamic Hazards

1. **Cascade Wave**: Sequential waves ($1 \to 4$) sweep across the player's active sector, requiring precise timing to surf right into the wake of the lead ball.
2. **Dynamic Scissor**: Opposing hazard streams cross at dynamic pinch points, pinching between the crescent dip and player wings.
3. **Boulder & Homing Needle**: Heavy divider boulders cut off track sectors while high-speed homing needles lock on with laser guidance and track the player in real-time.
4. **Rolling Crescent Juggernaut**: In Endless mode, massive rolling boulders drop from the sky onto the crescent curve with screen-shaking impact, accelerating down into the dip. **You must jump over them** before they roll off the wing!
5. **Fairness Math Spawner**:
   $$\text{Valid Spawn} \iff T_{\text{impact}} \ge \frac{\text{Distance to Safety}}{v_{\text{player}}}$$
   Spawns are verified to prevent mathematically impossible deaths.

---

## 🗺️ Game Modes

* **Endless Wavefront**: Choose from 4 difficulty themes with distinct speed multipliers and arena aesthetics:
  * **Easy** ($1.0\times$) — Emerald Basin
  * **Normal** ($1.3\times$) — Amber Surge
  * **Hard** ($1.65\times$) — Crimson Pulse
  * **Nightmare** ($2.1\times$) — Deep Pitch Black with glowing jagged molten lava cracks
* **Adventure Path (8 Stages)**:
  1. *Crescent Basin*
  2. *Orbital Ring (360° Loop)*
  3. *Twin Dip Wave*
  4. *Infinity Weave (Figure-8)*
  5. *Spiral Nebula*
  6. *Triple Crest Apex*
  7. *Diamond Perimeter*
  8. *Cosmic Vortex (Master Stage)*

---

## 🎵 Soundtrack Credits

* **Heroism** by MaxKoMusic | [maxkomusic.com](https://maxkomusic.com/) *(CC BY-SA 3.0 via [Chosic](https://www.chosic.com/free-music/all/))*
* **Extreme Sport Trap Music | PISTA** by Alex-Productions | [onsound.eu](https://onsound.eu/) *(CC BY 3.0 via [Chosic](https://www.chosic.com/free-music/all/))*
* **Under The Sun** by Keys of Moon | [SoundCloud](https://soundcloud.com/keysofmoon) *(CC BY 4.0 via [Chosic](https://www.chosic.com/free-music/all/))*
