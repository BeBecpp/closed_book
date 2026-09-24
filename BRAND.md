# BRAND — CLOSED BOOK

> The proof is public. The evidence isn't.

CLOSED BOOK should read like a confidential technical report that happens to
be interactive. It is a security instrument, not a marketing site.

---

## 1. Concept

A closed book has two covers and a spine. Everything that matters is inside,
and the object is still identifiable from the outside: title, edition, seal.

That is the product. The **covers** are the public record — commitments,
predicate, verdict. The **pages** are the private evaluation. The **spine** is
the binding: the cryptographic link between what is shown and what is held.

Redaction is the visual language. Bars of ink replace sensitive content, and
they **never lift**. Verification succeeds while the redaction stays in place.

## 2. Logo construction

The mark is built on a 16-unit grid so it renders pixel-exact at 16 px.

```
 0 1 2 3 4 5 6 7 8 9 A B C D E F
 . . . . . . . ██ . . . . . . .     y 1   spine starts (protrudes)
 . . . . . . . ██ . . . . . . .     y 2
 . █████ . . . ██ . ┌───┐ . . .     y 3   covers start
 . █████ . . . ██ . │   │ . . .
 . █████ . . . ██ . │   │ . . .
 . █████ . . . ██ . └───┘ . . .     y 13  covers end
 . . . . . . . ██ . . . . . . .     y 15  spine ends
```

| Part          | Geometry (16-unit grid)        | Meaning                     |
| ------------- | ------------------------------ | --------------------------- |
| Left cover    | filled rect `x1 y3 w5 h10`     | the closed, private record  |
| Spine         | filled rect `x7 y1 w2 h14`     | the binding (commitments)   |
| Right cover   | 1-unit stroke rect `x10 y3 w5 h10` | the public face          |

- The spine is taller than the covers. It is the only element that crosses
  the full height: the binding is what everything else hangs on.
- The left cover is solid. The right cover is an outline. Same size, same
  position, different disclosure.
- Gaps are exactly 1 unit. At 16 px this is 1 device pixel.
- No lock, keyhole, shield, eye, circuit or cube. The mark must be legible as
  pure ink on paper.

Files:

| File                          | Use                                         |
| ----------------------------- | ------------------------------------------- |
| `public/brand/mark.svg`       | Ink mark on light surfaces                  |
| `public/brand/mark-reversed.svg` | Paper mark on ink surfaces              |
| `public/brand/wordmark.svg`   | Mark + outlined `CLOSED BOOK` lettering     |
| `public/favicon.svg`          | Mark; switches to paper in dark UI chrome   |

The wordmark lettering is Instrument Sans SemiBold, uppercase, tracked
+140/1000, converted to outlines so it renders without a font.

### Clear space

Minimum clear space on every side equals the spine width × 2 (4 units on the
16-unit grid, i.e. 25 % of the mark height). Nothing — text, rules, edges —
enters that zone.

### Minimum sizes

| Asset     | Minimum            |
| --------- | ------------------ |
| Mark      | 16 px              |
| Wordmark  | 18 px cap height   |

## 3. Colour

Five tokens. No others.

| Token        | Hex       | Role                                             |
| ------------ | --------- | ------------------------------------------------ |
| `--ink`      | `#0A0A0A` | Text, redaction bars, mark, rules on paper       |
| `--paper`    | `#F1EEE6` | Page ground, reversed text                       |
| `--graphite` | `#6C6A64` | Secondary text, metadata labels                  |
| `--line`     | `#D4D0C7` | Hairline rules, table dividers, field borders    |
| `--signal`   | `#E95136` | Refusal, failure, the one thing that needs you   |

Proportion of the visual field: roughly 80–90 % ink and paper, a little
graphite, signal only where it carries meaning (a FAIL, a refusal, a focus
ring, the single primary action on a page).

Signal is never decorative. If removing the signal colour does not remove
information, it should not be signal.

Contrast (WCAG 2.2):

| Pair              | Ratio   | Use                          |
| ----------------- | ------- | ---------------------------- |
| ink / paper       | 17.1:1  | All body text                |
| graphite / paper  | 4.7:1   | Secondary text (AA)          |
| paper / ink       | 17.1:1  | Reversed panels              |
| signal / ink      | 5.4:1   | Signal text on ink panels    |
| signal / paper    | 3.2:1   | Large text and non-text only |

Graphite on ink (3.7:1) is used only for redaction bars and large
labels. Signal on paper is only used for large type (≥ 24 px) or non-text marks.
Small signal text sits on ink.

## 4. Typography

| Family            | Role                                                           |
| ----------------- | -------------------------------------------------------------- |
| Instrument Serif  | Editorial statements, a few large headings. Never UI.          |
| Instrument Sans   | Interface, navigation, body text.                              |
| IBM Plex Mono     | Commitments, hashes, metadata, status records, labels.         |

Type scale (rem at 16 px root):

| Step       | Size                     | Family      | Use                         |
| ---------- | ------------------------ | ----------- | --------------------------- |
| display    | clamp(3.5, 9vw, 8.5) rem | Serif       | Cover statement only        |
| h1         | clamp(2.5, 5vw, 4) rem   | Serif       | Page titles                 |
| h2         | 2 rem                    | Serif       | Section statements          |
| h3         | 1.125 rem                | Sans 600    | Sub-sections                |
| body       | 1 rem / 1.6              | Sans        | Running text                |
| small      | 0.875 rem                | Sans        | Supporting text             |
| label      | 0.6875 rem, +0.12em, caps| Mono        | Field labels, section codes |
| data       | 0.8125 rem               | Mono        | Hashes, values              |

Rules:

- Serif sets the argument. Sans explains it. Mono records it.
- Labels are uppercase mono with tracking. Values are mono, sentence case.
- Hashes are always mono and always truncated the same way: `0x81af…c904`
  (first 4 bytes, ellipsis, last 2 bytes). Full values are one click away.

## 5. Spacing

Base unit 4 px. Use 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.

Layouts are built on a 12-column grid with a 24 px gutter on desktop, a
4-column grid with 16 px gutter at ≤ 640 px. Documents use a left metadata
column (section code, label) and a right content column, like a report.

## 6. Redaction system

- A redaction bar is a solid `--ink` block with square corners, height equal
  to the line's x-height + ascender (≈ 0.9em), inset from the line box.
- Bars vary in length to suggest real text; lengths are fixed in markup, never
  random per render.
- On ink panels, bars are rendered as `--graphite` on `--ink` so they remain
  visible.
- The only allowed motion is a single horizontal **scan line** passing over a
  redacted block while a computation runs. The redaction never lifts, fades or
  reveals text underneath. There is no text underneath.
- Screen readers hear "redacted" for each bar, never the hidden content.

## 7. Interface principles

1. **Document, not dashboard.** Sections are ruled, numbered and labelled
   like a report. Cards are avoided; hairline rules do the separation.
2. **Square corners.** Border radius is 0 throughout, except focus rings
   which follow the element.
3. **One primary action per view**, in ink with an arrow. Secondary actions
   are text links with an underline.
4. **Status is a record, not a badge.** `VERDICT  PASS` is set as a labelled
   line in mono, not a coloured pill.
5. **Source is always shown.** Every attestation displays where it came from:
   `DEMO ADAPTER`, `MIDNIGHT · LOCAL CIRCUIT`, or `MIDNIGHT · NETWORK`.
6. **Motion is functional.** Status transitions ≤ 200 ms, scan line ≤ 1.2 s.
   All motion is removed under `prefers-reduced-motion`.

## 8. Voice

Short. Declarative. Specific. No adjectives that cannot be verified.

Canonical copy lives in [`COPY.md`](./COPY.md).

## 9. Forbidden

Visual: purple, blue-purple gradients, glassmorphism, glow, neon, blobs,
robots, brains, shields, padlocks, keyholes, cubes, node networks, stock
illustration, sparkle icons, fake logos, fake testimonials, fake metrics,
rounded "SaaS cards", bouncing or springy motion, parallax, big page-load
intros.

Vocabulary: revolutionary, cutting-edge, next-generation, AI-powered,
seamless, transformative, unlock the power of, reimagine, supercharge.

## 10. Screenshot rules

- Capture at 1440 × 900 (desktop) and 390 × 844 (mobile).
- Capture the paper theme. No browser extensions, no dev overlays.
- The verification receipt is captured at 100 % zoom with the source line
  (`DEMO ADAPTER` / `MIDNIGHT`) visible. Never crop the source line out.
- Never capture a state that shows a proof or transaction that did not happen.
