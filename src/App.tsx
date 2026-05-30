import { GrainOverlay } from './components/shared/GrainOverlay'

/*
  Step 1 specimen only. Confirms the design tokens, the Geist + Geist Mono fonts, and the
  grain overlay all render on the near-black background. This is NOT the real hero; it gets
  replaced by the actual sections starting in Step 2.
*/
function App() {
  return (
    <>
      <GrainOverlay />
      <main className="relative z-20 flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="font-mono text-label uppercase text-text-mute">01 — tokens · fonts · grain</p>
        <h1 className="text-display text-text">Jacob Tam</h1>
        <p className="max-w-xl text-body-lg text-text-mute">
          Electrical engineering and varsity tennis at Queen's. I build things that mix
          hardware, code, and the occasional bad idea.
        </p>
        <div className="h-px w-24 bg-accent" />
      </main>
    </>
  )
}

export default App
