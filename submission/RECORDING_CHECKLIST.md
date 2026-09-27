# Recording checklist

All output goes to **D:**. Drive C: has almost no free space.

## Before recording
- [ ] Browser zoom at 100% (or 110% if text looks small at 1080p). Window maximized at 1920×1080.
- [ ] Windows notifications off (Focus assist / Do not disturb).
- [ ] Discord, Slack and mail notifications off; password-manager pop-ups off.
- [ ] Only these tabs open, in order:
  1. <https://closed-book.vercel.app/>
  2. <https://closed-book.vercel.app/protocol#attestation>
  3. <https://github.com/BeBecpp/closed_book/blob/main/contract/src/closed-book.compact>
  4. <https://github.com/BeBecpp/closed_book/blob/main/proofs/evidence.json>
  5. <https://github.com/BeBecpp/closed_book#network-status>
- [ ] No private or unrelated tabs, bookmarks bar hidden, and no terminal showing `.midnight/`.
- [ ] Demo registry cleared in tab 1: DevTools → Application → Local Storage → delete `closedbook.demo.registry.v2`, then reload. Or use a fresh browser profile.
- [ ] All six checks show PASS before you start.
- [ ] Mouse pointer visible; move slowly.
- [ ] Microphone not needed (the ElevenLabs narration is added afterwards).
- [ ] Recording output folder: `D:\closed-book-submission\video\`
      target file `D:\closed-book-submission\video\closed-book-screen-recording.mp4`

## Recorder
- **OBS (recommended):** Settings → Output → Recording Path = `D:\closed-book-submission\video`; format mp4; 1920×1080, 30 fps. Source: Display Capture or Window Capture (browser).
- **Windows Game Bar (Win+G):** it saves to `C:\Users\<you>\Videos\Captures` by default. **Do not use it** unless you first move that folder to D: (Videos folder → Properties → Location). Prefer OBS.
- **Loom:** fine as a fallback; it records to the cloud, so nothing lands on C:.

## During recording
Follow `DEMO_TIMELINE.md`, silent. If a step goes wrong, pause two seconds and repeat the step; cut it in editing.

## ElevenLabs
- Paste `VOICEOVER_ELEVENLABS.txt` as-is. Choose a calm, neutral voice; stability about 50–60%.
- Download the MP3 to `D:\closed-book-submission\audio\closed-book-voiceover.mp3`.
- If it runs past 2:40, raise the speed slightly (1.05×) rather than cutting lines.

## Combine (ffmpeg is not installed on this machine)
Use any editor (Clipchamp, CapCut, DaVinci Resolve), or install ffmpeg and run:

```powershell
ffmpeg -i D:\closed-book-submission\video\closed-book-screen-recording.mp4 `
       -i D:\closed-book-submission\audio\closed-book-voiceover.mp3 `
       -map 0:v:0 -map 1:a:0 -c:v libx264 -preset medium -crf 20 -r 30 `
       -c:a aac -b:a 160k -shortest `
       D:\closed-book-submission\exports\CLOSED-BOOK-DEMO-FINAL.mp4
```

With burned-in captions:

```powershell
ffmpeg -i D:\closed-book-submission\exports\CLOSED-BOOK-DEMO-FINAL.mp4 `
       -vf "subtitles=D\\:/BeBe_personal/CLOSEDBOOK/submission/CAPTIONS.srt" -c:a copy `
       D:\closed-book-submission\exports\CLOSED-BOOK-DEMO-FINAL-captioned.mp4
```

Or upload `CAPTIONS.srt` as a subtitle track on YouTube instead of burning it in.

## Edit rules
1920×1080, 30 fps, H.264. No music (or very quiet). An optional 1-second title card and a 4-second end card: **CLOSED BOOK** / *Pass the test. Keep the test closed.* / closed-book.vercel.app. No flashy transitions or zooms.

## Upload
YouTube → visibility **Unlisted** (or Public). Open the link in a logged-out or private window to confirm it plays, then paste it into the form.
