# ASSETS.md — placeholder → real file checklist

Most visual assets are real now; a few are still placeholders (see Status column). This is the
swap-in list: each row is one asset, the exact path it must live at, the expected shape (aspect
ratio / rough duration), and which real file from `Assets/` (your raw stash, gitignored) it uses.

When a real file is ready: trim/compress it, drop it at the **Target path**, and flip its readiness
flag (project cards: `media.ready` in projectsData.ts; About photo: `MEDIA_READY` in lib/assets.ts).
Each project card has its own `ready` flag, so assets can land one at a time.

Convention:
- Logo, resume, favicon, OG image → `/public/` root.
- Project media, photos, renders → `/public/media/`.
- Videos: H.264 MP4, muted, compressed. A card preview can start + loop at a highlight via
  `media.cardStart` (seconds) in projectsData.ts; the expanded view always plays the full clip from 0.
- Images: WebP/JPG, sized to display dimensions.

## Where paths live (single source of truth)
- `src/lib/assets.ts` — every non-project asset path (logo, about photo, resume, OG, mobile
  orb still). *(Created in Step 6 when media is first referenced.)*
- `src/components/projects/projectsData.ts` — the 4 projects, each with its media path.
Change the path in one of those two files and nowhere else.

## Checklist

| Asset | Target path | Shape | Status | Real file (in `Assets/`) |
|---|---|---|---|---|
| JT logo (nav + loading) | `/public/jt-logo.png` | square-ish, transparent | ⏳ placeholder (text "JT") | `JTlogo.png` (ready, recommend a smaller/SVG export) |
| About photo | `/public/media/about-jacob.jpg` | portrait ~4:5 | ✅ live | `About.JPG` (4320×3240 → resized to 1500px, center-crops to 4:5) |
| Smartbox video | `/public/media/smartbox.mp4` | 16:9, full clip | ✅ live (full 108s, 3.0MB; card preview starts/loops at 1:07) | `TheBox (1).mp4` (1920×1080 → 1280×720) |
| Taxi video | `/public/media/taxi.mp4` | 16:9, ~20s loop | ✅ live | `Taxi.MOV` (portrait 28s → center-cropped to 16:9 1280×720, 4.2MB) |
| QHDT video | `/public/media/qhdt.mp4` | 16:9, full clip | ✅ live (full 107s, 1.9MB; card preview starts/loops at 0:39) | `QHDTWebsite.mp4` (1280×720, audio stripped) |
| Hyperloop CAD render | `/public/media/hyperloop.webp` | landscape ~16:9 | ✅ live (portrait source, center-crops) | `Hyperloop.webp` (ready; a landscape export would seat better) |
| Hyperloop pod photo (secondary, expanded view) | `/public/media/hyperloop-pod.jpg` | landscape | none yet (optional) | **not identified yet** — owe me this |
| Resume | `/public/resume.pdf` | PDF | link points to missing file | **not in `Assets/` yet** — owe me this |
| Mobile/low-power hero still (orb) | `/public/media/orb-fallback.jpg` | landscape, full-bleed | none yet | exported from the desktop scene later (Step 12) |
| OG share image (LinkedIn) | `/public/og-image.png` | 1200×630 | none yet | created in Step 14 |
| Favicon | `/public/favicon.svg` | square | Vite default logo | derive from JT logo (Step 14) |

## Unmapped extras currently in `Assets/`
- `ElevenLabs_video_kling-3-0_..._.mp4` (15MB) — the Kling video. **Cut for v1** (see
  docs/09-non-goals). Not used. Leave it out.
- `Gemini_Generated_Image_...png` + `Screenshot ...6.54.02 PM.png` — Smartbox wiring diagrams.
  Candidates for the Smartbox expanded-view secondary image. Tell me if you want one used.
- `Screenshot ...9.45.16 PM.png`, `927C…jpeg`, `BEDE…jpeg` — taxi-competition stills (the taxi
  video is live, so these are spare; usable as taxi expanded-view secondary if wanted).
- `5FD4…jpeg`, `EB83…jpeg` — older personal/dorm shots; About now uses `About.JPG` instead.
