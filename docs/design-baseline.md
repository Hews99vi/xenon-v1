# Current UI baseline

Updated **25 October 2026** after the approved redesign of both storefront and admin. [DESIGN.md](../DESIGN.md) owns reusable visual decisions; [architecture](architecture.md) owns behavior. This describes local source, not deployed services.

## Approved direction and tokens

Premium white/near-black fashion gallery with natural photography, original Xenon logos and self-hosted Instrument Sans (400–700 variable font, OFL). The user approved desktop/mobile browser-rendered previews with “Use this direction”. No generated product photography or invented business claims were added.

| Role | Source value |
| --- | --- |
| Primary / ink / white | `#111111` / `#292929` / `#ffffff` |
| Alternate surface / secondary text | `#f6f6f4` / `#595959` |
| Divider / input border / destructive | `#e5e5e5` / `#b8b8b8` / `#a61b1b` |
| Corners | `--radius: .125rem`; restrained 2–3px shared controls/panels |
| Container gutters | 20px base; 32px ≥768px; 48px ≥1280px |
| Main display | `clamp(2.75rem,4.7vw,4.5rem)`, 450, 1.04, -.04em |
| Section heading | `clamp(1.5rem,2.4vw,2rem)`, 450, 1.2, -.03em |
| Body / small / micro | 16 / 14 / 12px; body line height 1.6 |
| Controls | Shared buttons 46px; icon actions ≥44px; inputs 48px and 16px text |

`app/globals.css` defines tokens inside `@layer base` so responsive gutter rules win. `--xenon-*`, historical `--x-*` names and legacy utility classes remain compatibility aliases. Tailwind uses CSS variables; component literal neutral values remain part of the implementation. Scoped storefront/admin rules tone down older uppercase/bold classes. Prefer semantic shared classes for new work rather than adding another cascade override.

## Layout and interaction

| Surface | Delivered pattern |
| --- | --- |
| Header | Sticky white, 88px desktop / 68px mobile, supplied logo, matching-data audience navigation, Base UI search/menu and bag |
| Hero / campaign | Desktop 38/62 copy/photo, 580px primary image; mobile photo first at 360px, copy/actions below; optional image crop/mobile source preserved |
| Product rows | Native horizontal pages of four; 4 columns desktop, 2×2 mobile; arrows appear only with another page |
| Categories / occasions | Photo-led horizontal tiles; editor-selected order/links retained |
| Story | Quiet two-column photo/copy, stacked image-first mobile; published values below heading |
| Listing | Two columns mobile, three ≥640px, four ≥1024px; stable filter sheet, result count, sort and removable URL filters |
| Detail | Product gallery and variant/stock/price controls, related products, published guide/returns, zoom dialog |
| Bag / checkout | White side sheet; summary-first checkout mobile; two columns ≥1024px; immediate submission guard and explicit request recovery |
| Admin | White 240px desktop rail, grey workspace, mobile dialog navigation, labelled grouped forms, locally scrolling tables |
| Website editor | Persistent revision toolbar, section browser/editing split ≥1280px, stacked below; exact draft preview marker retained |
| Reading pages | Centered readable column, measured heading, sanitized published Markdown |

LKR prices in the shared product formatter show two decimals. Product-level listing prices and actual variant purchase prices retain existing precedence. A blank admin variant price still defaults to product base price; it is not a new discount rule.

## Active components and retained alternatives

| Surface | Current component path |
| --- | --- |
| Header/footer | `components/storefront/SiteHeader.tsx`, `SiteFooter.tsx` |
| Homepage sections | `components/content/HomeSections.tsx` |
| Current product carousel/row | `components/content/ProductRow.tsx` using native horizontal scrolling and arrows |
| Product card/quick add | `components/storefront/ProductCard.tsx` |
| Collection/filters | `CollectionPage.tsx`, `ProductFilters.tsx` |
| Product variants/gallery/guide | `ProductDetailClient.tsx` |
| Bag | `components/cart/CartDrawer.tsx` |
| Admin shell/navigation | `app/admin/AdminLayout.tsx`, `components/admin/AdminNavigation.tsx` |
| Website editor | `app/admin/website/WebsiteEditor.tsx` and its field/picker/media helpers |
| Shared interaction primitives | `components/ui/` and `components/admin/` |

`HeroSection`, `LatestCarousel`, `EditorialBanner`, `CategoryGrid`, `OccasionSection` and `AtelierSection` in `components/storefront/` have no current static local importers in the reviewed tree. `LatestCarousel`/`CategoryGrid` contain Embla implementations and `HeroSection` uses Motion, but editing them will not update the current homepage. Confirm reachability again before removing or reusing anything. Do not delete retained work during a visual task without reviewing its purpose.

Product cards are rectangular 3:4 images with a subtle hover scale (1.02), a visible quick-add/choose-options action, swatches or text color names, product/variant details, LKR price and status feedback. Product cards are not decorative mock inventory. Missing image and sold-out states exist.

Hero/campaign text and buttons, row sources, category/occasion links, story content, navigation, announcement, footer and newsletter visibility/copy come from the site payload. Product facts come from catalog queries. Keep these ownership boundaries when changing composition.

## Accessibility and evidence

Shared focus uses a dark outline with a white inner surround, so solid black actions remain visible against light/dark surfaces. Form errors retain field associations; modal sheets use Base UI `render`/`finalFocus`, Escape and focus return. Motion is restrained, content is visible by default, and reduced-motion rules disable smooth/animated movement. These mechanisms do not establish WCAG certification.

Current browser evidence is under `.impeccable/review/`, with local PostgreSQL/PostgREST and test-only Auth. Store/editor widths 360/390/768/1024/1440 have screenshots and overflow assertions, plus mobile shopping/operational screens. The approved previews are under `.impeccable/mocks/`. See [project status](project-status.md) for actual check results and limits. Historical `docs/screenshots/` remain attached to the 9 October validation report and are not the redesigned UI.

## Product Photography editor

Product forms now show saved thumbnails, labelled alternative text, main-image state, replacement/removal/Undo and keyboard move controls. A flat two-column desktop list becomes one column at narrower widths. New/replacement previews are visibly staged until the product saves; failures preserve them. Broken thumbnails retain working controls. This extends the current token system without changing global design rules. See [product image management](product-image-management.md) for save, navigation and cleanup behavior.
