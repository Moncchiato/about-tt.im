# about-tt.im: notes for Claude

This repository is the website for the **Treatment Target Identification Model (TTIM)** by Dr. Alexey Breuss, Psy.D. It is a static site served by GitHub Pages at https://about-tt.im (custom domain in `CNAME`). There is no build step: the HTML files are the site.

Dr. Breuss is a clinician, not a developer. Explain things in plain language, make the changes for him, and show him the result (screenshots or a local preview) before you push.

## ⚠️ A decision is waiting: the new home-page graphic

The full TTIM diagram is the first thing visitors see, but it's hard to read as an introduction, especially on phones. Its text is also drawn as shapes, so search engines and AI tools can't read it. Two replacements were prototyped in `concepts/` (added November 2026):

- **A · Hourglass:** Dr. Breuss's own hourglass layout, redrawn simply. It matches the full diagram one-to-one.
- **B · Horizon:** the same structure drawn as rings split by the skin line: the world spreads outward above it, the body inward below it, and the person sits at the dark core.

Both are drawn live from the page data. They color only the five pillars, mark each of the 32 targets with a ◆ you can hover or tap, include a short "How to read the model" panel, and keep the full clinical diagram one click away (`#full-diagram`, further down the page).

**What to do:** the first time you work with Dr. Breuss, show him both options and ask which he wants: A, B, or keep the current diagram.

1. Preview them: run `python3 -m http.server 8000` in this folder, then open http://localhost:8000/concepts/. A switcher at the bottom flips between Current, A and B. If this branch has been merged, https://about-tt.im/concepts/ also works; that page is marked noindex.
2. Once he chooses, build it into `index.html`:
   - Replace the hero's `<figure class="hero-art">…</figure>` with `<figure class="hero-art"><div class="frame"><div class="hc mx on" id="mxHero"></div></div><figcaption class="cap">…</figcaption></figure>`.
   - Copy the rules from `concepts/hero-concepts.css` into the `<style>` of `index.html`, leaving out the "concept switcher" and "review option" blocks.
   - Copy `concepts/hero-concepts.js` into the end of the main `<script>` of `index.html`. Keep the helpers, `mount()` and only the chosen drawing function (`hourglass()` or `rings()`). Call `mount(document.getElementById('mxHero'), <chosen>, '<title>')`, and delete the switcher and review-option code. The code reads `PILLARS`, `selectPillar()` and `showTarget()` from the page.
   - Delete the `concepts/` folder, run `python3 tools/prerender.py`, and check the page on a phone-sized window.
3. If he keeps the current diagram, just delete `concepts/`.

**A second, smaller suggestion to show him:** put each pillar's name inside the colored header of its card in the "Five pillars" section, instead of below it. On the concepts page, a dashed "For review" bar above the pillar cards toggles between the two. If he likes it, copy the `.pc-title-in-cap` rules from `concepts/hero-concepts.css` into `index.html` without the `.pc-title-in-cap` prefix.

## Rules that keep the site healthy

1. **Always start from the latest files in this repository.** Never upload an older copy of a page over a newer one. That is how the Google Analytics tag was lost in November 2026: an older `index.html` was uploaded over the version that had it. If Dr. Breuss edits files on his computer, pull first (`git pull`). If he uploads through the GitHub website, he should download the current file from GitHub first.
2. **Keep the `<head>` block on every public page** (`index.html`, `interventions.html`, `diagnoses.html`):
   - the Google Analytics tag (`G-69RR52KN9Y`),
   - `<link rel="canonical">`,
   - the `og:` social-preview tags,
   - the `application/ld+json` structured data.
3. **Page content lives in JavaScript data in each page,** not in the HTML:
   - `index.html`: `const PILLARS` (the five pillars, 32 targets, guiding questions and interventions)
   - `interventions.html`: `const DATA` (interventions per target) and `PILLAR_META`
   - `diagnoses.html`: `const DX` (diagnoses), `const T` (target names) and `PILLARS`

   To change content, edit that data.
4. **Never hand-edit a block between `<!-- prerender:NAME … -->` and `<!-- /prerender:NAME -->`.** Those are copies of the rendered content, baked into the HTML so search engines and AI crawlers that don't run JavaScript can read it. The browser throws them away and re-renders from the data. After changing data, run `python3 tools/prerender.py` (needs Google Chrome), or just push. The GitHub Action in `.github/workflows/prerender.yml` runs it on every push to `main` and commits the refreshed copy, so **pull after pushing** before making the next change.
5. If the Action fails, GitHub emails the person who pushed. The usual cause is rule 1 or rule 2. Its log says exactly what's missing.

## Previewing

`python3 -m http.server 8000`, then open http://localhost:8000. Check desktop and a phone-sized window (about 390px wide).

## Search engines and AI tools: what's in place

| File | Purpose |
| --- | --- |
| `robots.txt` | Lets every crawler in, including AI assistants, and points to the sitemap. It explains how to opt out of AI *training* while staying in AI search; that choice is Dr. Breuss's. |
| `sitemap.xml` | The public pages. Add any new public page here. |
| `llms.txt` | A short, hand-written overview for AI tools. Keep it accurate when the model changes. |
| `llms-full.txt` | All model content in plain text. Generated by `tools/prerender.py`; don't edit by hand. |
| `og-image.png`, `favicon.png`, `apple-touch-icon.png` | The share image and icons. Rebuild them with `python3 tools/make_images.py`; the share image's design is in `tools/og-image.html`. |
| `_config.yml` | Keeps `CLAUDE.md` and `tools/` off the public website. |

**Adding a new public page:**

1. Copy the `<head>` block from `interventions.html` and update the title, description, canonical URL, `og:` tags and JSON-LD.
2. Add the page to `sitemap.xml` and `llms.txt`.
3. If its content is drawn by JavaScript, mark the containers with `data-prerender` and prerender comments, and add the page to `PAGES` in `tools/prerender.py`.

**Hidden pages:** `builder.html` is unfinished and hidden from the menu, so it has `<meta name="robots" content="noindex, nofollow">`. To launch it, remove that tag and its entry in `HIDDEN_PAGES` in `tools/prerender.py`, link it from the nav, and add it to `sitemap.xml` and `llms.txt`.

## Other files

- `TTIM.svg` / `TTIM.png`: the full diagram (website and download). `TTIM Labeled SVG.svg` is Dr. Breuss's Inkscape source.
- `builder.html`: the hidden drag-and-drop formulation builder.
- License: the model and site content are CC BY-NC-ND 4.0, © 2026 Alexey Breuss, Psy.D.
