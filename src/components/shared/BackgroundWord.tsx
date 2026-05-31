type BackgroundWordProps = { children: string; className?: string }

/*
  Giant, very faint section word sitting behind the content as a deep background layer (docs/06 -
  the Projects "PROJECTS" treatment, reused for About + Contact). Non-interactive. The host
  section must be `relative overflow-hidden`, and the content must be a positioned (relative)
  layer so it paints above this word. Position is passed per caller via className.
*/
export function BackgroundWord({ children, className }: BackgroundWordProps) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute select-none text-[22vw] font-semibold leading-none tracking-tighter text-text/5 ${className ?? ''}`}
    >
      {children}
    </span>
  )
}
