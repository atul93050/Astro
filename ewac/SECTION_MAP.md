# EWAC Section Map

Modular breakdown of the EWAC homepage template. Each section lives under `sections/<Name>/` with three files: `<Name>.html`, `<Name>.css`, `<Name>.js`.

---

## Shared / Global Files

| File | Purpose |
|------|---------|
| `styles/variables.css` | CSS custom properties (`:root` — `--color-primary`, `--color-dark-blue`, etc.) |
| `styles/global.css` | Reset, `html`/`body` base styles, `overflow-x: hidden` |
| `styles/animations.css` | `@keyframes gearCW`, `gearCCW`, `whyZoom`, `vsScrollUp`, `vsScrollDown` |
| `styles/responsive.css` | All media queries (1600px → 480px) consolidated here |
| `scripts/utils.js` | `setNavOffset()` — sets `--nav-offset` CSS var for mega dropdown full-viewport positioning |
| `assets/fonts/fonts.css` | Frutiger LT Std/Pro `@font-face` declarations (untouched original) |

---

## Layout

### Header
| File | Contents |
|------|---------|
| `layout/Header/Header.html` | TopBar news bar + `<header>` with desktop mega-dropdown nav + overlay + mobile menu |
| `layout/Header/Header.css` | `.header`, `.nav`, `.dropdown-mega`, `.mega-inner`, `.mega-cards-grid`, `.mobile-menu`, `.overlay` |
| `layout/Header/Header.js` | Mobile open/close, submenu toggle, scroll handler hiding mega dropdowns |

**Dependencies:** jQuery, Font Awesome (chevron icons), Bootstrap (grid utilities)

### Footer
| File | Contents |
|------|---------|
| `layout/Footer/Footer.html` | Social icons, nav columns, footer logo, copyright bar |
| `layout/Footer/Footer.css` | `.ewac-footer`, `.footer-top`, `.footer-links`, `.footer-col`, `.footer-bottom` |
| `layout/Footer/Footer.js` | _(placeholder — no interactive JS required)_ |

**Dependencies:** Font Awesome (brand icons), Bootstrap (grid)

---

## Sections

### TopBar
| File | Contents |
|------|---------|
| `sections/TopBar/TopBar.html` | `<div class="top-bar">` — news notification bar with CTA link |
| `sections/TopBar/TopBar.css` | `.top-bar`, `.top-header` |
| `sections/TopBar/TopBar.js` | _(placeholder)_ |

**Note:** TopBar HTML is included inside `layout/Header/Header.html` in the assembled page.

---

### Hero
| File | Contents |
|------|---------|
| `sections/Hero/Hero.html` | `<section class="home-banner">` — Slick carousel with `.banner-slider`, counter div |
| `sections/Hero/Hero.css` | `.slick-slideshow__slide`, `.banner-desktop`/`.banner-mob`, `.home-banner`, `.counter` |
| `sections/Hero/Hero.js` | Slick init for `.banner-slider`, `setSlideVisibility()`, counter interval |

**Dependencies:** jQuery, Slick Carousel  
**Images:** `sugar-plant.jpg`, `steel-industry.jpg`, mobile variants

---

### About
| File | Contents |
|------|---------|
| `sections/About/About.html` | `<section class="about-section" id="about-stats">` — gear SVGs, welding GIF, about paragraph, stats row |
| `sections/About/About.css` | `.about-section`, `.about-gear-bg`, `.gear1/2/3` (uses `gearCW`/`gearCCW` from `animations.css`), `.about-men-bg`, `.about-para`, `.stats-row`, `.stat-item`, `.stat-number` |
| `sections/About/About.js` | `animateCounter()`, `IntersectionObserver` for stats, GSAP `wrapTextNodesWithSpans()` for about-para word color animation |

**Dependencies:** jQuery, GSAP + ScrollTrigger  
**Shared animations:** `@keyframes gearCW`, `gearCCW` from `styles/animations.css`  
**Images:** `about-gear1.svg`, `about-gear2.svg`, `Welding_Animation.gif`, `icon1-4.svg`

---

### Products
| File | Contents |
|------|---------|
| `sections/Products/Products.html` | `<section class="products-section">` — 4-card grid |
| `sections/Products/Products.css` | `.products-section`, `.products-grid`, `.product-card` (opacity:0 initial), `.product-card.card-visible`, `.product-img-wrap`, `.product-name`, `.product-link` |
| `sections/Products/Products.js` | `IntersectionObserver` adding `.card-visible` with staggered `transitionDelay` |

**Dependencies:** None (vanilla JS `IntersectionObserver`)  
**Images:** `products1-4.png`

---

### Services
| File | Contents |
|------|---------|
| `sections/Services/Services.html` | `<section class="services-section">` — header row + Slick slider `#mainServicesSlider` |
| `sections/Services/Services.css` | `.services-section`, `.services-header`, `.svc-arrow`, `.services-slider`, `.svc-card`, `.svc-img-wrap`, `.svc-name`, `.svc-desc`, `.svc-link` |
| `sections/Services/Services.js` | Slick init for `.services-slider` (slidesToShow: 3), `#svcPrev`/`#svcNext` click handlers |

**Dependencies:** jQuery, Slick Carousel  
**Shared CSS:** `.services-slider`, `.svc-card`, `.svc-img-wrap`, `.svc-name` — reused by Blogs, News, CaseStudies sections (override in `Blogs.css`)  
**Images:** `turnkey-solutions1-3.png`

---

### Solutions
| File | Contents |
|------|---------|
| `sections/Solutions/Solutions.html` | `<section class="solution-section">` — gear decorations, left tab list, right pane with per-tab Slick sliders |
| `sections/Solutions/Solutions.css` | `.solution-section`, `.solution-gears`, `.solution-left`, `.sol-tab-list`, `.sol-tab-item`, `.solution-right`, `.sol-dropdown-wrap`, `.sol-pane`, `.sol-prod-item`, `.sol-view-all` |
| `sections/Solutions/Solutions.js` | `solSlickOpts()`, `initSolSlider()`, tab click handler, `#solDropdown` change handler, prev/next arrow handlers |

**Dependencies:** jQuery, Slick Carousel  
**Shared animations:** `@keyframes gearCW`, `gearCCW` from `styles/animations.css`  
**Images:** `solution1-3.png`, `about-gear1.svg`, `about-gear2.svg`, `Welding_Animation.gif`

---

### Industries
| File | Contents |
|------|---------|
| `sections/Industries/Industries.html` | `<section class="industries-section">` — Slick carousel, `ind-prev`/`ind-next` buttons |
| `sections/Industries/Industries.css` | `.industries-section { background: url("../../assets/images/serve-bg.jpg") }`, `.ind-heading`, `.ind-arrow`, `.ind-card`, `.ind-label` |
| `sections/Industries/Industries.js` | Slick init for `.industries-slider` (slidesToShow: 4), custom arrows `$('.ind-prev')` / `$('.ind-next')` |

**Dependencies:** jQuery, Slick Carousel  
**CSS path note:** Background image `url()` is relative to the CSS file — uses `../../assets/images/serve-bg.jpg`  
**Images:** `serve1-4.png`, `serve-bg.jpg`

---

### WhyChoose
| File | Contents |
|------|---------|
| `sections/WhyChoose/WhyChoose.html` | `<section class="why-section">` — gear decorations, tab nav (6 tabs), 6 panes with images + overlay text |
| `sections/WhyChoose/WhyChoose.css` | `.why-section`, `.why-gears`, `.why-tab-nav`, `.why-tab`, `.why-pane`, `.why-pane-overlay`, `.why-pane:after` gradient. `.why-dropdown-wrap { display: none }` (shown via responsive.css at mobile) |
| `sections/WhyChoose/WhyChoose.js` | `.why-tab` click → activate pane, `#whyDropdown` change handler for mobile |

**Dependencies:** None (vanilla JS)  
**Shared animations:** `@keyframes gearCW`, `gearCCW` from `styles/animations.css`  
**Images:** `R-&-D.jpg`, `training.jpg`, `turnkey-solutions.jpg`, `legacy.jpg`, `pan-india-network.jpg`, `trusted-quality.jpg`, `logo-m.svg`, `about-gear1.svg`, `about-gear2.svg`

---

### Blogs
| File | Contents |
|------|---------|
| `sections/Blogs/Blogs.html` | `<section class="uni-slider-section blog">` — welding GIF, heading, Slick slider |
| `sections/Blogs/Blogs.css` | **Base styles for ALL uni-slider sections**: `.uni-slider-section`, `.heading-back-wrap`, `.uni-slider-wrap`, `.uni-slider-heading`, `.blogs-view-all`, `.uni-slider-section .svc-name { color: #000 }` override, `.red-color` and `.case-study` variant modifiers |
| `sections/Blogs/Blogs.js` | _(placeholder — sliders initialized by `Services.js` which targets `.services-slider`)_ |

**Dependencies:** jQuery, Slick Carousel (via Services.js)  
**Shared CSS note:** `.services-slider` / `.svc-card` base styles are in `Services.css` and are reused here. `Blogs.css` overrides text color for light background.  
**Images:** `blog1-3.png`, `Welding_Animation.gif`

---

### News
| File | Contents |
|------|---------|
| `sections/News/News.html` | `<section class="uni-slider-section red-color">` — gear decorations in `.uni-men-bg` |
| `sections/News/News.css` | Only `.red-color .uni-men-bg` positioning override (base styles in `Blogs.css`) |
| `sections/News/News.js` | _(placeholder)_ |

**Dependencies:** Inherits from Blogs.css + Services.css  
**Modifier class:** `.red-color` — applies red background and adjusted gear decorations  
**Images:** `news1-3.png`, `about-gear1.svg`, `about-gear2.svg`

---

### CaseStudies
| File | Contents |
|------|---------|
| `sections/CaseStudies/CaseStudies.html` | `<section class="uni-slider-section case-study">` — welding GIF |
| `sections/CaseStudies/CaseStudies.css` | Only `.case-study { margin-bottom: 0px }` override |
| `sections/CaseStudies/CaseStudies.js` | _(placeholder)_ |

**Dependencies:** Inherits from Blogs.css + Services.css  
**Modifier class:** `.case-study` — white background variant with no bottom margin  
**Images:** `case1-3.png`, `Welding_Animation.gif`

---

### Clients
| File | Contents |
|------|---------|
| `sections/Clients/Clients.html` | `<section class="clients-section">` — two continuous-scroll logo rows |
| `sections/Clients/Clients.css` | `.clients-section`, `.logo-slide`, `.logo-slider-2 { transform: scaleX(-1) }`, `.logo-slider-2 .logo-slide img { transform: scaleX(-1) }` |
| `sections/Clients/Clients.js` | Slick init for both `.logo-slider-1` and `.logo-slider-2` with `cssEase: 'linear'`, `autoplaySpeed: 0`, `speed: 4000` (continuous scroll effect) |

**Dependencies:** jQuery, Slick Carousel  
**Reverse row trick:** `.logo-slider-2` is flipped with `scaleX(-1)` on container to scroll right→left, then each logo is flipped back with `scaleX(-1)` to remain readable.  
**Images:** `client1-20.svg`

---

### FAQ
| File | Contents |
|------|---------|
| `sections/FAQ/FAQ.html` | `<section class="faq-section">` — gear decorations, welding man, accordion items |
| `sections/FAQ/FAQ.css` | `.faq-section`, `.faq-gears-left`, `.faq-men`, `.faq-deco-right`, `.faq-question`, `.faq-icon`, `.faq-answer { max-height: 0; overflow: hidden }`, `.faq-item.active .faq-icon { transform: rotate(180deg) }` |
| `sections/FAQ/FAQ.js` | IIFE: opens first item on load, `.faq-question` click accordion handler using `scrollHeight` |

**Dependencies:** jQuery, Font Awesome (chevron-down icon)  
**Shared animations:** `@keyframes gearCW`, `gearCCW` from `styles/animations.css`  
**Images:** `gear4.svg`, `Welding_Animation.gif`, `about-gear1.svg`, `about-gear2.svg`

---

### CTA
| File | Contents |
|------|---------|
| `sections/CTA/CTA.html` | `<section class="cta-banner">` — overlay div, heading, subtext, CTA button |
| `sections/CTA/CTA.css` | `.cta-banner { background: url("../../assets/images/portrait-asian-girl.png") }`, `.cta-overlay` gradient, `.cta-btn` |
| `sections/CTA/CTA.js` | _(placeholder — no interactive JS required)_ |

**CSS path note:** Background image `url()` is relative to CSS file — uses `../../assets/images/portrait-asian-girl.png`  
**Images:** `portrait-asian-girl.png`

---

## CSS Load Order (pages/index.html)

1. Bootstrap 5 CDN
2. Font Awesome 6 CDN
3. Slick Carousel CDN (slick.css + slick-theme.css)
4. `assets/fonts/fonts.css`
5. `styles/variables.css`
6. `styles/global.css`
7. `styles/animations.css`
8. `layout/Header/Header.css`
9. `layout/Footer/Footer.css`
10. `sections/TopBar/TopBar.css`
11. `sections/Hero/Hero.css`
12. `sections/About/About.css`
13. `sections/Products/Products.css`
14. `sections/Services/Services.css` ← defines `.svc-card`, `.services-slider`
15. `sections/Solutions/Solutions.css`
16. `sections/Industries/Industries.css`
17. `sections/WhyChoose/WhyChoose.css`
18. `sections/Blogs/Blogs.css` ← overrides `.svc-name` color for uni-slider sections
19. `sections/News/News.css`
20. `sections/CaseStudies/CaseStudies.css`
21. `sections/Clients/Clients.css`
22. `sections/FAQ/FAQ.css`
23. `sections/CTA/CTA.css`
24. `styles/responsive.css` ← MUST be last to override all above

---

## JS Load Order (pages/index.html)

1. jQuery 3.7.1 CDN
2. Slick Carousel CDN
3. GSAP 3.12.2 CDN
4. ScrollTrigger CDN
5. `scripts/utils.js`
6. `sections/Hero/Hero.js`
7. `sections/Clients/Clients.js`
8. `sections/About/About.js`
9. `sections/Products/Products.js`
10. `sections/Services/Services.js` ← also initializes `.services-slider` in Blogs/News/CaseStudies
11. `sections/Solutions/Solutions.js`
12. `sections/Industries/Industries.js`
13. `sections/WhyChoose/WhyChoose.js`
14. `sections/FAQ/FAQ.js`
15. `layout/Header/Header.js`

---

## Key Shared CSS Classes

| Class | Defined in | Also used by |
|-------|-----------|-------------|
| `.services-slider` | Services.css | Blogs, News, CaseStudies sections |
| `.svc-card` | Services.css | Blogs, News, CaseStudies sections |
| `.svc-img-wrap` | Services.css | Blogs, News, CaseStudies sections |
| `.svc-name` | Services.css | Blogs, News, CaseStudies (color overridden in Blogs.css) |
| `.about-men-bg` | About.css | Solutions section (with override in Solutions.css) |
| `@keyframes gearCW` | animations.css | About, Solutions, WhyChoose, FAQ |
| `@keyframes gearCCW` | animations.css | About, Solutions, WhyChoose, FAQ |

---

## External CDN Dependencies

| Library | Version | Used by |
|---------|---------|--------|
| Bootstrap | 5.0.2 | Layout grid throughout |
| Font Awesome | 6.5.1 | Nav arrows, footer icons, FAQ chevron |
| jQuery | 3.7.1 | All interactive sections |
| Slick Carousel | 1.8.1 | Hero, Services, Solutions, Industries, Blogs/News/CaseStudies, Clients |
| GSAP | 3.12.2 | About section word animation |
| ScrollTrigger | 3.12.2 | About section scroll-driven animation |

---

## Astro Migration Notes

When converting to Astro components:
- Each `sections/<Name>/` folder maps to an Astro component `<Name>.astro`
- `layout/Header/` → `layouts/Header.astro`, `layout/Footer/` → `layouts/Footer.astro`
- Scoped `<style>` in each `.astro` file replaces `<Name>.css`
- `<script>` tag inside `.astro` replaces `<Name>.js` (Slick/jQuery must be loaded globally via `<head>` or `base.astro`)
- `styles/variables.css` → `src/styles/global.css` with `:root` vars imported in base layout
- `styles/responsive.css` → merge into component `<style>` blocks or keep as global import
