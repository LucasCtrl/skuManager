---
name: run-sku-manager
description: Build, run, and drive SKU Manager (Electrobun desktop app). Use when asked to start or launch the app, take a screenshot of its UI, click through a flow (create a product, material or part), check a UI change in the real app, or run its tests.
---

SKU Manager is an Electrobun app (Bun main process + WebKitGTK webview). An agent drives it with
`.claude/skills/run-sku-manager/driver.py`. The driver starts the app on a private Xvfb display,
with its own settings and data folder, and sends clicks, keys and screenshots through XTEST. It
never touches the user's real config (`~/.local/share/com.elsasskabel.skumanager`) or
`~/Documents/EK-Data`.

All paths are relative to the repo root.

## Prerequisites

Verified on Ubuntu under WSL2. `Xvfb`, `scrot` and `python3-venv` were already installed; there
is no `xdotool` and no sudo, which is why the driver uses python-xlib. The Hutch toolchain must be
in `~/.hutch/bin`. The driver adds it to PATH itself.

```bash
export RUN=/tmp/sku-run        # driver workspace: venv, config, data folder, shots, logs
python3 -m venv $RUN/venv && $RUN/venv/bin/pip -q install python-xlib
```

## Run (agent path)

`up` builds (vite + electrobun) and launches the app. It takes about 20–40 s and prints when the
window is drawn. Commands chain left to right in one call:

```bash
D="$RUN/venv/bin/python .claude/skills/run-sku-manager/driver.py"
$D up seed shot home           # app open on Products, sample lists added
$D click 433 112 shot mats     # Materials tab
$D down                        # stop app + Xvfb
```

| command       | what it does                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `up` / `down` | start / stop Xvfb `:99` and `hutch run start` (log: `$RUN/app.log`)                                     |
| `seed`        | insert sellers DISP/LACRY/BOSSARD, types PLY/PMMA/SCREW, colours BLK/CLR, finish OPQ, units sheet/piece |
| `click X Y`   | left click at screen pixels (1400×900 screen)                                                           |
| `type TEXT`   | type into the focused input                                                                             |
| `key A[+B]`   | X keysym or chord: `Return`, `Tab`, `Escape`, `Control_L+a`                                             |
| `scroll N`    | wheel N notches at the last click position (negative = up)                                              |
| `wait S`      | sleep S seconds                                                                                         |
| `shot NAME`   | screenshot to `$RUN/shots/NAME.png`. **Read it** to get the next coordinates                            |

Data folder: `$RUN/data` (`db.sqlite`, `1_PRODUCTS/`, `3_MATERIALS/`, `4_PARTS/`). Check files
there to confirm what the UI created.

Verified flow: create a raw material with no colour or finish (expects `EK-MAT_DISP_PLY_15MM`):

```bash
$D up seed
$D click 433 112 click 1119 258 # Materials tab -> "New material"
$D click 528 388 click 450 445 # Seller popup -> Dispano
$D click 811 388 click 720 445 # Material type popup -> Plywood
$D click 858 535 type 15mm     # Thickness or weight
$D click 528 691 click 420 748 # Price unit popup -> sheet
$D scroll 10 shot form         # dialog scrolled to the Create button
$D click 875 770 wait 1 shot created
ls $RUN/data/3_MATERIALS       # EK-MAT_DISP_PLY_15MM
$D down
```

## Run (human path)

```bash
hutch run start   # window opens on your desktop (WSLg on Windows). Close it or Ctrl-C.
```

This uses your real config and data folder.

## Test

```bash
hutch run test        # bun test: store + items + file ops, 5 tests
hutch run typecheck && hutch run lint
```

## Gotchas

- **The first-run "Data folder" field is read-only.** Browse opens a native GTK dialog, and
  `XDG_DOCUMENTS_DIR` does not change the default (`~/Documents/EK-Data`). `up` writes
  `config.json` with `dataFolder` already set, so the first-run screen is skipped and the folder
  is created when the app opens.
- **Settings go to `$XDG_DATA_HOME/com.elsasskabel.skumanager/dev/config.json`**, which is how
  the driver isolates them.
- **WSLg:** unset `WAYLAND_DISPLAY` and set `GDK_BACKEND=x11`. Otherwise the window opens on the
  real desktop instead of Xvfb. The driver does both.
- **Managed lists are created only in Settings, behind a confirmation.** `seed` writes them
  straight to `list_entries` while the app runs. Dialogs pick them up the next time they open.
- **`<select>` opens a GTK popup list under the field.** Click the field, then click the option
  row: rows are about 23 px apart, and the first row is "Select…".
- **Coordinates are screen pixels.** The window sits at x=120..1220, y=80..840 and is not
  maximised. Take a `shot` after each step that changes the layout.
- **The New item dialog moves when it is complete.** Once nothing is missing, the "Still needed"
  line disappears and every field below the SKU preview moves up 27 px. Colour and Finish popups
  open at y≈569 ("Select…"), with the first entry at 592.
- **Stopping:** `down` kills the process groups it started. Do not `pkill -f` a pattern that
  appears in your own command line: it kills your shell (exit 144) before the rest of the command
  runs.
- `libEGL warning: DRI3 error` and `X11 Error: GLXBadWindow` in the log are harmless under Xvfb.

## Troubleshooting

- **First screenshot shows an empty "Data folder" field and a faded button**: the webview was
  still loading. Wait a few seconds and take another `shot`.
- **Log stops at `[electrobun] Waiting for the project build lock...`**: this happens right after
  the previous `down`. The lock cleared on its own after about 3 minutes, and `up` waits up to
  6 minutes.
- **`app not ready after 360s`**: read `$RUN/app.log`. The app may still be starting. Run `down`
  before the next `up`.
