#!/usr/bin/env python3
"""
Generic VOICEVOX + Lip-Sync + BGM + SRT Subtitle Pipeline
Usage:
  python3 audio_pipeline.py --script dialogue.json --out-dir ./build
"""
import argparse
import json
import math
import shutil
import sys
import struct
import subprocess
import urllib.parse
import urllib.request
import wave
from pathlib import Path

VOICEVOX_URL = "http://127.0.0.1:50021"


def is_voicevox_running():
    try:
        with urllib.request.urlopen(f"{VOICEVOX_URL}/speakers", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def synth_voicevox(text, speaker, speed, pitch, out_wav):
    q_url = f"{VOICEVOX_URL}/audio_query?text={urllib.parse.quote(text)}&speaker={speaker}"
    with urllib.request.urlopen(urllib.request.Request(q_url, method="POST"), timeout=15) as r:
        q = json.loads(r.read().decode("utf-8"))
    q["speedScale"] = speed
    q["pitchScale"] = pitch
    q["prePhonemeLength"] = 0.03
    q["postPhonemeLength"] = 0.05
    s_url = f"{VOICEVOX_URL}/synthesis?speaker={speaker}"
    req2 = urllib.request.Request(
        s_url, data=json.dumps(q).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req2, timeout=30) as r:
        out_wav.write_bytes(r.read())


def get_wav_info(wav_path):
    with wave.open(str(wav_path), "rb") as w:
        sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels()
        raw = w.readframes(n)
    samples = struct.unpack(f"<{n * ch}h", raw)
    if ch > 1:
        samples = samples[::ch]
    return sr, n / sr, samples


def fmt_srt_time(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int(round((sec - int(sec)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", required=True, help="Path to dialogue.json")
    ap.add_argument("--out-dir", required=True, help="Output directory")
    ap.add_argument("--bgm", help="Optional BGM audio file to use instead of the built-in synth loop")
    ap.add_argument("--bgm-volume", type=float, default=0.85)
    ap.add_argument("--require-voicevox", action="store_true", help="Fail instead of falling back to macOS say")
    args = ap.parse_args()

    cfg = json.loads(Path(args.script).read_text(encoding="utf-8"))
    out_dir = Path(args.out_dir)
    audio_dir = out_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    fps = cfg.get("fps", 15)
    total_sec = cfg.get("total_sec", 15.0)
    n_frames = round(total_sec * fps)  # must match render_batch.py / stage.js
    bgm_stop_sec = cfg.get("bgm_stop_sec", total_sec)
    use_vv = is_voicevox_running()
    if not use_vv:
        msg = f"VOICEVOX engine not reachable at {VOICEVOX_URL}"
        if args.require_voicevox or not shutil.which("say"):
            sys.exit(f"ERROR: {msg}. Start VOICEVOX and retry.")
        print(f"WARNING: {msg} -- using macOS 'say' (voices will NOT match speaker_id).", file=sys.stderr)
    print(f"TTS Engine: {'VOICEVOX' if use_vv else 'macOS say fallback'}")

    mouth_tracks = {}
    timeline = []

    for idx, line in enumerate(cfg["lines"], start=1):
        lid = line.get("id", f"L{idx}")
        role = line.get("role", "main")
        spk = line.get("speaker_id", 8)
        start_s = line["start"]
        max_d = line.get("max_dur", 10.0)
        spd = line.get("speed", 1.1)
        pitch = line.get("pitch", 0.0)
        txt = line["text"]

        raw_wav = audio_dir / f"{lid}_raw.wav"
        norm_wav = audio_dir / f"{lid}.wav"
        if use_vv:
            synth_voicevox(txt, spk, spd, pitch, raw_wav)
            subprocess.run(["ffmpeg", "-y", "-i", str(raw_wav), "-ar", "44100", "-ac", "1", str(norm_wav)],
                           check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        else:
            aiff = audio_dir / f"{lid}.aiff"
            subprocess.run(["say", "-v", "Kyoko", "-r", "190", "-o", str(aiff), txt], check=True)
            subprocess.run(["ffmpeg", "-y", "-i", str(aiff), "-ar", "44100", "-ac", "1", str(norm_wav)],
                           check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        sr, dur, samples = get_wav_info(norm_wav)
        if dur > max_d:
            atempo = dur / max_d
            tmp_wav = audio_dir / f"{lid}_fit.wav"
            subprocess.run(["ffmpeg", "-y", "-i", str(norm_wav), "-filter:a", f"atempo={atempo:.3f}", str(tmp_wav)],
                           check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            tmp_wav.replace(norm_wav)
            sr, dur, samples = get_wav_info(norm_wav)

        track = mouth_tracks.setdefault(role, [0.0] * n_frames)
        for fi in range(n_frames):
            t_rel = (fi / fps) - start_s
            if 0.0 <= t_rel < dur:
                i0 = int(t_rel * sr)
                i1 = min(len(samples), i0 + int(sr / fps))
                if i1 > i0:
                    rms = math.sqrt(sum(s * s for s in samples[i0:i1]) / (i1 - i0)) / 32768.0
                    track[fi] = max(track[fi], min(1.0, rms * 5.5))

        timeline.append({"id": lid, "role": role, "speaker_id": spk, "start": start_s, "dur": round(dur, 3), "text": txt})

    # BGM
    bgm_wav = audio_dir / "bgm.wav"
    if args.bgm:
        # Cut the music at bgm_stop_sec, then pad with silence so the track still spans the whole video.
        subprocess.run(["ffmpeg", "-y", "-i", args.bgm, "-ar", "44100", "-ac", "1",
                        "-af", f"atrim=0:{bgm_stop_sec},afade=t=out:st={max(0.0, bgm_stop_sec - 0.05):.3f}:d=0.05,"
                               f"apad=whole_dur={total_sec}",
                        "-t", str(total_sec), str(bgm_wav)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    else:
        write_synth_bgm(bgm_wav, total_sec, bgm_stop_sec)

    # Mix
    inputs = ["-i", str(bgm_wav)]
    filters = [f"[0:a]volume={args.bgm_volume}[bgm]"]
    labels = ["[bgm]"]
    for idx, item in enumerate(timeline, start=1):
        inputs += ["-i", str(audio_dir / f"{item['id']}.wav")]
        ms = int(item["start"] * 1000)
        filters.append(f"[{idx}:a]adelay={ms}|{ms},volume=1.4[a{idx}]")
        labels.append(f"[a{idx}]")
    # Optional sound effects / ambience: "sfx": [{"file": "wind.wav", "start": 5.0, "volume": 0.8}]
    base_dir = Path(args.script).resolve().parent
    for sfx in cfg.get("sfx", []):
        n = len(labels)
        sfx_path = Path(sfx["file"])
        inputs += ["-i", str(sfx_path if sfx_path.is_absolute() else base_dir / sfx_path)]
        ms = int(sfx.get("start", 0) * 1000)
        filters.append(f"[{n}:a]aresample=44100,adelay={ms}|{ms},volume={sfx.get('volume', 1.0)}[s{n}]")
        labels.append(f"[s{n}]")
    fstr = ";".join(filters) + ";" + "".join(labels) + f"amix=inputs={len(labels)}:duration=first:normalize=0[out]"
    master_wav = audio_dir / "master_audio.wav"
    subprocess.run(["ffmpeg", "-y", *inputs, "-filter_complex", fstr, "-map", "[out]", "-t", str(total_sec), str(master_wav)],
                   check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # SRT Subtitles
    srt_lines = []
    for idx, item in enumerate(timeline, start=1):
        srt_lines.append(f"{idx}\n{fmt_srt_time(item['start'])} --> {fmt_srt_time(item['start'] + item['dur'])}\n{item['text']}\n")
    (out_dir / "subtitles.srt").write_text("\n".join(srt_lines), encoding="utf-8")

    (out_dir / "timing.json").write_text(
        json.dumps({"fps": fps, "total_sec": total_sec, "timeline": timeline, "mouth_tracks": mouth_tracks}, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    _, master_dur, _ = get_wav_info(master_wav)
    if master_dur < total_sec - 0.1:
        sys.exit(f"ERROR: master audio is {master_dur:.2f}s but the video is {total_sec}s.")
    for item in timeline:
        print(f"  {item['id']:>5} {item['role']:>5}  {item['start']:6.2f} -> {item['start'] + item['dur']:6.2f}s  {item['text']}")
    print(f"Done: {master_wav}, subtitles.srt, timing.json")


def write_synth_bgm(bgm_wav, total_sec, bgm_stop_sec):
    sr = 44100
    n_bgm = int(total_sec * sr)
    notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.00, 783.99]
    bgm_samples = []
    for i in range(n_bgm):
        t = i / sr
        if t >= bgm_stop_sec:
            bgm_samples.append(0)
            continue
        beat = int(t * 4)
        env = math.exp(-((t * 4) - beat) * 6.5)
        val = math.sin(2 * math.pi * notes[beat % len(notes)] * t) * env * 0.12
        if t < 0.2:
            val *= (t / 0.2)
        bgm_samples.append(int(max(-1.0, min(1.0, val)) * 32767))

    with wave.open(str(bgm_wav), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(struct.pack(f"<{n_bgm}h", *bgm_samples))


if __name__ == "__main__":
    main()
