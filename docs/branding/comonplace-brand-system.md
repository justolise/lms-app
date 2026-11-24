# ComonPlace Brand & Visual Design System

## Brand Identity
- **Name:** `ComonPlace` (always spelled `ComonPlace` — never `Commonplace`, `CommonPlace`, `Comon Place`, or `Comonplace`).
- **Tagline:** **Knowledge. Community. Opportunity.**
- **Hero Heading:** **A place for knowledge. A place for everyone.**
- **Logo Mark:** Open book forming the letter **C** (`bookc`), rendered via the shared `<ComonPlaceLogo />` component (`apps/web/components/brand/comonplace-logo.tsx`).

## Approved Colour Palette
| Role | Token | Hex |
|---|---|---|
| Primary Brand (Deep Green) | `--brand-green` / `--primary` | `#173F35` |
| Accent (Warm Gold) | `--brand-gold` / `--accent` | `#E9C982` |
| Primary Background (Warm Ivory) | `--brand-ivory` / `--background` | `#F7F4EC` |
| Primary Text (Slate) | `--brand-slate` / `--foreground` | `#293B43` |

Design tokens are centralized in `apps/web/app/globals.css` with dark-mode equivalents and `prefers-reduced-motion` support.

## Typography
- **Headings / Display:** `Lora` (`--font-lora`, `font-serif`)
- **Body / UI:** `Manrope` (`--font-manrope`, `font-sans`)
- Loaded via `next/font/google` in `apps/web/app/layout.tsx` with `display: "swap"`.

## Brand Assets (`apps/web/public/`)
- `apps/web/public/brand/comonplace-logo.png` — Primary lockup
- `apps/web/public/brand/comonplace-mark.png` — Symbol-only mark (`192x192`)
- `apps/web/public/brand/favicon/` — `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `favicon-light-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`
- `apps/web/public/favicon.ico` — Root favicon
- `apps/web/public/images/comonplace-library-hero.webp` — Default platform hero visual (`836x470` WebP)
