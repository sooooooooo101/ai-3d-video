# VOICEVOX Speaker IDs Reference

Check the running VOICEVOX Engine (`http://127.0.0.1:50021/speakers`); IDs below were confirmed on VOICEVOX 0.26.1.
```bash
curl -s http://127.0.0.1:50021/speakers | python3 -c "import sys,json; [print(s['name'], [(st['name'], st['id']) for st in s['styles']]) for s in json.load(sys.stdin)]"
```

**Rule: one character = one `speaker_id` for the whole video.** A style of the same voice (e.g. 39 喜び vs 11 ノーマル) sounds like a different person; show emotion with `speed` / `pitch` instead. Give two characters in one video clearly different voices.

## By voice type (the 企画書 "声の感じ" choices)

| 声の感じ | First choice | Alternative | Fits (cast) |
|---|---|---|---|
| 明るい | 8 春日部つむぎ | 2 四国めたん | dragonfly, girl, clerk, chick |
| 落ち着いた（女性） | 14 冥鳴ひまり | 16 九州そら | clerk, office (female) |
| 落ち着いた（男性） | 11 玄野武宏 | 52 雀松朱司 | boy (as in the examples), officeWorker |
| 元気な子ども | 12 白上虎太郎 | 3 ずんだもん | boy, girl |
| 低め | 13 青山龍星 | 21 剣崎雌雄 | chef, officeWorker |
| かわいい | 3 ずんだもん | 58 猫使ビィ | cat, chick, slime |
| お年寄り | 42 ちび式じい（おじいさん） | 20 もち子さん with `pitch -0.04`, `speed 0.9`（おばあさん役の代用） | grandma |
| ロボットっぽい | 47 ナースロボ＿タイプＴ | 89 Voidoll | robot |
| ナレーション | 30 No.7（アナウンス） | 29 No.7（ノーマル） | narrator (no on-screen character) |

Bundled examples: 8 春日部つむぎ (dragonfly), 11 玄野武宏 (boy), 13 青山龍星 (chef), 47 ナースロボ＿タイプＴ (robot).

## Terms of use

Every voice has its own terms, and almost all require a credit line such as `VOICEVOX:春日部つむぎ` when the audio is published. Some restrict commercial use, certain genres, or require extra permission. **Before publishing, check the terms of each voice you used** (VOICEVOX app → キャラクター → 利用規約, or https://voicevox.hiroshiba.jp/term/), and tell the user which credit lines are needed.
