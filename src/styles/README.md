# Styles architecture

Centralized, predictable CSS. Two folders:

```
src/styles/
├─ sections/   → one CSS file per block component (e.g. HeroBlock.css)
└─ pages/      → one CSS file per page slug (e.g. home.css, about-us.css)
```

## Section styles (`sections/`)

Each block component owns one CSS file with the **same name** and loads it itself:

```astro
---
// src/blocks/HeroBlock.astro
import "../styles/sections/HeroBlock.css";
---
```

Rule: **scope every selector under the block's root class** (e.g. `.block-hero`)
so the globally-bundled file never leaks styles into other sections or pages.
See `sections/HeroBlock.css` as the reference implementation.

## Page styles (`pages/`)

`src/pages/[...slug].astro` auto-loads `src/styles/pages/<slug>.css` for the
matching page (the homepage slug `index` maps to `home.css`). No wiring needed —
just create the file named after the slug.

## Adding a new dynamic section (3 steps, no admin coding)

1. Create the component: `src/blocks/MyBlock.astro` (import `../styles/sections/MyBlock.css`).
2. Create the styles: `src/styles/sections/MyBlock.css` (selectors scoped under `.block-myblock`).
3. Register the schema in **Admin → Section Definitions** (key + component path
   `src/blocks/MyBlock.astro` + fields). The auto-form and Page Builder pick it up
   automatically via the definitions registry — no manual form or builder code.
