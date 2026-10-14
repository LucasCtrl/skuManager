# Design

Code: `src/mainview/index.css`, `tailwind.config.js`, `src/mainview/components/`.

- Source: claude.ai/design project `e70d7491-8321-4fdb-814a-234704263591` (one `.dc.html` per screen).
- Colours are CSS variables in `src/mainview/index.css` (light from the design, dark derived), exposed as Tailwind colours (`bg-surface`, `text-muted`, `bg-accent`, …). Don't use raw hex or `dark:` variants in components.
- IBM Plex Sans and Mono are bundled via `@fontsource`. The app must work offline.
- Shared pieces live in `src/mainview/components/`: class names for buttons and fields in `styles.ts`, icons, Modal, status badge/history/picker, search field, filter chips.
