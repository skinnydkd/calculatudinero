# CalculaTuDinero.es — Claude Code Instructions

## Project
Spanish financial calculator website built with Astro 6 + Preact.
Deployed on Cloudflare Pages. All content in Spanish (es-ES).

## Commands
- `pnpm dev` — Start dev server
- `pnpm build` — Build for production
- `pnpm preview` — Preview production build

## Architecture
- Static pages: Astro components (.astro)
- Interactive calculators: Preact islands (.tsx) in /src/components/calculators/
- Financial logic: Pure TypeScript in /src/lib/calculations/
- Regulatory data: JSON files in /src/data/
- Blog: Markdown files in /src/content/blog/

## Design Rules
- NEVER use blue as primary color. Primary accent is terracotta (#C4572A).
- Dark mode uses true blacks (#111110), NOT blue-tinted grays.
- Typography: DM Serif Display (headings), Source Sans 3 (body), JetBrains Mono (numbers).
- Design must look human-made, NOT like generic AI output.
- No Tailwind. Use vanilla CSS with custom properties defined in /src/styles/global.css.
- No UI libraries (no shadcn, no Material, no Bootstrap).

## Calculator Development
- All financial calculations must be in pure TypeScript functions (no UI dependency).
- Functions must be unit-testable with known expected outputs.
- All regulatory data (tax brackets, SS rates) must come from JSON files, never hardcoded.
- Display "Última actualización: [date]" on every calculator page.
- Include legal disclaimer: "Cálculo orientativo. No sustituye asesoramiento profesional."
- Format currency as Spanish locale: 1.234,56 € (dot thousands, comma decimals).

## SEO Requirements
- Every page needs: unique title, meta description, canonical URL, OG tags.
- Every calculator page needs: WebApplication + FAQPage schema (JSON-LD).
- Every blog post needs: Article schema with author and dateModified.
- Breadcrumbs on all pages with BreadcrumbList schema.
- First 100 words of any article must contain a complete standalone answer (40-60 words).
- Internal links: every calculator links to 2-3 related calculators.

## File Naming
- Pages: kebab-case (cuanto-facturar.astro)
- Components: PascalCase (CuantoFacturar.tsx)
- Data files: kebab-case (tramos-2026.json)
- Lib functions: camelCase (calculateNetSalary)

## Don't
- Don't add a database. Everything is static files + JSON data.
- Don't add authentication. No user accounts.
- Don't add a CMS. Blog is Markdown files.
- Don't use any package with >500KB bundle size.
- Don't add cookie consent banners (we use privacy-friendly analytics).
- Don't use placeholder/lorem ipsum text. All content must be real Spanish financial content.
