// Step 2 stub: fixed top bar to establish positioning + z-order. Real nav content
// (name/logo, links, social icons, hide-on-scroll) is built in Step 6.
export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center px-6">
      <span className="font-mono text-label uppercase text-text-mute">nav</span>
    </header>
  )
}
