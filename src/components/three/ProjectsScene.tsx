import { JourneyPlanet } from './JourneyPlanet'
import { JourneyStars } from './JourneyStars'
import type { JourneyLook } from '../../lib/projectsJourney'
import { PROJECTS_JOURNEY } from '../../lib/constants'

/*
  The Projects "solar system journey" contents, mounted in the main canvas only while the Projects pin
  is engaged (projectsActive). A directional light, the streaming star corridor (the "flying through
  space" backdrop), and the 4 distinct planets (size + colour from PROJECTS_JOURNEY.planets), each
  flying its own depth-led lane of the shared enter/arrive/exit path. The camera travel lives in Scene's
  CameraRig (it has to run whether or not this is mounted, to also restore the orb camera). Kept entirely
  separate from the orb (no shared geometry, no connection).
*/
export function ProjectsScene({
  look,
  rotationSpeed,
  active,
  camZ,
  starDrift,
  starBoost,
}: {
  look: JourneyLook
  rotationSpeed: number
  active: boolean
  camZ: number
  starDrift: number
  starBoost: number
}) {
  return (
    <>
      {/* Light stays on whether or not the journey is active (the orb is unlit, so it's inert there);
          keeping the light count constant means materials never recompile at the seam. */}
      <directionalLight position={[-4, 3, 5]} intensity={2.6} color="#ffffff" />
      {/* Stars + planets are gated on `active` (not just their per-frame opacity/loop) so the scene is
          reliably empty the instant the pin releases - the scrub-smoothed progress may still be catching
          up to 1, but they are already hidden, so nothing freezes over Contact. */}
      <group visible={active}>
        <JourneyStars active={active} camZ={camZ} drift={starDrift} boost={starBoost} />
        {PROJECTS_JOURNEY.planets.map((planet, index) => (
          <JourneyPlanet key={index} index={index} planet={planet} rotationSpeed={rotationSpeed} look={look} />
        ))}
      </group>
    </>
  )
}
