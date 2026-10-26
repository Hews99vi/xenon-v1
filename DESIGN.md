---
name: Xenon
description: A white and near-black collection gallery with a precise operational workspace.
colors:
  primary: "#111111"
  ink: "#292929"
  white: "#ffffff"
  smoke: "#f6f6f4"
  muted: "#595959"
  hairline: "#e5e5e5"
  input-border: "#b8b8b8"
  destructive: "#a61b1b"
  workspace: "#f7f7f6"
typography:
  display:
    fontFamily: "Instrument Sans, Arial, sans-serif"
    fontSize: "clamp(2.75rem, 4.7vw, 4.5rem)"
    fontWeight: 450
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Instrument Sans, Arial, sans-serif"
    fontSize: "clamp(2rem, 3.2vw, 3.25rem)"
    fontWeight: 450
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Instrument Sans, Arial, sans-serif"
    fontSize: "clamp(1.5rem, 2.4vw, 2rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Instrument Sans, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Instrument Sans, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.04em"
rounded:
  square: "0px"
  control: "2px"
  panel: "3px"
spacing:
  gutter-mobile: "1.25rem"
  gutter-tablet: "2rem"
  gutter-desktop: "3rem"
  section-sm: "2.5rem"
  section-md: "4rem"
  section-lg: "4.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.5rem"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.5rem"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "0.75rem 0.875rem"
  filter-chip:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary}"
    rounded: "{rounded.square}"
    padding: "0 0.75rem"
  admin-panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary}"
    rounded: "{rounded.panel}"
    padding: "1.5rem"
---

# Design System: Xenon

## Overview

**Creative North Star: "The Collection Gallery"**

Xenon presents clothing through natural photography, white space and measured near-black type. The approved white-and-black direction makes the garments the expressive material; the interface supplies clear choices and quiet, square controls. The original Xenon artwork remains the identity anchor.

The same family, neutrals and control language extend into administration. The workspace trades gallery scale for grouped navigation, labelled fields and explicit revision states. Content, product facts and operational feedback determine the composition.

**Key Characteristics:**

- Image-led collections with readable, compact supporting information.
- One sans family, restrained weight and clear scale.
- Flat surfaces, fine dividers and nearly square controls.
- Visible keyboard focus and recoverable action states.

Captured from local source on **25 October 2026**, following the approved [direction](.impeccable/build/direction.md). Frontmatter is the extracted token contract; runtime values live in [app/globals.css](app/globals.css). Typography loading lives in [app/layout.tsx](app/layout.tsx). [Tailwind config](tailwind.config.ts) maps CSS variables but also retains legacy scales/comments; do not infer current colors from those comments. This system replaces the previous visual baseline. Read [project context](docs/project-context.md), [active component baseline](docs/design-baseline.md) and [verification status](docs/project-status.md) for their separate responsibilities. The sidecar adds preview snippets, motion and breakpoint metadata; synthesized tonal ramps are presentation aids, not new production colors.

## Colors

A neutral interface frames naturally colored photography. Frontmatter names describe roles; legacy `x-ivory` means white, and `x-smoke` means the alternate neutral surface.

### Primary

- **Near Black** (`primary`): primary actions, display text, header controls and the dark footer.
- **Destructive Red** (`destructive`): field errors and destructive operations; pair it with explanatory text.

### Neutral

- **Soft Ink** (`ink`): longer supporting prose.
- **Gallery White** (`white`): storefront canvas, navigation, controls and admin panels.
- **Smoke** (`smoke`): campaign copy and alternate sections.
- **Reading Grey** (`muted`): secondary text, labels and product options.
- **Hairline** (`hairline`): quiet section and panel separation.
- **Field Border** (`input-border`): stronger input edges.
- **Workspace Grey** (`workspace`): admin canvas behind white panels.

**The Photography Rule.** Keep interface chrome neutral; preserve natural garment colors and factual color swatches.

## Typography

**Display and body:** self-hosted Instrument Sans, with Arial and sans-serif fallbacks. The variable font covers weights 400–700; the supplied font and OFL license live in `public/fonts/`. The wordmark is artwork, never typeset text.

The frontmatter captures shared display, headline, title, body and micro-label roles. Use sentence case and medium weights for readable hierarchy. Active section headings use the title size with a lighter weight (450) and tighter tracking (-.03em). Campaign headings use display size with tighter leading (1.02). Shared controls use small text (14px, weight 500); prices use tabular numerals. Body prose may use roomier leading (1.8) with a measured width (70ch); published Markdown is capped at 72ch.

**The Single Family Rule.** Use scale, spacing and weight within Instrument Sans to distinguish editorial and operational content.

## Layout

Shared gutters increase from mobile to tablet at 768px and desktop at 1280px, using the frontmatter spacing roles. Reading/editorial containers can be centered at 1280px. Most gallery sections fill the available width. Active content sections use vertical padding (60px desktop, 40px below 768px); preserve that distinction from the generic section spacing tokens.

The current homepage starts with a copy/photo gallery (38/62 columns, 580px media height). Between 768–1023px it becomes 42/58 with 480px media; below 768px it stacks with photography first (360px), then copy and actions. These are the approved homepage expression, not a mandatory hero for every future page.

Product rows scroll natively in pages of four: four columns above 768px and a 2×2 grid below it. Desktop gaps are 18px; phone gaps are 28px vertically and 12px horizontally. Show labelled arrows only when multiple pages exist and disable them at the edges. Listings use two columns by default, three from 640px and four from 1024px. Product imagery uses a portrait ratio (3:4).

The white storefront header is 68px high, increasing to 88px at 1024px; the announcement is additional. Mobile uses menu/search/bag controls. The dark footer groups real navigation and optional newsletter content without a second promotional hero.

Admin uses a white rail (240px) from 1024px and a grey workspace with responsive main padding (32/24/20px). Below that breakpoint navigation moves into a sheet. Panels hold related fields; tables scroll locally. The website editor retains its sticky revision toolbar and a section browser/editor split from 1280px, stacking below it. Keep revision state, Save draft, Preview and Publish together when actions wrap.

## Elevation & Depth

Gallery surfaces are flat. Depth comes from photography, spacing, borders and alternating neutrals. Do not add decorative shadows to products or every panel. Floating navigation/dialogs may use the established overlay treatment. The sticky editor toolbar has a small functional shadow (`0 6px 20px rgba(0,0,0,.045)`) to distinguish it from scrolling fields.

**The Flat Surface Rule.** Reserve elevation for overlays and persistent controls that need separation from content beneath them.

## Shapes

Use rectangular photography, fine borders (1px) and nearly square controls. The primary shared controls use the frontmatter control radius; admin panels use the panel radius. Product cards remain unboxed. Compact square swatches communicate real variant colors rather than decoration. Preserve the original logo through [BrandLogo](components/BrandLogo.tsx): an SVG viewport crops the supplied black/white PNG artwork without redrawing it. Width is 132px, reducing to 112px below 768px.

## Components

### Buttons

Confident, quiet actions. The storefront primary is near-black on white, minimum height 46px; hover changes to a softer black (`#333`). Secondary actions are white with a neutral border (`#c8c8c8`), becoming smoke with a near-black border on hover. Admin primary controls use a denser height (42px). Text actions retain an underline and comfortable hit area (44px). Disabled states visibly reduce opacity; pending labels explain work in progress. Do not imply success before the actual mutation resolves.

Shared visible focus uses a near-black outline (2px), offset (3px), and white surround (3px). Fields use a dark outline (2px) offset by 2px; Base UI primitives can have their own explicit focus styling. Preserve visible focus on both white and dark surfaces.

### Inputs / Fields

Persistent labels above white fields, minimum height 48px, readable text (16px), strong neutral borders and the shared control radius. Focus strengthens the border; invalid fields use destructive red plus associated error text. Preserve values after recoverable errors and provide an explicit retry path. Disabled fields retain explanatory context. Prefer the active shared store/admin field styles over unmodified registry defaults.

### Chips

Applied filters are rectangular outlined buttons, minimum height 44px, with text and a remove icon. Their accessible names state which filter will be removed. Stronger hover borders distinguish interaction; URL state preserves filtering, sorting and pagination across refresh/back navigation.

### Cards / Containers

Product cards use a portrait image, visible quick-add or choose-options action, name, real variant description, LKR price and color information. Keep sold-out, missing-image, loading, failure and added-to-bag feedback legible. Image hover scaling is restrained (1.02 over 200ms). Admin panels group related work using a white surface, hairline border and responsive padding (24px desktop, 18px mobile), without nested decorative cards.

### Navigation

White header, original black logo, compact sentence-case links and consistent fine-stroke Lucide icons. Current/hover links underline; admin current navigation adds a pale neutral background and medium weight with `aria-current`. Search and mobile menus use Base UI dialogs/sheets with meaningful titles, Escape dismissal and focus return. Keep essential actions visible without hover.

### Revision toolbar and product rows

Website publishing exposes actual unsaved/saved/previewed/published states; stock and prices remain live independently. Do not style an immediate commerce mutation as a website draft action. Product rows use native scrolling, labelled arrows and reduced-motion-aware movement rather than an autoplay presentation.

Transitions are short and functional (160–200ms for common controls/images). The standard easing token is `cubic-bezier(0.16, 1, 0.3, 1)`. Content is visible at rest; reduced motion disables smooth scrolling and reduces animation/transition duration. Accessibility mechanisms and screenshots do not certify WCAG conformance; consult the current status for tested scope.

## Do's and Don'ts

### Do:

- **Do** preserve the original Xenon artwork and natural photography.
- **Do** use the shared neutral tokens and Instrument Sans roles before adding styles.
- **Do** keep keyboard focus visible on light and dark surfaces.
- **Do** preserve real content, variant availability, prices and explicit recovery feedback.
- **Do** keep draft revision actions distinguishable from immediate store operations.
- **Do** inspect current source and responsive screenshots when extending a pattern.

### Don't:

- **Don't** recreate the wordmark using a font or invented artwork.
- **Don't** add gradients, glass panels or decorative shadows to this approved gallery world.
- **Don't** replace real catalog facts with promotional claims or demonstration inventory.
- **Don't** hide essential product actions until hover or remove focus outlines.
- **Don't** treat retained legacy components or Tailwind comments as the active visual baseline.
- **Don't** claim deployment, production verification or accessibility certification from local UI evidence.
