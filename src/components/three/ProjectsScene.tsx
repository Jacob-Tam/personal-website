import { Planet, type PlanetProps } from './Planet'

/*
  The Projects "solar system journey" contents, mounted in the main canvas only while the Projects
  pin is engaged (projectsActive). Step 1: ONE placeholder planet parked in the right-background, lit
  by a directional light so it shades cleanly. Step 2 brings the 4 distinct planets + the
  camera-through-space travel. Kept separate from the orb (no shared geometry, no connection).
*/
export function ProjectsScene({ planet }: { planet: PlanetProps }) {
  return (
    <>
      <directionalLight position={[-4, 3, 5]} intensity={2.6} color="#ffffff" />
      <Planet {...planet} />
    </>
  )
}
