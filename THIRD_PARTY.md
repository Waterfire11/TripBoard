# Third-Party Code & Assets

This document lists third-party code and assets included in this project and how I use them.

## Code (Libraries and Derived Files)

- **shadcn/ui (MIT)** — https://ui.shadcn.com  
  Local derived UI components under `frontend/src/components/ui/*`. Each file contains a header:
  `/* Derived from shadcn/ui (MIT) — https://ui.shadcn.com */`

- **Radix UI (MIT)** — https://www.radix-ui.com/primitives  
  Used for accessible primitives (Dialog, Dropdown Menu, Tooltip, etc.). If any example code was adapted, the corresponding files include an “Adapted from …” header.

- **@hello-pangea/dnd (MIT)** — https://github.com/hello-pangea/dnd  
  Drag-and-drop behavior. If an official/example snippet was adapted, the corresponding files include an “Adapted from …” header.

- **Tailwind CSS (MIT)** — https://tailwindcss.com  
  Utility-first styling. No source files copied.

- **Icons: lucide-react (MIT)** — https://lucide.dev  
  Icons imported as a dependency. If any SVGs were copied inline, I keep source notes near the assets.

## Maps & Data

- **Mapbox tiles/styles** — Map rendering.  
- **OpenStreetMap contributors (ODbL)** — Base map data.  
  Attribution is displayed in-app via the Mapbox attribution control.

## Fonts

- **Inter (SIL OFL 1.1)** — via `next/font`. No redistribution of font binaries in this repository unless allowed by license.

## Blog / Forum Code Snippets

If any code is adapted from technical blogs or Stack Overflow, I annotate the files with headers including the source URL, author, and license, and I list them in the thesis appendix. Wherever possible we re-implemented logic to avoid license conflicts.
