# Rose Cosmetics — Design System

A reference for the visual language and component patterns used across
the staff app and the customer-facing marketing site. Snapshot of the
codebase, not a wishlist — everything here ships in production.

---

## 1. Two shells, one brand

The app runs **two distinct visual shells** under one Next.js root.
Knowing which shell you're working in is the single most important
design decision.

| Shell | Routes | Background | Text | Mood |
|---|---|---|---|---|
| **App** (staff) | `/dashboard`, `/pos`, `/products`, `/sales`, … | Dark (`page` `#14121A`) | Off-white `ink` `#ECE9F0` | Quiet, dense, dashboard |
| **Marketing** (customer) | `/`, `/about`, `/shop`, `/store`, `/contact` | Cream `#FFF8F3` | Warm stone-800 | Soft, brand-forward, mobile-first |

The same rose accent (`#B03052`) runs through both — that's the brand
through-line. Everything else differs.

---

## 2. Color tokens

Defined in [`tailwind.config.ts`](./tailwind.config.ts). Use Tailwind
classes (`bg-rose-600`, `text-ink-muted`) — never hex literals.

### Brand — Rose

The accent on every CTA, every link, every wordmark.

| Token | Hex | Used for |
|---|---|---|
| `rose-50` | `#FDF2F5` | Soft tinted backgrounds (hero glow, hover states on cream) |
| `rose-100` | `#FBE4EA` | Decorative blobs, page section accents |
| `rose-200` | `#F6C2CE` | Decorative gradients |
| `rose-300` | `#EE94AA` | Decorative glow halos, dark-shell form labels (error text) |
| `rose-400` | `#E25F80` | Eyebrow text on dark shell, "Rose" wordmark in app chrome |
| `rose-500` | `#C93A63` | Hover state for `rose-600` |
| `rose-600` | `#B03052` | **Primary CTAs, brand mark, "rose" by itself** |
| `rose-700` | `#8E2442` | Active/pressed states on light backgrounds |
| `rose-800` | `#6A1B32` | Reserved |
| `rose-900` | `#491322` | Reserved |

Rule of thumb: **`rose-600` for filled CTAs and the wordmark, `rose-400`
or `-300` for accents on dark, `rose-50/100/200` for ambient glow.**

### Dark shell — Ink + surfaces

| Token | Hex | Role |
|---|---|---|
| `page` | `#14121A` | Page background (the lowest layer) |
| `surface` | `#1E1B26` | Form inputs, secondary panels |
| `card` | `#241F2D` | Lifted content panels (sale tickets, etc.) |
| `ink` | `#ECE9F0` | Primary text |
| `ink-soft` | `#C6C2CF` | Secondary text |
| `ink-muted` | `#8E8A9A` | Captions, hints, placeholders |
| `line` | `rgba(255,255,255,0.08)` | Subtle dividers |

The three bg tones stack `page < surface < card` so panels sit visually
forward of the chrome.

### Marketing shell — Cream + stone

| Token | Hex | Role |
|---|---|---|
| `cream` | `#FFF8F3` | Page background (entire `(marketing)` group) |
| `stone-100/85` | – | Sticky header — slight blur, slight transparency |
| `stone-700` | – | Primary body text |
| `stone-800` | – | Headings |
| `stone-500` | – | Eyebrows, footer captions |

Tailwind's built-in `stone-*` palette covers everything except cream
which is custom.

---

## 3. Typography

### Body font — system stack
```ts
sans: [
  "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont",
  "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif",
]
```
Zero font bytes downloaded, native on every platform. Don't introduce
Inter or any web font for body text.

### Brand wordmark — Allura
Loaded via `next/font/google` in
[`src/components/rose-logo.tsx`](./src/components/rose-logo.tsx). Used
for:
- `"Rose"` in the wordmark
- Marketing hero h1s (`font-[Allura,cursive]`)
- Decorative numeric accents (the "1 / 2 / 3" on /shop)

**Don't** use Allura for body text or in the staff app — it's reserved
for marketing brand moments.

### Root size
`html { font-size: 17px }` (defined in `globals.css`). Every Tailwind
size is in rems, so the whole UI scales up one notch from the default.
Don't override this on individual elements — work in Tailwind sizes.

### Heading rhythm

**Marketing site:**
- Hero h1: `text-5xl xs:text-6xl sm:text-7xl` in Allura
- Section h2: `text-2xl sm:text-4xl` in system sans (semibold)
- Subsection h3: `text-lg sm:text-xl`
- Body: `text-[15px] leading-relaxed sm:text-base`

**Staff app:**
- Page h1: `text-xl sm:text-2xl` (`PageHeader` component handles this)
- Section eyebrow: `text-xs font-semibold uppercase tracking-wider text-rose-300/400`
- Body: `text-sm`

---

## 4. Breakpoints

```ts
xs: "380px"      // custom — tight phones (iPhone SE up)
sm: "640px"      // tailwind default — phone landscape / small tablet
md: "768px"      // tailwind default — tablet
lg: "1024px"     // tailwind default — desktop (rarely used in marketing)
```

The custom `xs` exists so the marketing hero gets **one more headline
size step** between iPhone SE and iPhone Pro Max before `sm` kicks in.

**Always design mobile-first.** Most customer traffic lands from
Instagram on a phone.

---

## 5. Component primitives

### Buttons

Defined as Tailwind `@layer components` in `globals.css`:

```css
.btn-primary  /* filled rose pill, used on staff app forms */
.btn-secondary /* outlined card pill, used for cancel/back actions */
```

For marketing CTAs, **don't** use these — write the classes inline
because the marketing palette is different. Standard marketing CTA:

```tsx
<a className="rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold
              text-white shadow-md shadow-rose-300/40 transition-transform
              hover:-translate-y-0.5">
```

Outlined marketing button:
```tsx
className="rounded-full border border-rose-600 px-6 py-3 text-sm
           font-semibold text-rose-600 hover:bg-rose-50"
```

### Form primitives ([`src/components/form/`](./src/components/form))

| Component | Use it for |
|---|---|
| `<Field label htmlFor error hint adornment>` | One labelled input. Auto-handles error / hint / required asterisk / left-adornment. |
| `<FieldGroup title description>` | Section heading inside a form. Use to break long forms into scannable blocks (Identity / Pricing / Inventory). |
| `inputClass()` | Returns the standard input class string. Use on `<input>`, `<select>`, `<textarea>` for visual parity. |
| `<SubmitButton pendingLabel>` | Submit button that auto-disables and swaps to a spinner using `useFormStatus`. |
| `<FormError message>` | Top-of-form error banner. |

**Rule:** every staff form uses these four pieces. Never style an
`<input>` inline.

### Page header ([`src/components/page-header.tsx`](./src/components/page-header.tsx))

```tsx
<PageHeader
  eyebrow="Catalog · Products"
  title="Add product"
  description="Optional explainer"
  actions={<Link className="btn-secondary">Back</Link>}
/>
```

Every staff page top-renders this. Don't write h1s inline in staff
routes.

### Brand wordmark ([`src/components/rose-logo.tsx`](./src/components/rose-logo.tsx))

```tsx
<RoseLogo size="sm" />  // mobile header
<RoseLogo size="md" />  // desktop header, footer
<RoseLogo size="lg" />  // (unused but available)
```

The "Cosmetics" sub-line inherits color via `text-current` so it reads
correctly on both light and dark backgrounds.

---

## 6. Patterns

### Mobile-first responsive

Tailwind classes always start unprefixed (= mobile), then layer up:
`text-5xl xs:text-6xl sm:text-7xl`. Never start with `sm:` and reverse
down — that produces phone-broken first paints.

### Marketing — sticky bottom DM bar

[`(marketing)/layout.tsx`](./src/app/(marketing)/layout.tsx) renders
`<MobileDmBar />` — a fixed-bottom row with **DM on Instagram** + **Map**
buttons, visible only `sm:hidden`. The `<main>` has `pb-20 sm:pb-0` so
content never hides under it.

### Marketing — language toggle

[`(marketing)/language-toggle.tsx`](./src/app/(marketing)/language-toggle.tsx)
drives Google Translate from an EN | नेपाली pill. English is default.
The toggle sits next to desktop nav, and on a thin row beneath mobile
nav. Brand names use `translate="no"` + `className="notranslate"` to
stay "Rose Cosmetics" in any language — apply that pattern to any
proper noun added in future.

### Structured data (JSON-LD)

Every marketing page injects schema.org JSON-LD via a `<script
type="application/ld+json">` tag. Pattern:

```tsx
const STRUCTURED_DATA = { "@context": "https://schema.org", "@type": ..., ... };
return <>
  <script type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
  ...
</>;
```

Conventions:
- `Store` schema on `/` and `/contact` share `@id` =
  `https://rosecosmetics.live/#store` so Google treats them as one
  business entity.
- `BreadcrumbList` on every inner page.
- `FAQPage` only where the page content is actually a Q&A
  (currently `/shop`).

### Metadata + OG

- `src/app/layout.tsx` sets root `metadataBase`, `keywords`, OG, Twitter
  card, geo meta tags. Inherit from here — don't repeat.
- `src/app/opengraph-image.tsx` auto-generates the 1200×630 social
  preview via `next/og`. Inherits to every marketing page; override
  per-route by adding an `opengraph-image.tsx` in that route folder.
- `src/app/icon.tsx` + `apple-icon.tsx` are the favicon and iOS
  home-screen icon.

### Forms — three-zone layout

```tsx
<form action={action}>
  <FormError message={state.formError} />
  <FieldGroup title="Identity">
    <Field label="Name" htmlFor="name" required>
      <input className={inputClass()} />
    </Field>
    ...
  </FieldGroup>
  <FieldGroup title="Pricing">
    ...
  </FieldGroup>
  <div className="flex gap-3 pt-4">
    <SubmitButton pendingLabel="Saving">Save</SubmitButton>
    <Link className="btn-secondary">Cancel</Link>
  </div>
</form>
```

Two-column grids inside a FieldGroup use `grid gap-5 sm:grid-cols-2`.

### Print styles

`@media print` in `globals.css` flips everything to black-on-white,
hides app chrome (`aside`, `.no-print`), and resets `<main>` padding so
receipts and labels print cleanly. **Tag any element you don't want
printed with `className="no-print"`.**

---

## 7. Motion & animations

Defined in `globals.css`:

| Animation | Class | Where used |
|---|---|---|
| Chat FAB pulse | `animate-chat-pulse` | Unread chat indicator |
| Bubble entrance | `animate-chat-bubble-in` | New chat messages |

Both automatically disable under `prefers-reduced-motion`. Add new
animations the same way.

For micro-interactions, the standard pattern across the app is:
- Hover lift on buttons: `transition-transform hover:-translate-y-0.5`
- Active press: `active:translate-y-px`
- Color transitions: `transition-colors`

---

## 8. Iconography

No icon library is installed. Icons are **inline SVGs**, written
straight into the component that needs them (see `InstagramIcon`,
`MapIcon` inside `(marketing)/layout.tsx`).

Standard size: `h-4 w-4` for inline icons, `h-5 w-5` for prominent
ones. Always set `aria-hidden` on decorative icons.

---

## 9. SEO / robots

- `src/app/robots.ts` — `allow` only marketing routes, `disallow`
  everything staff (`/dashboard`, `/pos`, `/api/`, …). When you add a
  new customer page, **add it to the `allow` list.**
- `src/app/sitemap.ts` — same. Add new customer pages here too with
  appropriate `priority` (home=1, primary pages=0.7-0.8, coming-soon
  pages=0.6).
- `<html lang="en-NP">` and `og:locale=en_NP` are set in root layout
  for Nepal locale signals.

---

## 10. What this doc deliberately doesn't cover

- **Chat dock** internals — that's a self-contained subsystem with its
  own animation states; read the file when working on it.
- **POS-specific patterns** (cart, scanner overlay) — those live in
  `src/app/(app)/pos/` and warrant their own doc when they mature.
- **Email / receipt templates** — handled per-feature.

When adding a new pattern that gets reused, update this file.
