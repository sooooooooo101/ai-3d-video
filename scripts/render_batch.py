#!/usr/bin/env python3
"""
1-Session WebGL Batch Renderer + FFmpeg Encoder (9:16 / 16:9, optional burned subtitles).

Full render:
  python3 render_batch.py --work-dir . --html scene.html --aspect 9:16 --subtitles none --out out.mp4
Fast preview (half-size, every Nth frame, ONE contact-sheet image, no MP4):
  python3 render_batch.py --work-dir . --html scene.html --aspect 9:16 --preview

Page protocol (implemented by assets/stage.js): the page is opened with ?batch=1[&step=N&scale=S],
POSTs each frame as a PNG data URL to /frame/<index>, then POSTs /done.
"""
import argparse
import base64
import http.server
import json
import math
import os
import shutil
import socketserver
import subprocess
import sys
import threading
from pathlib import Path

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
]


def find_chrome(explicit):
    for cand in [explicit, os.environ.get("CHROME_PATH"), *CHROME_CANDIDATES]:
        if not cand:
            continue
        if Path(cand).is_file():
            return cand
        found = shutil.which(cand)
        if found:
            return found
    sys.exit("ERROR: Chrome/Chromium not found. Pass --chrome <path> or set CHROME_PATH.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work-dir", required=True)
    ap.add_argument("--html", default="scene.html")
    ap.add_argument("--aspect", choices=["9:16", "16:9"], default="9:16")
    ap.add_argument("--subtitles", choices=["none", "burn"], default="none")
    ap.add_argument("--out", help="Output MP4 (required unless --preview)")
    ap.add_argument("--preview", action="store_true", help="Half-size, every --step frames, write preview.png only")
    ap.add_argument("--step", type=int, default=5, help="Frame step for --preview")
    ap.add_argument("--timeout", type=int, default=600, help="Seconds to wait for the page to finish")
    ap.add_argument("--chrome", help="Path to Chrome/Chromium (or set CHROME_PATH)")
    ap.add_argument("--subtitle-font", default="Hiragino Kaku Gothic ProN")
    args = ap.parse_args()
    if not args.preview and not args.out:
        ap.error("--out is required unless --preview is given")
    if not shutil.which("ffmpeg"):
        sys.exit("ERROR: ffmpeg not found on PATH.")
    chrome = find_chrome(args.chrome)

    work_dir = Path(args.work_dir).resolve()
    frames_dir = work_dir / ("frames_preview" if args.preview else "frames")
    frames_dir.mkdir(parents=True, exist_ok=True)
    for old in frames_dir.glob("f_*.png"):  # stale frames from a previous run must not leak in
        old.unlink()
    timing = json.loads((work_dir / "timing.json").read_text(encoding="utf-8"))
    fps = timing.get("fps", 15)
    n_frames = round(timing["total_sec"] * fps)
    step = max(1, args.step) if args.preview else 1
    expected = math.ceil(n_frames / step)

    rw, rh = (720, 1280) if args.aspect == "9:16" else (1280, 720)
    ow, oh = (1080, 1920) if args.aspect == "9:16" else (1920, 1080)

    done_event = threading.Event()
    saved = set()

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(work_dir), **kw)

        def log_message(self, *a):
            pass

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            if self.path.startswith("/frame/"):
                idx = int(self.path.split("/")[-1])
                _, b64 = body.split(",", 1)
                (frames_dir / f"f_{idx:04d}.png").write_bytes(base64.b64decode(b64))
                saved.add(idx)
                self.send_response(200); self.end_headers(); self.wfile.write(b"OK")
            elif self.path == "/done":
                self.send_response(200); self.end_headers(); self.wfile.write(b"DONE")
                done_event.set()
            else:
                self.send_response(404); self.end_headers()

    with socketserver.TCPServer(("127.0.0.1", 0), Handler) as httpd:
        port = httpd.server_address[1]
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        url = f"http://127.0.0.1:{port}/{args.html}?batch=1"
        if args.preview:
            url += f"&step={step}&scale=0.5"
        proc = subprocess.Popen(
            [chrome, "--headless", "--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader",
             "--disable-gpu-sandbox", f"--window-size={rw},{rh}",
             f"--virtual-time-budget={args.timeout * 1000}", url],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        finished = done_event.wait(timeout=args.timeout)
        proc.terminate()
        httpd.shutdown()

    if not finished or len(saved) != expected:
        sys.exit(f"ERROR: rendered {len(saved)}/{expected} frames "
                 f"({'timed out' if not finished else 'page finished early'}). "
                 f"Open {args.html} in a browser and check the console; raise --timeout for long videos.")

    if args.preview:
        cols = 9 if args.aspect == "9:16" else 5
        rows = math.ceil(expected / cols)
        tile_w = 180 if args.aspect == "9:16" else 320
        sheet = work_dir / "preview.png"
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-pattern_type", "glob",
            "-i", str(frames_dir / "f_*.png"),
            "-vf", f"scale={tile_w}:-1,tile={cols}x{rows}", "-frames:v", "1", str(sheet)
        ], check=True)
        print(f"Preview: {sheet}  ({expected} tiles, {cols} per row, left-to-right then down; "
              f"tile k = frame {step}*k = {step / fps:.3f}s * k)")
        return

    vf = f"scale={ow}:{oh}:flags=lanczos"
    if args.subtitles == "burn":
        srt_path = str((work_dir / "subtitles.srt").resolve()).replace(":", "\\:")
        vf += (f",subtitles='{srt_path}':force_style='FontName={args.subtitle_font},FontSize=18,"
               "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,MarginV=45'")

    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-framerate", str(fps), "-i", str(frames_dir / "f_%04d.png"),
        "-i", str(work_dir / "audio" / "master_audio.wav"),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-shortest",
        str(args.out)
    ], check=True)
    print(f"Rendered {len(saved)}/{n_frames} frames -> {args.out}")


if __name__ == "__main__":
    main()
