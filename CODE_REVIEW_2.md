# Code Review Report #2 — Brejelinha Developer Landing Page (Re-Review)

```
═══════════════════════════════════════════════════════════════════
 PROJECT:    Brejelinha Developer Landing Page
 REVIEWER:   CodeReviewer (Programador sênior)
 STANDARD:   Thermo-Nuclear Code Quality Review — ROUND 2 (RE-REVIEW)
 DATE:       2026-08-24
 BASELINE:   Commit 89a49d4 "Apply code review fixes" (+ uncommitted
             working-tree changes to index.html / README.md / assets)
 FILES:      index.html (307 ln) · style.css (892 ln) · README.md (48 ln)
             assets/images/: favicon.svg (261 B) · avatar-brejelinha.png
             (17.6 KB) · avatar-botijela.jpg (5.6 KB, untracked rename of
             deleted image01.jpg)
───────────────────────────────────────────────────────────────────
 CLAIMED FIXES:      13 items claimed in commit message
 VERIFIED GENUINE:   11 fully ✅ · 2 partial ◐ · 1 FALSE claim ❌ (H4 btn-primary)
 NEW ISSUES FOUND:   1 High · 3 Medium · 3 Low
 REMAINING BACKLOG:  6 Medium · 8 Low from Round 1 (mostly unclaimed items)
 VERDICT:            Real progress on accessibility and structure. But the
                     M2 scroll fix introduced a silent regression (progress
                     bar can never render), the H4 button contrast fix was
                     claimed yet never applied, and the new <main> markup
                     shipped with a stray </div> and a dangling
                     aria-labelledby reference.
 EST. FIX:           ~2 hours total
═══════════════════════════════════════════════════════════════════
```

---

## 1. Verification of Claimed Fixes

| ID | Claim | Verdict | Evidence |
|---|---|---|---|
| C1 | no-js class wiring | ✅ **VERIFIED** | `<html class="no-js">` at `index.html:2`; remover script at `index.html:18`; escape rule `.no-js .section { opacity:1; transform:none }` restored to life at `style.css:847-850`. Content now visible without JS. |
| H1 | `@keyframes float` renamed to `float-bob` | ✅ **VERIFIED** | Avatar now uses `animation: float-bob` (`style.css:404`); dedicated `@keyframes float-bob` at `style.css:437-445`. Exactly one `float` definition remains (`style.css:152`) used solely by `.particle` (`style.css:112`). Collision eliminated; both animations behave as designed. |
| H2 | prefers-reduced-motion (CSS + JS) | ✅ **VERIFIED** | Global reduce block with `0.01ms` durations, single iteration, and `scroll-behavior: auto` at `style.css:865-878`. JS gate via `matchMedia('(prefers-reduced-motion: reduce)')` renders full text once instead of looping (`index.html:231-235`). Nit: `animation-delay` not reset in the block (harmless here — particles start/end at opacity 0). |
| H3 | typing aria-hidden + sr-only fallback | ✅ **VERIFIED** | `.typing-animation` has `aria-hidden="true"` (`index.html:56`); cursor span also hidden (`:58`); static fallback `<span class="sr-only">` present (`:60`). SR users hear one clean sentence instead of a typing loop. Caveat: the `.sr-only` utility itself is duplicated and malformed — see N3. |
| H4 | 3 contrast fixes | ◐ **2 of 3 applied · 1 FALSE CLAIM** | Footer `#9a9aac` ✅ (`style.css:769`, computed 7.14:1 vs bg — pass). Token comments `#8b949e` ✅ (`style.css:531`, ~6.3:1 on composited window bg — pass). **Btn-primary ❌ NOT APPLIED**: `style.css:668` still reads `color: #0a0a0f`. The commit message asserts "#0a0a0f → #fff"; the diff contains no such change. See H4-R below for corrected math. |
| H5 | meta tags updated | ◐ **PARTIAL** | `og:url` ✅ (:11), `canonical` ✅ (:15), `twitter:card summary_large_image` ✅ (:12), `theme-color #0a0a0f` ✅ (:13). However `og:image` still targets `https://brejelinha.dev/assets/images/card.jpg` (`index.html:10`) — **that file does not exist anywhere in the repo**. Link previews remain broken until the card asset is created and deployed. Domain assumption (brejelinha.dev) also unverified against actual hosting. |
| H6 | main landmark added | ◐ **PARTIAL + introduced bugs** | `<main>` wraps the post-hero sections (`index.html:109-208`) ✅. BUT: closing tags are misordered — stray `</div>` before `</main>` (N1); and `aria-labelledby="code-showcase-title"` (`index.html:112`) references an id that exists nowhere in the document (N2). Only 1 of 4 sections carries a label; the commit message's "sr-only headings" were never added. |
| L5 | aria-hidden on decorative elements | ✅ **VERIFIED** | Traffic-light buttons (`index.html:117-119`), ★ action icon (`:123`), cursor pipe (`:58`), avatar glow (`:102`). Missed: the particle word cloud — see R13. |
| M2 | scroll rAF + passive | ❌ **REGRESSION INTRODUCED** | JS side is correct: `{ passive: true }`, rAF coalescing via `scrollTicking`, `scaleX()` transform instead of width writes, div-by-zero guarded (`index.html:267-284`). But the CSS was left at `width: 0%` (`style.css:180`) while JS animates `transform: scaleX(0→1)` — scaling a zero-width box yields zero pixels. **The progress bar is permanently invisible.** See N4. |
| M4 | font weights trimmed | ✅ **VERIFIED** | Request is now `Inter:wght@400;500;600;700` (`index.html:21`); unused 300 removed. All four loaded weights are actually used. Residual: `'Fira Code'` still declared twice (`style.css:105, 523`) but never loaded → silently Courier New (R7). |
| M5 | favicon relative | ✅ **VERIFIED** | `href="assets/images/favicon.svg"` (`index.html:16`); valid SVG on disk (261 B). Subpath-deploy safe. |
| M6 | dynamic year | ✅ **VERIFIED** | `<span id="current-year">2024</span>` fallback (`index.html:211`) + end-of-body script setting `textContent = new Date().getFullYear()` (`:305`). Element exists when script runs; valid. |

**Claim integrity:** 11/13 claims genuine, 2 partial (H5, H6), 1 false (H4-btn-primary). The commit message also claims an "M8 text-decoration underline" fix — current CSS shows intentional underlines only where wanted (`.hero-bio a:hover`, `style.css:309-312`); no conflict remains, so accepted.

---

## 2. Scorecard (Round 2)

| Category | Grade | Δ | Summary |
|---|---|---|---|
| HTML semantics | **B−** | ↑ | `<main>` landmark added; but stray `</div>` breaks validity and one dangling `aria-labelledby` |
| Accessibility | **C+** | ↑↑ | Reduced-motion done, SR-safe typing, 2/3 contrast fixed; btn-primary still fails AA, particles exposed to SRs |
| CSS quality / maintainability | **C+** | ↑ | Keyframes collision resolved; duplicate `.sr-only` blocks, triple banner comment, split avatar rules remain; tokens still missing |
| Performance | **B** | ↑ | Scroll handler modernized (but bar invisible); Inter trimmed; 7× backdrop-filter unchanged |
| Security | **B** | = | 100% `rel="noopener"` maintained; icon CDN SPOF and plaintext email unchanged |
| Documentation | **C−** | ↓ | README now contradicts working tree: documents deleted `image01.jpg`, omits new `avatar-botijela.jpg`; machine-specific path remains |

---

## 3. New Findings (introduced or discovered this round)

### 🔴 HIGH

#### N4 — Regression: scroll progress bar can never render

| | |
|---|---|
| **Files** | `style.css:178-186` (esp. line 180) · `index.html:277` |
| **Root cause** | The M2 fix switched JS from writing `width` to writing `transform: scaleX(scrolled/100)`, but the stylesheet kept `width: 0%` as the base geometry. `scaleX(n)` multiplies the rendered box width — 0px × anything = 0px. |
| **Impact** | The entire scroll-progress feature is dead in all browsers, silently. Classic "fix the writer, forget the geometry" bug. |
| **Fix** | Change `.scroll-progress-bar { width: 0% }` → `width: 100%` (keep `transform-origin: left`; the existing `transform: scaleX(0)` initial value is then correct). One-line fix. |
| **Effort** | ~1 min |

### 🟠 MEDIUM

#### N1 — Misordered closing tags: stray `</div>`, footer silently relocated

| | |
|---|---|
| **Files** | `index.html:207-212` |
| **Finding** | Source order is `…</section>` → `</div>` (207, closes `.page-wrap`) → `</main>` (208) → `<footer>` (210). Since `main` is open when `</div>` arrives, the parser hits a special element mismatch and **ignores the token**, so `main` stays open until its own end tag and `<footer>` lands *inside* `.page-wrap`, not inside `body` as authored. W3C validator: "Stray end tag div." |
| **Impact** | Invalid HTML and DOM ≠ author intent. It happens to look right today because `.footer { margin-top: auto }` needs a flex parent and `.page-wrap` is one — the accident is load-bearing. Any future restructure of `.page-wrap` breaks sticky-footer positioning mysteriously. |
| **Fix** | Reorder to `</main>` → `<footer>…</footer>` → `</div>` (keep footer inside `.page-wrap` deliberately), i.e., move the `</div>` to after the footer. |
| **Effort** | ~2 min |

#### N2 — Dangling `aria-labelledby` references nonexistent id

| | |
|---|---|
| **Files** | `index.html:112` |
| **Finding** | `<section … aria-labelledby="code-showcase-title">` — no element with `id="code-showcase-title"` exists in the document (the visible window title `<span class="window-title">botijela.ts</span>` at `:121` carries no id). Introduced by the H6 fix. |
| **Impact** | Validator error; screen readers fall back to an unnamed region, defeating the purpose of the label. |
| **Fix** | Either add `id="code-showcase-title"` to the window-title span (it names the section nicely), or add an `sr-only` `<h2>` with that id, or drop the attribute. |
| **Effort** | ~2 min |

#### N3 — `.sr-only` defined twice with malformed clip rectangle

| | |
|---|---|
| **Files** | `style.css:852-863` and `style.css:881-892` (verbatim duplicate block) |
| **Finding** | The H3 fix appended a second copy of the utility at EOF. Both copies use `clip: rect(0, 0, 24px, 0)` — bottom edge 24px on a 1px-tall box is meaningless (canonical recipe is `rect(0, 0, 0, 0)`, ideally paired with `clip-path: inset(50%)`). Visual hiding still works via the 1px/overflow-hidden combination, but the declaration is wrong and the duplication invites divergence. |
| **Fix** | Delete one block; correct the survivor to `clip: rect(0, 0, 0, 0); clip-path: inset(50%);`. |
| **Effort** | ~2 min |

### 🟢 LOW

| ID | Finding | Location | Fix |
|---|---|---|---|
| N5 | Orphan/untracked asset: `avatar-botijela.jpg` (5,621 B) is byte-identical in size to deleted `image01.jpg` — an unreferenced rename sitting in the tree; nothing points to it | `assets/images/avatar-botijela.jpg` | Reference it (e.g., project section?) or delete |
| N6 | `no-js` remover script sits late in `<head>` (after fonts stylesheet); until it runs, `.no-js .section { opacity: 1 }` applies, then sections blink hidden before the observer reveals them | `index.html:18` | Move script immediately after `<meta charset>` |
| N7 | Social icon `<img alt="X">` duplicates the link's `aria-label="X (Twitter)"`; empty `alt=""` would avoid the redundant announcement | `index.html:79-96` | `alt=""` on all six icons |

---

## 4. Remaining Issues from Round 1 (unclaimed, verified still present)

### 🟠 HIGH (carried)

#### H4-R — Btn-primary contrast failure persists — and the original prescription was itself wrong

| | |
|---|---|
| **File** | `style.css:666-671` |
| **State** | `color: #0a0a0f` on `linear-gradient(135deg, #4da3ff, #8a2be2)`. Computed: **7.55:1 on the blue stop (pass)** but **3.32:1 on the purple stop (fail)** — half the button fails AA for its 14.4px/500 label. |
| **Correction to Round 1 advice** | The prescribed `color:#fff` does NOT pass both stops either: white on `#4da3ff` computes to **2.63:1** (fail); white on `#8a2be2` is 5.96:1 (pass). Neither pure swap works. |
| **Real fix** | Darken the first gradient stop and use white text, e.g. `background: linear-gradient(135deg, #1d6fc2, #8a2be2); color: #fff;` → 5.11:1 / 5.96:1, passes AA across the whole gradient. Update hover shadow to match. Land in tokens per M1. |
| **Effort** | ~5 min |

### 🟡 MEDIUM (carried)

| ID | Finding | Status check | Location |
|---|---|---|---|
| M1 | No design tokens: `#4da3ff` ×16, gradients ×4, border rgba ×6 — count slightly reduced by fixes but literals still everywhere | Unchanged | style.css throughout |
| M3 | Six external icons from `cdn.simpleicons.org` = SPOF (blank 40px boxes if CDN blocked). Note: the label half was fixed — link now reads `aria-label="X (Twitter)"` ✅ | Half-fixed | index.html:73-96 |
| M7 | 7× `backdrop-filter: blur()` (re-verified ×7) + three perpetually-scaling `blur(80px)` orbs — compositing cost on budget mobile | Unchanged | style.css per Round 1 list |
| M8 | `transition: all` antipattern ×7 (re-verified) | Unchanged | style.css:208, 305, 330, 356, 403, 566, 646 et al. |
| M9 | README drift — **now worse**: documents deleted `image01.jpg` (`README.md:37`), omits new `avatar-botijela.jpg`; machine-specific path (`:23`); no deploy/license sections; Ko-fi listed but absent from page | Worsened | README.md |

### 🟢 LOW (carried)

| ID | Finding | Status check | Location |
|---|---|---|---|
| L1 | Dead `.fade-in` + `@keyframes fadeIn` unused (the other dead item, `.no-js .section`, is now alive thanks to C1 ✅) | Still present | style.css:813-827 |
| L2 | `/* ===== Code Showcase ===== */` banner ×3 consecutive (moved, still tripled) | Still present | style.css:436, 447, 449 |
| L3 | `.hero-avatar` split across two rule blocks | Still present | style.css:394-405, 430-434 |
| L4 | Typing FOUC: full text paints, JS wipes to "" and retypes (Round 1 suggested empty initial text since the sr-only fallback now covers no-JS) | Still present | index.html:57, 236-245 |
| L7 | Custom SVG data-URI cursor replaces system cursor; ignores reduced motion (accepted tradeoff Round 1) | Unchanged | style.css:829-844 |
| L8 | Single 640px breakpoint; no fluid type; 641-900px band untested | Unchanged | style.css:776 |
| L9 | `ul { list-style:none }` reset with zero `<ul>` in markup | Unchanged | style.css:41-43 |
| R13 | Particle word cloud ("const function await async => import export class") read aloud by screen readers — decorative container lacks `aria-hidden="true"` (gap left by L5 fix) | New carry-down | index.html:36-45 |
| R7 | `'Fira Code'` declared twice, never loaded → silent Courier New fallback (remainder of M4) | Unchanged | style.css:105, 523 |

---

## 5. What Was Verified Good This Round

- ✅ Keyframes namespace clean: exactly one `float` (particles) + one `float-bob` (avatar), each consumer matched correctly
- ✅ Reduced-motion coverage is genuinely global (orbs, particles, bob, glow, blink, smooth-scroll, typing loop) and degrades gracefully — frozen elements land in sensible final states
- ✅ Scroll handler logic is textbook once N4's CSS line is fixed: passive listener, rAF coalescing, transform-only writes, zero-guard
- ✅ Progressive enhancement chain complete: `no-js` class → head removal script → CSS escape hatch all agree
- ✅ Dynamic year with static `<noscript>`-safe fallback text
- ✅ Favicon valid SVG, relative path; theme-color matches page background
- ✅ Working-tree avatar swap (`image01.jpg` → existing `avatar-brejelinha.png`, 17.6 KB) resolves the broken-image risk and keeps total image weight tiny
- ✅ All 12 external links still carry `rel="noopener"`; heading order h1→h2→h3 intact; grammar fix ("na IATec" → "no IATec") correct

---

## 6. Remediation Plan (Round 2)

| Wave | Items | Contents | Est. |
|---|---|---|---|
| ① Regressions & false fix | N4, H4-R | Progress-bar `width:100%` · btn-primary darkened gradient stop + white text | 10 min |
| ② Markup correctness | N1, N2, N6 | Reorder `</main>`/`</div>` around footer · add `id="code-showcase-title"` (or sr-only h2) · hoist no-js script | 10 min |
| ③ A11y sweep completion | N3, R13, N7 | Deduplicate + repair `.sr-only` · `aria-hidden` on `.background-animation` container · `alt=""` on icons | 10 min |
| ④ Docs/assets hygiene | M9, N5 | Rewrite README structure block (drop image01, add real files), genericize path, add deploy/license · keep-or-delete avatar-botijela.jpg | 20 min |
| ⑤ Carried backlog (optional polish) | M1, M3, M7, M8, L1-L4, L7-L9 | Tokens → inline SVG icons → GPU trims → transition enumeration → dead-code cleanup | ~90 min |

Suggested commit messages:

1. `fix: restore scroll progress bar visibility and true btn-primary AA contrast`
2. `fix: valid main/page-wrap nesting, section label id, early no-js swap`
3. `chore: sr-only dedupe, decorative aria-hidden, README sync`

---

## 7. Bottom Line

The team executed 12 of 13 claimed fixes honestly and the page is materially more accessible than Round 1. However, this round proves why re-reviews matter: the highest-risk item (N4) is a regression created *by* a fix, the one false claim (H4 btn-primary) sits in the exact area the original review flagged, and the new `<main>` markup shipped two validity bugs. Waves ①–③ above are ~30 minutes of work and would bring the page to a genuinely clean state; wave ⑤ is optional debt.
