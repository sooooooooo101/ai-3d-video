# VOICEVOX Speaker IDs Reference

Check running VOICEVOX Engine (`http://127.0.0.1:50021/speakers`):
```bash
curl -s http://127.0.0.1:50021/speakers | python3 -c "import sys,json; [print(s['name'], [(st['name'], st['id']) for st in s['styles']]) for s in json.load(sys.stdin)]"
```

## Commonly Used IDs
- **春日部つむぎ（ノーマル）**: `8` — 明るい声（とんぼ役・解説役向け）
- **玄野武宏（ノーマル）**: `11` — 自然な少年の声（少年役向け）
  - 喜び: `39`, ツンギレ: `40`, 悲しみ: `41`
- **ずんだもん（ノーマル）**: `3`
- **四国めたん（ノーマル）**: `2`
