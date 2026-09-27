# Demo video

**Final cut:** `CLOSED-BOOK-DEMO-FINAL-SUBTITLED.mp4`. 2:34, 1920×1080, 30 fps, H.264 + AAC, with small English + Korean captions burned in.
A caption-free cut (`CLOSED-BOOK-DEMO-FINAL.mp4`) also exists. Both files live outside the repository, in `D:\closed-book-submission\exports\`, and go on YouTube (unlisted), not in git.

## Structure

| Time | Section |
| ---- | ------- |
| 0:00 – 0:07 | Title: CLOSED BOOK · a project by NERO · Midnight Korea Hackathon 2026 |
| 0:07 – 1:21 | Live site: 6/6 attestation, then Secret exfiltration fails → *Attestation refused* |
| 1:21 – 1:45 | Protocol page and the real `attest` circuit on GitHub (five asserts) |
| 1:45 – 2:02 | `proofs/evidence.json`: 6/6 proven, 5/6 rejected |
| 2:02 – 2:20 | README: evidence table and *Network deployment · Not claimed* |
| 2:20 – 2:34 | Close on the cover, end card |

## How it was made

- **Screen:** the live site (https://closed-book.vercel.app) and this GitHub repository, driven by Playwright in a clean Chrome profile at 1920×1080. The clicks, scrolling and page states are real: the 6/6 attestation and the refusal happen live. Nothing is mocked or edited into the pages.
- **Voice:** `VOICEOVER_ELEVENLABS.txt`, generated with an ElevenLabs voice, one clip per paragraph. Each clip is placed on the timeline at the moment its screen action happens.
- **Title and end card:** Remotion, built from `public/brand/*` and the brand tokens.
- **Captions:** timed from the measured sentence pauses in the narration.
  - `CAPTIONS.srt` — English
  - `CAPTIONS.ko.srt` — Korean
  - `CAPTIONS.en-ko.srt` — both
- **No music.**

The video makes the same claims as the README. The web demo is labelled *Demo · simulated*, the proofs are the committed standalone proofs, and no network deployment is claimed.
