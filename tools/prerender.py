#!/usr/bin/env python3
"""
Bake crawler-readable HTML into the site's pages, and rebuild llms-full.txt.

WHY
  index.html, interventions.html and diagnoses.html draw most of their content with
  JavaScript, from the data arrays in each page (PILLARS, DATA, DX ...). Search engines
  and AI crawlers that don't run JavaScript would otherwise see almost none of it.

WHAT IT DOES
  1. Opens each page in headless Chrome.
  2. Copies every element marked `data-prerender` (as the browser rendered it) into the
     HTML file, between its `<!-- prerender:ID ... -->` and `<!-- /prerender:ID -->` comments.
  3. Writes llms-full.txt (a plain-text copy of the whole model for AI tools) from the
     same data.
  4. Checks every public page still has Google Analytics, its canonical link, its social
     preview image and its structured data. A missing one usually means an old copy of a
     file was re-uploaded over a newer one.

  In the browser, each page clears those blocks and renders them again from the data, so
  the data arrays stay the single source of truth. Never edit a baked block by hand.

USAGE
  python3 tools/prerender.py           # update the pages and llms-full.txt
  python3 tools/prerender.py --check   # report what is out of date, change nothing

  The GitHub Action in .github/workflows/prerender.yml runs this on every push to main.
  Needs Python 3.8+ and Google Chrome (or Chromium). Set CHROME=/path/to/chrome if it
  isn't found automatically.
"""
import argparse
import functools
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://about-tt.im"
GA_ID = "G-69RR52KN9Y"

# page -> JavaScript expression that returns the page's data (read from the page itself)
PAGES = {
    "index.html": "({PILLARS})",
    "interventions.html": "({DATA, PILLAR_META})",
    "diagnoses.html": "({DX, T, PILLARS, GROUPS})",
}

# Every public page must keep these.
REQUIRED = {
    "Google Analytics tag": GA_ID,
    "canonical link": 'rel="canonical"',
    "social preview image (og:image)": 'property="og:image"',
    "structured data (JSON-LD)": "application/ld+json",
}
HIDDEN_PAGES = {"builder.html": "noindex"}  # pages that must stay out of search results

MARKER = re.compile(r"(<!-- prerender:([\w-]+)[^>]*?-->)(.*?)(<!-- /prerender:\2 -->)", re.S)

HARNESS = """<!doctype html><meta charset="utf-8"><body><pre id="out"></pre><script>
const PAGES = %s;
(async () => {
  const result = {};
  for (const [page, expr] of Object.entries(PAGES)) {
    const f = document.createElement('iframe');
    f.style.cssText = 'width:1280px;height:2000px;border:0';
    document.body.appendChild(f);
    await new Promise(r => { f.onload = r; f.src = '/' + page; });
    await new Promise(r => setTimeout(r, 1500));
    const w = f.contentWindow, d = f.contentDocument;
    const blocks = {};
    d.querySelectorAll('[data-prerender]').forEach(el => {
      const c = el.cloneNode(true);
      // scroll-reveal state depends on the viewport; keep the baked copy neutral
      [c, ...c.querySelectorAll('.reveal')].forEach(x => x.classList && x.classList.remove('in'));
      blocks[el.id] = c.outerHTML;
    });
    let data = null, error = null;
    try { data = JSON.parse(w.eval('JSON.stringify(' + expr + ')')); } catch (e) { error = String(e); }
    result[page] = { blocks, data, error };
    f.remove();
  }
  document.getElementById('out').textContent = JSON.stringify(result);
})().catch(e => { document.getElementById('out').textContent = JSON.stringify({ fatal: String(e) }); });
</script>"""


# ---------------------------------------------------------------- browser
def find_chrome():
    names = [os.environ.get("CHROME"),
             "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
             "/Applications/Chromium.app/Contents/MacOS/Chromium",
             r"C:\Program Files\Google\Chrome\Application\chrome.exe",
             shutil.which("google-chrome"), shutil.which("google-chrome-stable"),
             shutil.which("chromium"), shutil.which("chromium-browser"), shutil.which("chrome")]
    for n in names:
        if n and Path(n).exists():
            return n
    sys.exit("prerender: couldn't find Google Chrome or Chromium. Install it, or set CHROME=/path/to/chrome.")


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path.startswith("/__prerender__.html"):
            body = (HARNESS % json.dumps(PAGES)).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()


def render_pages():
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_address[1]}/__prerender__.html"
    blocked = ["www.googletagmanager.com", "www.google-analytics.com", "fonts.googleapis.com", "fonts.gstatic.com"]
    with tempfile.TemporaryDirectory() as profile:
        cmd = [find_chrome(), "--headless=new", "--disable-gpu", "--no-first-run", f"--user-data-dir={profile}",
               "--host-resolver-rules=" + ", ".join(f"MAP {h} ~NOTFOUND" for h in blocked),  # no analytics hits
               "--virtual-time-budget=30000", "--dump-dom", url]
        if os.environ.get("CI"):
            cmd.insert(1, "--no-sandbox")
        dom = subprocess.run(cmd, capture_output=True, text=True, timeout=180).stdout
    server.shutdown()
    m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
    if not m or not m.group(1).strip():
        sys.exit("prerender: Chrome didn't return any output. Is a page's JavaScript broken?")
    result = json.loads(html.unescape(m.group(1)))
    if "fatal" in result:
        sys.exit("prerender: " + result["fatal"])
    for page, r in result.items():
        if r["error"]:
            sys.exit(f"prerender: couldn't read the data in {page}: {r['error']}")
    return result


# ---------------------------------------------------------------- baking
def bake(page, text, blocks):
    missing = []

    def swap(m):
        start, bid, _, end = m.groups()
        if bid not in blocks:
            missing.append(bid)
            return m.group(0)
        # drop the indentation the page's templates produce; a newline renders the same as a space
        block = re.sub(r"[ \t]*\n\s*", "\n", blocks[bid])
        return f"{start}\n{block}\n{end}"

    new = MARKER.sub(swap, text)
    if missing:
        sys.exit(f"prerender: {page} has prerender markers for {', '.join(missing)} but no matching "
                 f"element with data-prerender and that id. Did the page's JavaScript fail?")
    return new


# ---------------------------------------------------------------- llms-full.txt
def plain(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", str(s)))).strip()


def page_text(page, pattern):
    m = re.search(pattern, (ROOT / page).read_text(encoding="utf-8"), re.S)
    return plain(m.group(1)) if m else ""


def llms_full(result):
    pillars = result["index.html"]["data"]["PILLARS"]
    iv = result["interventions.html"]["data"]
    dx = result["diagnoses.html"]["data"]
    n_targets = sum(len(p["targets"]) for p in pillars)
    meta_desc = page_text("index.html", r'<meta name="description" content="([^"]*)"')
    disclaimer = page_text("index.html", r'<p class="disclaimer">(.*?)</p>')
    out = []
    w = out.append
    w("# The Treatment Target Identification Model (TTIM): full reference\n")
    w(f"> {meta_desc}\n")
    w(f"The TTIM was proposed by Alexey Breuss, Psy.D. It has {len(pillars)} interconnected pillars and "
      f"{n_targets} treatment targets. Website: {SITE}/ . License: CC BY-NC-ND 4.0 "
      "(https://creativecommons.org/licenses/by-nc-nd/4.0/). Please cite the TTIM and Alexey Breuss, Psy.D. "
      "when you use or summarize this material.\n")
    w(disclaimer + "\n")
    w("This file is generated from the website's data by tools/prerender.py. A shorter overview is at "
      f"{SITE}/llms.txt .\n")
    w("## Contents\n\n1. The five pillars and their treatment targets\n2. Intervention options for each target\n"
      "3. Treatment targets by diagnosis\n")

    w(f"## 1. The five pillars and their treatment targets\n\nSource: {SITE}/#explorer\n")
    for p in pillars:
        w(f"### {p['name']} ({len(p['targets'])} treatment targets)\n")
        w(f"Position in the model: {plain(p['tag'])}. {plain(p['blurb'])}\n")
        w(plain(p["desc"]) + "\n")
        for t in p["targets"]:
            w(f"#### {plain(t['name'])}\n")
            w(f"Why it is a target: {plain(t['why'])}\n")
            w("Guiding questions:\n" + "\n".join(f"- {plain(q)}" for q in t["q"]) + "\n")
            w("Sample interventions: " + "; ".join(plain(x) for x in t["ix"]) + "\n")

    meta = iv["PILLAR_META"]
    w(f"## 2. Intervention options for each target\n\nSource: {SITE}/interventions.html . Sample, evidence-based "
      "options drawn from across modalities, with a note on how each one works on the target's mechanism. "
      "Illustrative, not exhaustive or prescriptive, and not treatment advice.\n")
    for t in iv["DATA"]:
        kind = "cross-cutting area" if t["pillar"] == "crosscutting" else "treatment target"
        w(f"### {plain(t['target'])} ({meta[t['pillar']]['name']}, {kind})\n")
        if t["pillar"] == "crosscutting":
            w(plain(t["why"]) + "\n")
            if t.get("questions"):
                w("Guiding questions:\n" + "\n".join(f"- {plain(q)}" for q in t["questions"]) + "\n")
        if t.get("collab"):
            w("Metabolic targets typically require collaboration with a physician, NP, or registered dietitian.\n")
        w("\n".join(f"- {plain(i['name'])} ({plain(i['modality'])}): {plain(i['how'])}" for i in t["interventions"]) + "\n")

    T, DP = dx["T"], dx["PILLARS"]
    tn = lambda k: f"{T[k][0]} ({DP[T[k][1]]['name']})"
    w(f"## 3. Treatment targets by diagnosis\n\nSource: {SITE}/diagnoses.html . Sample combinations of TTIM "
      "treatment targets for common psychiatric diagnoses. They are examples, not rules: different individuals "
      "need different targets at different points in treatment.\n")
    for d in dx["DX"]:
        abbr = f" ({d['abbr']})" if d.get("abbr") else ""
        w(f"### {plain(d['name'])}{abbr}\n")
        w(f"Group: {plain(d['group'])}\n")
        w("Core targets:\n" + "\n".join(f"- {tn(k)}: {plain(why)}" for k, why in d["core"]) + "\n")
        if d.get("also"):
            also = [tn(a[0]) + (f": {plain(a[1])}" if len(a) > 1 and a[1] else "") for a in d["also"]]
            w("Also consider:\n" + "\n".join(f"- {a}" for a in also) + "\n")
        if d.get("cross"):
            w(f"Cross-cutting: {plain(d['cross'])}\n")
        for n in ([d["note"]] if isinstance(d.get("note"), str) else d.get("note") or []):
            w(f"Note: {plain(n)}\n")
    return "\n".join(out).rstrip() + "\n"


# ---------------------------------------------------------------- health check
def health_problems(texts):
    problems = []
    for page in PAGES:
        for label, needle in REQUIRED.items():
            if needle not in texts[page]:
                problems.append(f"{page} is missing its {label}.")
    for page, needle in HIDDEN_PAGES.items():
        p = ROOT / page
        if p.exists() and needle not in p.read_text(encoding="utf-8"):
            problems.append(f"{page} should have <meta name=\"robots\" content=\"noindex, nofollow\"> so it stays out of search results.")
    return problems


def main():
    ap = argparse.ArgumentParser(description="Bake crawler-readable HTML into the site's pages.")
    ap.add_argument("--check", action="store_true", help="report what is out of date without changing files")
    args = ap.parse_args()

    result = render_pages()
    new = {}
    for page in PAGES:
        path = ROOT / page
        new[path] = bake(page, path.read_text(encoding="utf-8"), result[page]["blocks"])
    new[ROOT / "llms-full.txt"] = llms_full(result)

    stale = [p for p, t in new.items() if not p.exists() or p.read_text(encoding="utf-8") != t]
    if args.check:
        for p in stale:
            print(f"out of date: {p.relative_to(ROOT)}")
    else:
        for p in stale:
            p.write_text(new[p], encoding="utf-8")
            print(f"updated {p.relative_to(ROOT)}")
        if not stale:
            print("everything is already up to date")

    problems = health_problems({page: new[ROOT / page] for page in PAGES})
    for msg in problems:
        print(("::error::" if os.environ.get("GITHUB_ACTIONS") else "PROBLEM: ") + msg)
    if problems:
        print("See CLAUDE.md. This usually means an older copy of a file was uploaded over a newer one.")
    sys.exit(1 if problems or (args.check and stale) else 0)


if __name__ == "__main__":
    main()
