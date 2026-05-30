# ASSETS.md — placeholder → real file checklist

Every visual asset on the site is a **placeholder** right now. This is the swap-in list:
each row is one asset, the exact path it must live at, the expected shape (aspect ratio /
rough duration), and which real file from `Assets/` (your raw stash, gitignored) replaces it.

When a real file is ready: trim/compress it, drop it at the **Target path**, and the site
picks it up with no code change (paths are centralized — see "Where paths live" below).

Convention:
- Logo, resume, favicon, OG image → `/public/` root.
- Project media, photos, renders → `/public/media/`.
- Videos: ~20s highlight loops, H.264 MP4, muted, compressed (target < ~5MB each).
- Images: WebP/JPG, sized to display dimensions.

## Where paths live (single source of truth)
- `src/lib/assets.ts` — every non-project asset path (logo, about photo, resume, OG, mobile
  orb still). *(Created in Step 6 when media is first referenced.)*
- `src/components/projects/projectsData.ts` — the 4 projects, each with its media path.
Change the path in one of those two files and nowhere else.

## Checklist

| Asset | Target path | Shape | Placeholder now | Real file (in `Assets/`) |
|---|---|---|---|---|
| JT logo (nav + loading) | `/public/jt-logo.png` | square-ish, transparent | text "JT" in Geist | `JTlogo.png` (ready, 4.8MB — recommend exporting a smaller/SVG version) |
| About photo | `/public/media/about-jacob.jpg` | portrait ~4:5 | gray block, labeled | one of the `.jpeg` files — **you pick which** |
| Smartbox video | `/public/media/smartbox.mp4` | 16:9, ~20s loop | solid poster + play affordance | `TheBox (1).mp4` (114MB raw — **trim to ~20s + compress**) |
| Taxi video | `/public/media/taxi.mp4` | 16:9, ~20s loop | solid poster + play affordance | **not in `Assets/` yet** — owe me this |
| QHDT video | `/public/media/qhdt.mp4` | 16:9, ~20s loop | solid poster + play affordance | `QHDTWebsite.mp4` (1.9MB — trim to ~20s) |
| Hyperloop CAD render | `/public/media/hyperloop.webp` | landscape ~16:9 | gray block, labeled | `Hyperloop.webp` (ready) |
| Hyperloop pod photo (secondary, expanded view) | `/public/media/hyperloop-pod.jpg` | landscape | none yet (optional) | **not identified yet** — owe me this |
| Resume | `/public/resume.pdf` | PDF | link points to missing file | **not in `Assets/` yet** — owe me this |
| Mobile/low-power hero still (orb) | `/public/media/orb-fallback.jpg` | landscape, full-bleed | none yet | exported from the desktop scene later (Step 12) |
| OG share image (LinkedIn) | `/public/og-image.png` | 1200×630 | none yet | created in Step 14 |
| Favicon | `/public/favicon.svg` | square | Vite default logo | derive from JT logo (Step 14) |

## Unmapped extras currently in `Assets/`
- `ElevenLabs_video_kling-3-0_..._.mp4` (15MB) — the Kling video. **Cut for v1** (see
  docs/09-non-goals). Not used. Leave it out.
- `Gemini_Generated_Image_i91chki91chki91c.png` (6.9MB) — purpose unclear. Candidate for the
  mobile orb still or decorative. Tell me if/where you want it.
- `Screenshot 2026-05-23 at 6.54.02 PM.png`, `Screenshot 2026-05-23 at 9.45.16 PM.png` —
  likely project stills. Tell me which project each belongs to if you want them used.
- The four `*.jpeg` files — candidates for the About photo. Pick one.
