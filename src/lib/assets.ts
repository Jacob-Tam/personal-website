/*
  Single source of truth for non-project asset paths (project media lives in projectsData.ts).
  Everything is a placeholder right now; see ASSETS.md for the swap-in checklist. Drop a real
  file at one of these paths to replace it, no code change needed.

  MEDIA_READY flips the project cards from CSS placeholder posters to the real video/image once
  the files exist under /public/media. Leave false until the trimmed/compressed media is in.
*/
export const MEDIA_READY = false

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
