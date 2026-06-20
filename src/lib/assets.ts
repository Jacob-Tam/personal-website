/*
  Single source of truth for non-project asset paths (project media lives in projectsData.ts).
  Everything is a placeholder right now; see ASSETS.md for the swap-in checklist. Drop a real
  file at one of these paths to replace it, no code change needed.

  MEDIA_READY flips the ABOUT photo (TiltPhoto) from its placeholder block to the real portrait
  once aboutPhoto exists under /public/media. (Project cards have their own per-card `ready` flag in
  projectsData.ts.) Leave false until the portrait is in.
*/
export const MEDIA_READY = true

export const ASSETS = {
  jtLogo: '/jt-logo.png', // nav + loading screen; placeholder is the "Jacob Tam" / "JT" text
  aboutPhoto: '/media/about-jacob.jpg', // ~4:5 portrait
  orbStill: '/media/orb-fallback.jpg', // mobile/low-power static hero (Step 12)
  ogImage: '/og-image.png', // LinkedIn share card (Step 14)
}

// TODO(jacob): real profile URLs. Placeholders point to site roots so they never 404.
export const LINKS = {
  email: 'jotam916@gmail.com',
  github: 'https://github.com',
  linkedin: 'https://www.linkedin.com',
  instagram: 'https://www.instagram.com',
  resume: '/resume.pdf', // current version now; Jacob updates the PDF later
}
