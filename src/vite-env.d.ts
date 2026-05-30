/// <reference types="vite/client" />

// Side-effect CSS imports from the Geist font packages have no bundled type
// declarations; these let TypeScript resolve the bare specifiers.
declare module '@fontsource-variable/geist'
declare module '@fontsource-variable/geist-mono'
