import { JourneyPlanet } from './JourneyPlanet'
import type { JourneyLook } from '../../lib/projectsJourney'
import { PROJECTS_JOURNEY } from '../../lib/constants'

/*
  The Projects "solar system journey" contents, mounted in the main canvas only while the Projects pin
  is engaged (projectsActive). A directional light plus the 4 distinct planets (size + colour from
  PROJECTS_JOURNEY.planets), each flying its own beat of the shared enter/arrive/exit path. The camera
  travel lives in Scene's CameraRig (it has to run whether or not this is mounted, to also restore the
  orb camera). Kept entirely separate from the orb (no shared geometry, no connection).
*/
export function ProjectsScene({
  look,
  rotationSpeed,
  active,
}: {
  look: JourneyLook
  rotationSpeed: number
  active: boolean
}) {
  return (
    <>
      {/* Light stays on whether or not the journey is active (the orb is unlit, so it's inert there);
          keeping the light count constant means materials never recompile at the seam. */}
      <directionalLight position={[-4, 3, 5]} intensity={2.6} color="#ffffff" />
      {/* The planets are gated on `active` (not just their per-frame opacity) so the scene is reliably
          empty the instant the pin releases - the scrub-smoothed progress may still be catching up to
          1, but the planets are already hidden, so nothing freezes over Contact. */}
      <group visible={active}>
        {PROJECTS_JOURNEY.planets.map((planet, index) => (
          <JourneyPlanet key={index} index={index} planet={planet} rotationSpeed={rotationSpeed} look={look} />
        ))}
      </group>
    </>
  )
}
