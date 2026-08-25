# Code Review Report — Brejelinha Developer Landing Page

```
═══════════════════════════════════════════════════════════════════
 PROJECT:    Brejelinha Developer Landing Page
 REVIEWER:   CodeReviewer (Programador sênior)
 STANDARD:   Thermo-Nuclear Code Quality Review
 DATE:       2026-08-24
 FILES:      index.html (280 ln) · style.css (786 ln) · README.md (48 ln) · assets/images/* (verified on disk)
───────────────────────────────────────────────────────────────────
 FINDINGS:   1 Critical · 6 High · 9 Medium · 10 Low
 VERDICT:    Solid visual foundation; 2 silent functional bugs,
             multiple WCAG AA failures, stale share metadata.
 EST. FIX:   ~3 hours total
═══════════════════════════════════════════════════════════════════
```

---

## 1. Scorecard

| Category | Grade | Summary |
|---|---|---|
| HTML semantics | **C+** | Good base (lang, viewport, description); missing `<main>` landmark |
| Accessibility | **D** | No reduced-motion support, SR-hostile typing loop, 3 contrast failures, dead no-JS fallback hides content |
| CSS quality / maintainability | **C** | Keyframes collision bug, ~30× duplicated color literals, dead rules, `transition: all` antipattern |
| Performance | **B−** | Tiny images, good font preconnects; 7× backdrop-filter + blurred orbs cost on mobile, unthrottled scroll handler |
| Security | **B** | Consistent `rel="noopener"`; no CSP/referrer meta, third-party icon CDN SPOF, plaintext email |
| Documentation | **B** | Clear and accurate; machine-specific path, documents an unused asset, no deploy/license info |

---

## 2. Findings

### 🔴 CRITICAL

#### C1 — Main page content invisible without JavaScript; `.no-js` fallback is dead code

| | |
|---|---|
| **Files** | `index.html:274-276` · `style.css:167-170` · `style.css:781-784` |
| **Root cause** | `.section { opacity: 0 }` requires JS IntersectionObserver to add `.visible`. The escape-hatch rule `.no-js .section { opacity: 1 }` exists but nothing ever sets the `no-js` class on `<html>` — the rule can never match. |
| **Impact** | JS disabled/blocked/failed ⇒ Code Showcase, Featured Project (Botijela), Projects CTA, and Contact are permanently invisible. Non-JS crawlers see degraded content (SEO risk). |
| **Fix** | `<html lang="pt-BR" class="no-js">` + first statement in `<head>`: `<script>document.documentElement.classList.remove('no-js');</script>`. Or invert: visible by default, animate only under a `.js` class added by script. |
| **Effort** | ~5 min |

### 🟠 HIGH

#### H1 — Duplicate `@keyframes float`: particle animation silently broken

| | |
|---|---|
| **Files** | `style.css:123-127` (def 1: rise `-100vh`, rotate 360°, opacity fade) vs `style.css:392-395` (def 2: ±10px bob) |
| **Root cause** | Last `@keyframes float` definition wins globally. Both consumers — `.particle` (`style.css:106`) and `.hero-avatar` (`style.css:359`) — receive the bob. |
| **Impact** | All 8 background particles twitch in place instead of drifting/rotating/fading across the viewport. Zero console errors — classic silent cascade bug. |
| **Fix** | Rename to `float-particles` and `bob-avatar`; update both usage sites; delete duplicate block at lines 391-395. |
| **Effort** | ~5 min |

#### H2 — Zero `prefers-reduced-motion` support (WCAG 2.3.3)

| | |
|---|---|
| **Files** | Orbs `style.css:55` · particles `style.css:106-116` · avatar float `style.css:359` · glow pulse `style.css:381` · cursor blink `style.css:235-242` · smooth scroll `style.css:11` · JS typing loop `index.html:220-245` |
| **Impact** | Perpetual motion with no opt-out; flagged in virtually every professional a11y audit; vestibular disorder risk. |
| **Fix** | Global reduce block: `animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important;` + `scroll-behavior: auto`; gate JS typing on `matchMedia('(prefers-reduced-motion: reduce)')`. |
| **Effort** | ~20 min |

#### H3 — Typing animation spams screen readers continuously

| | |
|---|---|
| **Files** | `index.html:51-54` · mutation site `index.html:229` |
| **Impact** | `textContent` mutates every ~150ms forever → SR users hear "D…De…Dev…" on loop while tab is open. |
| **Fix** | Add visually-hidden static text ("Desenvolvedor FullStack · Criador do Botijela") + `aria-hidden="true"` on `.typing-animation` (also silences the `\|` cursor). Add `.sr-only` utility. |
| **Effort** | ~15 min |

#### H4 — WCAG AA contrast failures (ratios computed against composited backgrounds)

| Element | Location | Colors | Ratio | Required | Verdict |
|---|---|---|---|---|---|
| Footer text | style.css:717 | `#5a5a6a` on `#0a0a0f` | **2.73:1** | 4.5:1 (small text) | ❌ Fail |
| Code comments | style.css:479 | `#6a737d` on window bg (~rgb(14,14,22)) | **3.99:1** | 4.5:1 | ❌ Fail |
| Btn-primary label | style.css:616 | `#0a0a0f` on gradient purple end `#8a2be2` | **2.47:1** | 4.5:1 | ❌ Fail |
| CTA separator | style.css:674 | `#5a5a6a` | ~2.7:1 | decorative | ⚠️ Borderline |
| Taglines/descriptions | style.css:246,549 | `#a0a0b0` | ~8:1 | 4.5:1 | ✅ Pass |
| Links | throughout | `#4da3ff` | ~7.5:1 | 4.5:1 | ✅ Pass |

| | |
|---|---|
| **Fix** | Footer → `#9a9aac`; token-comment → `#8b949e`; btn-primary → `color:#fff` (passes both gradient stops). Land fixes in tokens per M1. |
| **Effort** | ~5 min |

#### H5 — Broken/stale social sharing metadata

| | |
|---|---|
| **File** | `index.html:10` |
| **Finding** | `og:image` → `https://brejela.carrd.co/assets/images/card.jpg` — a different, former (Carrd-hosted) site; file absent from repo. Missing entirely: `og:url`, canonical, `twitter:card`, `theme-color`. |
| **Impact** | Link previews on X/Discord/Slack render nothing or stale branding. |
| **Fix** | Create real 1200×630 card image hosted locally with absolute URL; add canonical + `og:url` + `twitter:card summary_large_image` + theme-color `#0a0a0f`. |
| **Effort** | ~30 min (mostly asset) |

#### H6 — No `<main>` landmark; sections unnamed

| | |
|---|---|
| **File** | `index.html:19-198` |
| **Finding** | Landmark map: header → four anonymous sections → footer. No `<main>`; SR users can't skip to primary content. Heading order itself is correct (h1→h2→h3). |
| **Fix** | Wrap post-hero sections in `<main>`; add `id` + `aria-labelledby` per section (`code-showcase`, `projeto-botijela`, `contato`). |
| **Effort** | ~15 min |

### 🟡 MEDIUM

| ID | Finding | Location(s) | Recommendation | Effort |
|---|---|---|---|---|
| **M1** | No design tokens: `#4da3ff` ×~30, `#8a2be2` ×~14, border rgba ×6, identical gradients ×5 (218, 323, 606, 615, 658, 705) | style.css throughout | `:root { --accent; --accent-2; --bg; --text-muted; --surface-border; --gradient-accent }`; replace all | ~40 min |
| **M2** | Scroll handler: no `passive:true`, reads layout props per event, writes `width` (layout+paint), div-by-zero → `NaN%` when `scrollHeight === clientHeight` | index.html:250-258 · style.css:141-147 | `{passive:true}` + rAF coalescing; cache dims on resize; animate `transform: scaleX()` | ~20 min |
| **M3** | Six icons from `cdn.simpleicons.org` = SPOF (blank boxes if CDN blocked/down); also `aria-label="Twitter"` vs `alt="X"` mismatch (82-83) | index.html:73-90 | Inline the six SVGs (~2KB, zero requests); label "X (Twitter)" | ~25 min |
| **M4** | `'Fira Code'` declared twice (99, 471) but never loaded → silently Courier New; Inter wght 300 fetched but unused (only 400-700 used) | style.css:99,471 · index.html:16 | Load Fira Code 400 or drop refs; trim to `Inter:wght@400;500;600;700` | ~5 min |
| **M5** | Root-absolute favicon `/assets/images/favicon.svg` breaks subpath deploys (GitHub Pages project sites); inconsistent with relative siblings | index.html:12 | Use relative `assets/images/favicon.svg` | ~1 min |
| **M6** | Hardcoded `© 2024` (current year: 2026) | index.html:201 | Set via JS or maintain consciously | ~2 min |
| **M7** | 7× `backdrop-filter: blur()` (138, 278, 307, 406, 507, 628, 682) + three perpetually scaling `blur(80px)` orbs — compositing-layer cost on budget mobile | style.css as listed; orbs 50-56 | Drop blur where over solid bg (.tech-item, .social-link, .btn-secondary); keep on cards/code window; shrink orb blur; pause under 640px/reduced motion | ~20 min |
| **M8** | `transition: all` antipattern ×7 — accidental animations, extra recalc | style.css:169,260,285,311,358,594 | Enumerate properties explicitly | ~10 min |
| **M9** | README: machine-specific path (line 23); documents unused `avatar-brejelinha.png` (line 38, unreferenced by site); no deploy docs (carrd.co og:image implies former host); no license; Ko-fi in README but not on page | README.md | Genericize path; use-or-remove PNG; add deploy + license; reconcile Ko-fi | ~15 min |

### 🟢 LOW

| ID | Finding | Location | Fix |
|---|---|---|---|
| L1 | Dead CSS: `.fade-in` + `@keyframes fadeIn` unused; `.no-js .section` unreachable (root cause C1) | style.css:762-769, 780-784 | Delete or wire post-C1 |
| L2 | Comment banner `/* ===== Code Showcase ===== */` ×3 consecutively | style.css:391-399 | Deduplicate |
| L3 | `.hero-avatar` split across two blocks | style.css:349-360, 385-389 | Merge |
| L4 | Typing FOUC: full text renders, JS wipes to "" and retypes | index.html:52, 216-217 | Empty initial text (H3 static fallback covers no-JS) |
| L5 | Decorative spans read by AT: traffic-light buttons, ★, `\|` cursor | index.html:107-114, 53 | `aria-hidden="true"` |
| L6 | Plaintext email harvestable; no CSP/referrer-policy meta | index.html:193, head | Acceptable tradeoff; optional obfuscation; add `referrer` meta |
| L7 | Custom SVG cursor replaces system cursor; ignores reduced-motion | style.css:772-778 | Consider removing (fallback keywords correctly provided ✓) |
| L8 | Single 640px breakpoint; no fluid type; 641-900px band untested | style.css:724-759 | `clamp()` headings; spot-check tablet |
| L9 | `ul { list-style:none }` reset, zero `<ul>` in markup | style.css:35-37 | Delete |
| L10 | `<pre><code>` lacks language hint | index.html:118 | `class="language-ts"` |

---

## 3. Strengths (Verified)

- ✅ `lang="pt-BR"`, viewport meta, accurate meta description
- ✅ **100% of external links carry `rel="noopener"`**
- ✅ Google Fonts preconnect pair + `display=swap`
- ✅ Images sized to display slots (180×180 JPG at 120px display; 5.6KB total) — zero wasted bytes
- ✅ `object-fit: cover` avatar; global `img { max-width: 100% }`
- ✅ IntersectionObserver-based reveals (not scroll math)
- ✅ Modern box-sizing reset; logical CSS sectioning
- ✅ Correct heading order h1 → h2 → h3

---

## 4. Remediation Plan

| Wave | Items | Contents | Est. |
|---|---|---|---|
| ① Critical + blockers | C1, H1, H4 | no-js wiring · keyframes split · 3 color swaps | 15 min |
| ② A11y behavior | H2, H3, L5 | reduced-motion · typing SR safety · aria-hidden decoratives | 35 min |
| ③ Structure | H6 | `<main>` landmark + section labels | 15 min |
| ④ Meta/SEO | H5, M5, M6 | og:image asset · canonical/twitter/theme-color · favicon path · year | 35 min |
| ⑤ Maintainability | M1 | tokens (after H4 so fixes land in tokens) | 40 min |
| ⑥ Perf/docs | M2-M4, M7-M9 | scroll rAF · inline SVGs · fonts · GPU trims · transitions · README | 75 min |

Suggested commits:

1. `fix: critical bugs and contrast (waves 1-3)`
2. `chore: metadata and SEO (wave 4)`
3. `refactor: tokens, perf, docs (waves 5-6)`
