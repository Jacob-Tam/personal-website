/*
  The four projects as typed data. Copy is VERBATIM from docs/02 (locked). Media paths point
  under /public/media; each project's `media.ready` flips that card from placeholder poster to the
  real file, so assets can land one at a time (a card without its file yet just stays a placeholder).
  See ASSETS.md for the real-file mapping.
*/
export type ProjectMediaKind = 'video' | 'image'

export type Project = {
  id: string
  title: string
  tagline: string
  description: string
  tech: string[]
  media: {
    kind: ProjectMediaKind
    src: string
    alt: string
    ready: boolean // is the real file in /public/media yet? false -> placeholder poster
    cardStart?: number // seconds; where the card preview begins + loops. The expanded view always
    // plays the full clip from 0, so the whole video stays watchable there.
  }
}

export const PROJECTS: Project[] = [
  {
    id: 'smartbox',
    title: 'Anti-Theft Package Smartbox',
    tagline: "An IoT box that knows who's stealing your Amazon orders.",
    description:
      'A package-delivery box with facial recognition and remote unlock. Arduino-driven hardware (motion sensors, solenoid lock, live camera feed) with a Python ML pipeline running OpenCV and DeepFace for intruder detection. ~98% recognition accuracy. SQL-backed web interface for owners.',
    tech: ['Arduino', 'Python', 'OpenCV', 'DeepFace', 'SQL', 'IoT'],
    media: { kind: 'video', src: '/media/smartbox.mp4', alt: 'Anti-Theft Package Smartbox demo', ready: true, cardStart: 67 },
  },
  {
    id: 'taxi',
    title: 'Aylesbury 11 — Autonomous Robot Taxi',
    tagline: 'A Raspberry Pi car that can read road signs and not crash. Mostly.',
    description:
      "Built for Queen's autonomous-vehicle competition. Raspberry Pi + Coral USB Accelerator running a quantized MobileNetV2 for road sign classification, with custom training data and a horizontal-flip bug that took longer to find than the rest of the pipeline combined.",
    tech: ['Raspberry Pi', 'Edge TPU', 'TensorFlow', 'Computer Vision', 'Python'],
    media: { kind: 'video', src: '/media/taxi.mp4', alt: 'Autonomous robot taxi driving demo', ready: true },
  },
  {
    id: 'hyperloop',
    title: 'Hyperloop Pod Suspension',
    tagline: 'Made the pod 56% more efficient and picked up some hardware along the way.',
    description:
      "Suspension Design Engineer for Queen's Hyperloop. Redesigned the suspension and clamping mechanism using iterative CAD and FEA, validated through physical testing. Took the design to Hyperloop Week 2025 and won the most awards nationally at Hyperloop Global 2024.",
    tech: ['CAD', 'FEA', 'Mechanical Design', 'Simulation'],
    media: { kind: 'image', src: '/media/hyperloop.webp', alt: 'Hyperloop pod suspension CAD render', ready: true },
  },
  {
    id: 'qhdt',
    title: 'QHDT Team Platform',
    tagline:
      'A web app for 100+ teammates to register, organize, and track tasks. Built but never quite reached production.',
    description:
      "Led full-stack development of a team-management platform for Queen's Hyperloop. Member registration, sub-team organization, task tracking. Integrated Sentry monitoring and analytics in prep for deployment. The launch didn't happen, but the build taught me more about coordinating a real codebase across a team than any class did.",
    tech: ['Full-Stack', 'React', 'Sentry'],
    media: { kind: 'video', src: '/media/qhdt.mp4', alt: 'QHDT team platform walkthrough', ready: true, cardStart: 39 },
  },
]
