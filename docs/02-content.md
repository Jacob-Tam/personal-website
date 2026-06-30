# 02 — Content

Every word on the site. This is LOCKED. Use it verbatim. Do not invent, paraphrase,
rewrite, or "improve" copy. If a section seems to need text that isn't here, stop and ask.

## Navigation

Top nav bar. Visible at the top of the page, **hides once the user starts scrolling**
(does not reappear, or reappears only at the very top, see sections doc). Contents:

```
Jacob Tam        work    about    contact    [github icon]    [linkedin icon]
```

(The "Jacob Tam" mark on the left may use the JT logo Jacob is providing.)

Links scroll to the relevant section. GitHub and LinkedIn open in new tabs.

## Hero

Name and tagline, white, centered, fading in on load over the orb.

```
Jacob Tam

Electrical engineering and varsity tennis at Queen's University. I build projects that mix
hardware, code and the occasional bad idea.
```

## Interlude (between Hero and About)

A short full-height section. Near-black. No text (the "Here's some of it." line was removed).
The orb arrives, slows almost to a stop, pulses once, then resumes drifting upward as the user
continues. (Transition-section rework pending.)

## About

Short section. Image of Jacob on the right, text on the left. Three short paragraphs.

```
I'm a third-year electrical engineering student at Queen's and a member of the varsity
tennis team. Most of my work lives at the intersection of embedded systems and computer
vision, turning complex data into real-world hardware solutions.

Currently on a 16-month internship at Hydro One in Toronto, working on the meters and
systems that monitor power usage across Ontario. Last summer I was a software dev at Forum
Asset Management, where I built internal tools and external-facing AI, including an agentic
chatbot for an affiliated non-profit, a LinkedIn bot that auto-generates company posts, and
a dynamic pricing engine for real estate listings.

When I'm not in the lab I'm on the tennis court or trying to recreate a dish I saw
on reels.
```

## Projects

Section title: `Projects`. A large, very faint background word "PROJECTS" sits behind the
cards and scrolls slower than them (parallax). Four projects, 2-column staggered layout.
Each card has: a visual (video or image), title, tagline, and on expand the description +
tech tags.

### 1. Anti-Theft Package Smartbox
- Visual: demo video (~20s highlight loop)
- Tagline: `An IoT box that knows who's stealing your Amazon orders.`
- Description:
```
A package-delivery box with facial recognition and remote unlock. Arduino-driven hardware
(motion sensors, solenoid lock, live camera feed) with a Python ML pipeline running OpenCV
and DeepFace for intruder detection. ~98% recognition accuracy. SQL-backed web interface
for owners.
```
- Tech tags: `Arduino` `Python` `OpenCV` `DeepFace` `SQL` `IoT`

### 2. Autonomous Robot Taxi
- Visual: driving video (~20s highlight loop) + photos available
- Tagline: `A Raspberry Pi car that can read road signs and not crash. Mostly.`
- Description:
```
Built for Queen's autonomous-vehicle competition. Raspberry Pi + Coral USB Accelerator
running a quantized MobileNetV2 for road sign classification, with custom training data and
a mapping algorithm bug that took longer to find than the rest of the pipeline combined.
```
- Tech tags: `Raspberry Pi` `Edge TPU` `TensorFlow` `Computer Vision` `Python`

### 3. Hyperloop Pod Suspension
- Visual: pod test video (~12s; replaced the earlier chassis still)
- Tagline: `Made the pod 56% more efficient and picked up some hardware along the way.`
- Description:
```
Suspension Design Engineer for Queen's Hyperloop. Redesigned the suspension and clamping
mechanism using iterative CAD and FEA, validated through physical testing. Took the design
to Hyperloop Week 2025 and won the most awards nationally at Hyperloop Global 2024.
```
- Tech tags: `CAD` `FEA` `Mechanical Design` `Simulation`

### 4. QHDT Team Platform
- Visual: video (~20s highlight loop) + photos available
- Tagline: `A web app for 100+ teammates to register, organize, and track tasks. Built but never quite reached production.`
- Description:
```
Led full-stack development of a team-management platform for Queen's Hyperloop. Member
registration, sub-team organization, task tracking. Integrated Sentry monitoring and
analytics in prep for deployment. The launch didn't happen, but the build taught me more
about coordinating a real codebase across a team than any class did.
```
- Tech tags: `Full-Stack` `React` `Sentry`

## Contact / Footer

```
Get in touch

jotam916@gmail.com
github   linkedin   resume

© 2026 Jacob Tam. Made with too many Mango Loco Monsters.
```

- Email is a `mailto:` link.
- github / linkedin open in new tabs.
- resume links to the resume PDF (hosted at `/resume.pdf`). Jacob will update it after
  the build; link the current version now.

## Easter egg

Jacob wants one easter egg. Keep it subtle and dry, in keeping with the tone. Suggested
options (pick one, implement quietly, don't document it on the site):
- A console message on load (e.g. a short dry line + the GitHub link).
- A Konami code that does something small and harmless to the orb (e.g. briefly scatters
  all the particles then re-forms them).
Confirm the choice with Jacob before implementing, but it's low priority — do it last.

## Notes / non-text content Jacob is providing
- JT logo (for nav + loading screen)
- Photo of himself (About section)
- Project videos (smartbox, taxi, QHDT) — to be trimmed to ~20s highlight loops
- Hyperloop CAD render + physical pod photo
- resume.pdf