# nagomi

Nagomi is an interactive, procedurally animated koi pond that runs in your browser. The fish
swim on their own, change depth, react to nearby fish, and gather around the
water when you click or tap. Ripples, currents, lotus leaves, changing weather,
and optional river sounds help the pond feel alive.

The fish are not following a recorded animation. Instead, each fish uses a few
simple rules to decide where to swim, how quickly to turn, and how its body and
tail should bend. The program calculates these movements continuously while
you watch. This is called **procedural animation**: behavior is created in real
time rather than played from a fixed video or set of frames.

New to procedural animation? Read [How Nagomi works](docs/how-it-works.md).


https://github.com/user-attachments/assets/34549f7d-41cf-4cf6-af0a-95074bc631d2


## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Tune

Edit `src/config.ts` to change fish counts and sizes, koi colors, water colors,
lotus leaves, flowers, and shadow strength.

## Controls

- Click or tap to call the fish.
- Press `Space` to scatter them.
- Press `[` or `]` to change the fish count.
- Press `D` to show the procedural spine.
- Press `H` to hide the interface.
- Press `R` to reset the simulation.

## Linux Version

Live wallpaper for Wayland (Niri, Hyprland, Sway) with auto day/night cycle, live weather sync, and CLI control.

### Install & Run
```bash
./install.sh
nagomi-ctl start
```

### CLI Controls
```bash
nagomi-ctl weather [sunny|sunset|rain|auto]
nagomi-ctl rain [on|off|toggle]
nagomi-ctl scatter
nagomi-ctl stop
```
