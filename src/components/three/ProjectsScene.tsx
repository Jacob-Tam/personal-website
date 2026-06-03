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
export function ProjectsScene({ look, rotationSpeed }: { look: JourneyLook; rotationSpeed: number }) {
  return (
    <>
      <directionalLight position={[-4, 3, 5]} intensity={2.6} color="#ffffff" />
      {PROJECTS_JOURNEY.planets.map((planet, index) => (
        <JourneyPlanet
          key={index}
          index={index}
          color={planet.color}
          radius={planet.radius}
          rotationSpeed={rotationSpeed}
          look={look}
        />
      ))}
    </>
  )
}
