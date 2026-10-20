#!/usr/bin/env python3
"""Drive SKU Manager on a private Xvfb display with an isolated config and data folder.

Commands chain left to right in one call:
  up                 start Xvfb + the app (hutch run start), wait until the window is drawn
  seed               add sample sellers/types/colours/finishes/units to the db
  click X Y          left click at screen coordinates
  type TEXT          type text into the focused field
  key A[+B]          key or chord by X keysym name (Return, Tab, Control_L+a, Escape)
  scroll N           wheel down N notches at the last pointer position (negative = up)
  wait S             sleep S seconds
  shot NAME          screenshot -> $RUN/shots/NAME.png
  down               stop the app and Xvfb

Env: RUN (default /tmp/sku-run) holds venv, xdg config, data folder, shots, logs.
Needs: Xvfb, scrot, python-xlib (in $RUN/venv, see SKILL.md).
"""
import os, signal, sqlite3, subprocess, sys, time
from pathlib import Path

RUN = Path(os.environ.get("RUN", "/tmp/sku-run"))
DISPLAY = ":99"
UNIT = Path(__file__).resolve().parents[3]
CONFIG = RUN / "xdg/com.elsasskabel.skumanager/dev/config.json"
LOG = RUN / "app.log"


def env():
    e = dict(os.environ)
    e.update(
        DISPLAY=DISPLAY,
        GDK_BACKEND="x11",
        XDG_DATA_HOME=str(RUN / "xdg"),  # app settings land here, not in ~/.local/share
        PATH=f"{Path.home()}/.hutch/bin:{e['PATH']}",
    )
    e.pop("WAYLAND_DISPLAY", None)  # WSLg: otherwise GTK opens on the real desktop
    return e


def up():
    for d in ("shots", "data", CONFIG.parent):
        (RUN / d).mkdir(parents=True, exist_ok=True)
    # Pre-set the data folder: the first-run path field is read-only (Browse opens a GTK dialog).
    CONFIG.write_text(f'{{"dataFolder":"{RUN}/data","theme":"light","lang":"en"}}')
    x = subprocess.Popen(["Xvfb", DISPLAY, "-screen", "0", "1400x900x24"],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    time.sleep(1)
    app = subprocess.Popen(["hutch", "run", "start"], cwd=UNIT, env=env(),
                           stdout=open(LOG, "w"), stderr=subprocess.STDOUT, start_new_session=True)
    (RUN / "pids").write_text(f"{x.pid} {app.pid}")
    for _ in range(180):
        if "Event loop ready" in LOG.read_text(errors="ignore"):
            break
        if app.poll() is not None:
            sys.exit(f"app exited, see {LOG}")
        time.sleep(1)
    else:
        sys.exit(f"app not ready after 180s, see {LOG}")
    time.sleep(6)  # webview paints a few seconds after the native loop is ready
    print(f"up: data={RUN}/data log={LOG}")


def down():
    p = RUN / "pids"
    if not p.exists():
        return
    for pid in p.read_text().split():
        try:
            os.killpg(int(pid), signal.SIGTERM)  # process groups: hutch spawns launcher + cottontail
        except ProcessLookupError:
            pass
    p.unlink()
    print("down")


def seed():
    db = sqlite3.connect(RUN / "data/db.sqlite")
    rows = [("seller", "Dispano", "DISP"), ("seller", "L'acrylic", "LACRY"), ("seller", "Bossard", "BOSSARD"),
            ("materialType", "Plywood", "PLY"), ("materialType", "PMMA", "PMMA"), ("partType", "Screw", "SCREW"),
            ("colour", "Black", "BLK"), ("colour", "Clear", "CLR"), ("finish", "Opaque", "OPQ"),
            ("unit", "sheet", "sheet"), ("unit", "piece", "piece")]
    db.executemany("INSERT OR IGNORE INTO list_entries (list, name, code, created_at) "
                   "VALUES (?, ?, ?, datetime())", rows)
    db.commit()
    print("seeded", len(rows), "list entries")


SPECIAL = {"/": "slash", "-": "minus", "_": "underscore", ".": "period", " ": "space", ",": "comma",
           ":": "colon", "'": "apostrophe", "@": "at", "(": "parenleft", ")": "parenright"}
SHIFTED = set("_:@()")


def main(args):
    d = None
    pos = (700, 450)

    def x():
        nonlocal d
        if d is None:
            from Xlib import display
            d = display.Display(DISPLAY)
        return d

    def press(names):
        from Xlib import X, XK
        from Xlib.ext import xtest
        codes = [x().keysym_to_keycode(XK.string_to_keysym(n)) for n in names]
        for c in codes:
            xtest.fake_input(x(), X.KeyPress, c)
        for c in reversed(codes):
            xtest.fake_input(x(), X.KeyRelease, c)
        x().sync()
        time.sleep(0.03)

    def button(b, n=1):
        from Xlib import X
        from Xlib.ext import xtest
        xtest.fake_input(x(), X.MotionNotify, x=pos[0], y=pos[1])
        x().sync()
        time.sleep(0.1)
        for _ in range(n):
            xtest.fake_input(x(), X.ButtonPress, b)
            xtest.fake_input(x(), X.ButtonRelease, b)
            x().sync()
            time.sleep(0.05)

    while args:
        cmd = args.pop(0)
        if cmd == "up":
            up()
        elif cmd == "down":
            down()
        elif cmd == "seed":
            seed()
        elif cmd == "click":
            pos = (int(args.pop(0)), int(args.pop(0)))
            button(1)
        elif cmd == "scroll":
            n = int(args.pop(0))
            button(5 if n > 0 else 4, abs(n))
        elif cmd == "type":
            for ch in args.pop(0):
                k = SPECIAL.get(ch, ch)
                press(["Shift_L", k] if ch.isupper() or ch in SHIFTED else [k])
        elif cmd == "key":
            press(args.pop(0).split("+"))
        elif cmd == "wait":
            time.sleep(float(args.pop(0)))
        elif cmd == "shot":
            time.sleep(0.6)  # let React re-render after the last input
            out = RUN / "shots" / f"{args.pop(0)}.png"
            subprocess.run(["scrot", "-o", str(out)], env={**os.environ, "DISPLAY": DISPLAY}, check=True)
            print(out)
        else:
            sys.exit(f"unknown command: {cmd}")
        time.sleep(0.25)


if __name__ == "__main__":
    main(sys.argv[1:])
