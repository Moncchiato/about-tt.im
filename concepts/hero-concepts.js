/* =====================================================================
   TTIM hero concepts — prototype for review.
   Draws the model as live SVG from the page's PILLARS data, so labels are
   real text (crawlable, accessible) and every ◆ is one treatment target.
   Depends on: PILLARS, selectPillar(), showTarget() from the main script.
   ===================================================================== */
(function () {
  const PC = Object.fromEntries(PILLARS.map(p => [p.id, p]));
  const f = n => Math.round(n * 10) / 10;
  const esc = s => String(s).replace(/&(?!amp;)/g, '&amp;');
  const mobile = matchMedia('(max-width:640px)');

  /* ---------- shared SVG helpers ---------- */
  const text = (x, y, s, cls, anchor = 'middle') =>
    `<text x="${f(x)}" y="${f(y)}" class="${cls}" text-anchor="${anchor}">${s}</text>`;
  const lines = (x, y, arr, cls, lh) =>
    `<text class="${cls}" text-anchor="middle">${arr.map((l, i) => `<tspan x="${f(x)}" y="${f(y + i * lh)}">${l}</tspan>`).join('')}</text>`;
  const diamond = 'M0,-7.2L7.2,0L0,7.2L-7.2,0Z';
  const beads = (id, pts, d0) => pts.map(([x, y], i) =>
    `<g transform="translate(${f(x)} ${f(y)})"><g class="tg" data-p="${id}" data-i="${i}" style="--d:${(d0 + i * .05).toFixed(2)}s">` +
    `<circle class="tg-hit" r="13"/><path class="tg-mark" d="${diamond}"/></g></g>`).join('');
  const rowPts = (cx, y, n, gap = 24) => Array.from({ length: n }, (_, i) => [cx + (i - (n - 1) / 2) * gap, y]);

  function ctx(d, fill, labelSvg, side, delay, extraCls = '') {
    return `<g class="ctx ${extraCls} ${side > 0 ? 'rise' : 'sink'}" style="--d:${delay}s"><path d="${d}" style="fill:${fill}"/>${labelSvg || ''}</g>`;
  }
  function pillar(id, d, labelSvg, pts, side, delay) {
    const p = PC[id];
    return `<g class="${side > 0 ? 'rise' : 'sink'}" style="--d:${delay}s"><g class="pz" data-p="${id}" tabindex="0" role="button" ` +
      `aria-label="${p.name}: ${p.targets.length} treatment targets" style="--pc:${p.hex}">` +
      `<path class="pz-fill" d="${d}"/>${labelSvg}${beads(id, pts, 1.25 + delay * .4)}</g></g>`;
  }
  const skin = (x1, x2, y, tag) =>
    `<line class="skin-line" x1="${x1}" x2="${x2}" y1="${y}" y2="${y}"/>` +
    (tag ? text(x1 - 10, y + 4.5, 'Skin', 'skin-tag', 'end') : '');

  /* =================================================================
     Concept A — Hourglass: the author's own geometry, redrawn calmly.
     ================================================================= */
  function hourglass() {
    const Y = 300;
    const up = (hw, eave, peak) => `M${500 - hw},${Y}L${500 - hw},${eave}L500,${peak}L${500 + hw},${eave}L${500 + hw},${Y}Z`;
    const dn = (hw, eave, peak) => `M${500 - hw},${Y}L${500 - hw},${eave}L500,${peak}L${500 + hw},${eave}L${500 + hw},${Y}Z`;
    const band = (a, b) => a + b; // even-odd fill turns two nested shapes into a band
    const bannerUp = (x1, x2, top, notch) => `M${x1},${top}L${(x1 + x2) / 2},${top + notch}L${x2},${top}L${x2},${Y}L${x1},${Y}Z`;
    const bannerDn = (x1, x2, bot, notch) => `M${x1},${Y}L${x2},${Y}L${x2},${bot}L${(x1 + x2) / 2},${bot - notch}L${x1},${bot}Z`;

    const s = [];
    // outside the skin
    s.push(ctx('M118,40L882,40L802,300L198,300Z', '#f5efda', '', 1, .25, 'flare'));
    s.push(ctx(band(up(292, 98, 80), up(256, 140, 124)), '#ebe3c4', text(500, 112, 'Greater World', 'ctx-name'), 1, .4));
    s.push(ctx(band(up(256, 140, 124), up(214, 182, 166)), '#e0d7b3', text(500, 154, 'Culture', 'ctx-name'), 1, .5));
    s.push(pillar('relationships', band(up(214, 182, 166), up(60, 236, 226)),
      text(362, 216, 'Relationships', 'pz-name'), rowPts(362, 246, 4), 1, .6));
    s.push(pillar('purpose', bannerUp(566, 714, 148, 14),
      text(640, 198, 'Purpose', 'pz-name'), [...rowPts(640, 228, 4), ...rowPts(640, 254, 3)], 1, .7));
    s.push(ctx(up(60, 236, 226), '', text(500, 276, 'Behavior', 'ctx-name'), 1, .35, 'core'));
    // inside the skin
    s.push(ctx('M198,300L802,300L882,572L118,572Z', '#e4ede8', '', -1, .25, 'flare'));
    s.push(pillar('metabolic', band(dn(292, 524, 546), dn(250, 448, 462)),
      text(500, 526, 'Metabolic Health', 'pz-name'), rowPts(500, 485, 8, 26), -1, .7));
    s.push(ctx(dn(250, 448, 462), '#cbd9d3', text(500, 440, 'Greater Nervous System', 'ctx-name'), -1, .55));
    s.push(pillar('allostatic', bannerDn(288, 436, 420, 12),
      lines(362, 328, ['Allostatic', 'Load'], 'pz-name', 24), [...rowPts(362, 374, 4), ...rowPts(362, 397, 3)], -1, .6));
    s.push(pillar('cognitions', bannerDn(564, 712, 420, 12),
      text(638, 340, 'Cognitions', 'pz-name'), [...rowPts(638, 374, 3), ...rowPts(638, 397, 3)], -1, .6));
    s.push(ctx('M440,300H560V360H440Z', '', text(500, 328, 'Emotion', 'ctx-name') + text(500, 346, 'Affect + Concept', 'ctx-sub'), -1, .35, 'core'));
    s.push(ctx('M440,360H560V408H440Z', '#b9cbc4', lines(500, 380, ['Executive', 'functioning'], 'ctx-sub', 13), -1, .45));
    s.push(skin(150, 850, Y, true));
    s.push(text(500, 27, 'Outside the skin', 'edge-label'));
    s.push(text(500, 594, 'Inside the skin', 'edge-label'));
    return { svg: s.join(''), vb: '96 6 808 600', vbm: '196 6 608 600' };
  }

  /* =================================================================
     Concept B — Horizon: concentric layers split by the skin.
     Outward above (the world), inward below (the body); the person is
     the dark core where Behavior meets Emotion.
     ================================================================= */
  function rings() {
    const K = .8, CX = 500, CY = 300;
    const P = (r, deg, side) => { const a = deg * Math.PI / 180; return [CX + r * Math.cos(a), CY - side * r * K * Math.sin(a)]; };
    const sector = (r1, r2, a1, a2, side) => {
      const [x1, y1] = P(r2, a1, side), [x2, y2] = P(r2, a2, side), sw = side > 0 ? 1 : 0, lg = (a1 - a2) > 180 ? 1 : 0;
      let d = `M${f(x1)},${f(y1)}A${r2},${f(r2 * K)} 0 ${lg} ${sw} ${f(x2)},${f(y2)}`;
      if (r1 > 0) { const [x3, y3] = P(r1, a2, side), [x4, y4] = P(r1, a1, side); d += `L${f(x3)},${f(y3)}A${r1},${f(r1 * K)} 0 ${lg} ${1 - sw} ${f(x4)},${f(y4)}`; }
      else d += `L${CX},${CY}`;
      return d + 'Z';
    };
    const arc = (r, a1, a2, side) => { const [x1, y1] = P(r, a1, side), [x2, y2] = P(r, a2, side); return `M${f(x1)},${f(y1)}A${r},${f(r * K)} 0 0 ${side > 0 ? 1 : 0} ${f(x2)},${f(y2)}`; };
    const arcPts = (r, a1, a2, n, side) => Array.from({ length: n }, (_, i) => P(r, n === 1 ? (a1 + a2) / 2 : a1 + (a2 - a1) * i / (n - 1), side));
    const T = 1, B = -1;
    const core = 84, R = 232, C = 280, W = 328;       // outside: Behavior, Relationships, Culture, Greater World
    const E = 84, EF = 106, N = 236, M = 328;         // inside: Emotion, Exec. functioning, Nervous system, Metabolic

    const s = [];
    s.push(`<defs><path id="rgGns" d="${arc(N - 11, 150, 30, B)}"/><path id="rgEf" d="${arc((E + EF) / 2 + 3.5, 165, 15, B)}"/></defs>`);
    // outside the skin — rises from the skin line
    s.push(ctx(sector(C, W, 180, 0, T), '#ece5c9', text(500, CY - (C + W) / 2 * K + 5, 'Greater World', 'ctx-name'), T, .55));
    s.push(ctx(sector(R, C, 180, 0, T), '#e2d9b6', text(500, CY - (R + C) / 2 * K + 5, 'Culture', 'ctx-name'), T, .45));
    s.push(pillar('relationships', sector(core, R, 180, 56, T),
      text(436, 198, 'Relationships', 'pz-name'), rowPts(436, 224, 4), T, .35));
    s.push(pillar('purpose', sector(core, C, 52, 0, T),
      text(668, 238, 'Purpose', 'pz-name'), [...rowPts(668, 262, 4, 22), ...rowPts(668, 284, 3, 22)], T, .45));
    s.push(ctx(sector(0, core, 180, 0, T), '', text(500, 276, 'Behavior', 'ctx-name'), T, .25, 'core'));
    // inside the skin — sinks from the skin line
    s.push(pillar('metabolic', sector(N, M, 180, 0, B),
      text(500, 541, 'Metabolic Health', 'pz-name'),
      [...arcPts((N + M) / 2 - 2, 168, 120, 4, B), ...arcPts((N + M) / 2 - 2, 60, 12, 4, B)], B, .55));
    s.push(ctx(sector(EF, N, 180, 0, B), '#cbd9d3',
      `<text class="arc-label"><textPath href="#rgGns" startOffset="50%" text-anchor="middle">Greater nervous system</textPath></text>`, B, .45));
    s.push(pillar('allostatic', sector(EF, N - 22, 180, 91.5, B),
      lines(396, 404, ['Allostatic', 'Load'], 'pz-name', 26), [...rowPts(344, 322, 4, 23), ...rowPts(352, 346, 3, 23)], B, .35));
    s.push(pillar('cognitions', sector(EF, N - 22, 88.5, 0, B),
      text(600, 412, 'Cognitions', 'pz-name'), [...rowPts(656, 322, 3, 23), ...rowPts(648, 346, 3, 23)], B, .35));
    s.push(ctx(sector(E, EF, 180, 0, B), '#a9beb6',
      `<text class="arc-label ef"><textPath href="#rgEf" startOffset="50%" text-anchor="middle">Executive functioning</textPath></text>`, B, .3));
    s.push(ctx(sector(0, E, 180, 0, B), '', text(500, 326, 'Emotion', 'ctx-name') + text(500, 344, 'Affect + Concept', 'ctx-sub'), B, .25, 'core'));
    s.push(skin(150, 850, CY, true));
    s.push(text(500, 22, 'Outside the skin', 'edge-label'));
    s.push(text(500, 592, 'Inside the skin', 'edge-label'));
    return { svg: s.join(''), vb: '96 4 808 598', vbm: '164 4 672 598' };
  }

  /* ---------- reading panel ---------- */
  const chips = () => PILLARS.map(p =>
    `<button type="button" class="mx-chip" data-p="${p.id}" style="--pc:${p.hex}"><i></i>${p.name}<small>${p.targets.length}</small></button>`).join('');
  const defaultPanel = () => `
    <p class="mx-k">How to read the model</p>
    <h3>Five pillars around one person</h3>
    <ol>
      <li><b>The line through the middle is the skin.</b> Above it is everything outside a person; below it, everything inside.</li>
      <li><b>The five coloured pillars</b> are the domains a good lived experience is built on.</li>
      <li><b>Each ◆ is a treatment target</b> &mdash; 32 in all. Hover or tap one to see it.</li>
    </ol>
    <div class="mx-chips">${chips()}</div>
    <div class="mx-actions"><a class="btn btn-ghost" href="#full-diagram">See the full clinical diagram</a></div>`;
  const pillarPanel = id => {
    const p = PC[id];
    return `
    <button type="button" class="mx-back">&larr; How to read the model</button>
    <p class="mx-k"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.hex};margin-right:7px"></span>${p.targets.length} treatment targets &middot; ${p.tag}</p>
    <h3>${p.name}</h3>
    <p class="blurb">${p.blurb}</p>
    <ul class="mx-tl">${p.targets.map((t, i) => `<li><button type="button" data-p="${id}" data-i="${i}">${esc(t.name)}</button></li>`).join('')}</ul>
    <div class="mx-actions"><a class="btn btn-primary" href="#explorer" data-open="${id}">Open in the explorer</a></div>`;
  };

  /* ---------- mount + interactions ---------- */
  function openTarget(id, i) {
    const p = PC[id];
    selectPillar(id);
    if (matchMedia('(max-width:920px)').matches) showTarget(p, p.targets[i]);
    else { document.getElementById('explorer').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => showTarget(p, p.targets[i]), 350); }
  }

  function mount(el, build, title) {
    const g = build();
    el.innerHTML = `<div class="mx-fig"><svg viewBox="${g.vb}" role="group" aria-label="${title}">${g.svg}</svg><div class="mx-tip" aria-hidden="true"></div></div>
      <div class="mx-panel" aria-live="polite"></div>`;
    const svg = el.querySelector('svg'), panel = el.querySelector('.mx-panel'), tip = el.querySelector('.mx-tip'), fig = el.querySelector('.mx-fig');
    const fitVB = () => svg.setAttribute('viewBox', mobile.matches ? g.vbm : g.vb);
    fitVB(); mobile.addEventListener('change', fitVB);

    let pinned = null, shown;
    const render = id => {
      if (id === shown) return; shown = id;
      svg.classList.toggle('dim', !!id);
      svg.querySelectorAll('.pz').forEach(z => z.classList.toggle('on', z.dataset.p === id));
      panel.innerHTML = id ? pillarPanel(id) : defaultPanel();
      panel.querySelectorAll('.mx-chip').forEach(c => c.classList.toggle('on', c.dataset.p === id));
    };
    render(null);

    svg.addEventListener('pointerover', e => { const z = e.target.closest('.pz'); if (z && !pinned) render(z.dataset.p); });
    svg.addEventListener('pointerleave', () => { tip.classList.remove('show'); render(pinned); });
    svg.addEventListener('click', e => {
      const t = e.target.closest('.tg');
      if (t) { pinned = t.dataset.p; render(pinned); return; }
      const z = e.target.closest('.pz');
      pinned = z ? (pinned === z.dataset.p ? null : z.dataset.p) : null;
      render(pinned);
    });
    svg.addEventListener('focusin', e => { const z = e.target.closest('.pz'); if (z) render(z.dataset.p); });
    svg.addEventListener('keydown', e => {
      const z = e.target.closest('.pz'); if (!z || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault(); pinned = z.dataset.p; render(pinned);
    });
    // target tooltip
    svg.addEventListener('pointerover', e => {
      const t = e.target.closest('.tg'); if (!t) return;
      const p = PC[t.dataset.p], r = t.getBoundingClientRect(), fr = fig.getBoundingClientRect();
      tip.textContent = p.targets[+t.dataset.i].name.replace(/&amp;/g, '&');
      tip.style.left = (r.left + r.width / 2 - fr.left) + 'px';
      tip.style.top = (r.top - fr.top) + 'px';
      tip.classList.add('show');
    });
    svg.addEventListener('pointerout', e => { if (e.target.closest('.tg')) tip.classList.remove('show'); });

    panel.addEventListener('click', e => {
      const chip = e.target.closest('.mx-chip'); if (chip) { pinned = chip.dataset.p; render(pinned); return; }
      if (e.target.closest('.mx-back')) { pinned = null; render(null); return; }
      const tb = e.target.closest('.mx-tl button'); if (tb) { openTarget(tb.dataset.p, +tb.dataset.i); return; }
      const op = e.target.closest('[data-open]'); if (op) setTimeout(() => selectPillar(op.dataset.open), 350);
    });
    panel.addEventListener('pointerover', e => {
      const tb = e.target.closest('.mx-tl button');
      svg.querySelectorAll('.tg.hot').forEach(x => x.classList.remove('hot'));
      if (tb) svg.querySelector(`.tg[data-p="${tb.dataset.p}"][data-i="${tb.dataset.i}"]`)?.classList.add('hot');
    });
  }

  mount(document.getElementById('mxHourglass'), hourglass, 'The Treatment Target Identification Model, simplified as an hourglass');
  mount(document.getElementById('mxRings'), rings, 'The Treatment Target Identification Model, drawn as layers around a person');

  /* =================================================================
     Concept C — Step-through: Dr. Breuss's own artwork, built up in
     three steps (layers → pillars → treatment targets). The images are
     his intermediate exports, trimmed to the same frame (concepts/steps/).
     ================================================================= */
  const nTargets = PILLARS.reduce((n, p) => n + p.targets.length, 0);
  const STEPS = [
    { tab: 'Layers', img: 'steps/ttim-1-layers.webp', h: 'The layers of a life',
      p: 'The line through the middle is the <b>skin</b>. Above it is everything outside a person: Behavior, Relationships, Culture and the Greater World. Below it is everything inside: Emotion (Affect + Concept), Executive Functioning, the Greater Nervous System and Metabolic Health.',
      alt: 'The TTIM layers. An hourglass split by the skin. Outside the skin, from the inside out: Behavior, Relationships, Culture and the Greater World. Inside the skin: Emotion (Affect and Concept), Executive Functioning, the Greater Nervous System and Metabolic Health.' },
    { tab: 'Pillars', img: 'steps/ttim-2-pillars.webp', h: 'Five pillars',
      p: 'Five pillars hold up a good lived experience. <b>Relationships</b> and <b>Metabolic Health</b> are whole layers; <b>Purpose</b>, <b>Allostatic Load</b> and <b>Cognitions</b> are the pink banners. They are heavily interconnected: a deficit in one ripples through the others.',
      alt: 'The TTIM with its five pillars: Relationships and Metabolic Health as layers, and Purpose, Allostatic Load and Cognitions as pink banners.' },
    { tab: 'Targets', img: 'steps/ttim-3-targets.webp', h: `${nTargets} treatment targets`,
      p: `Each green hexagon is a <b>treatment target</b>: something a clinician can assess with guiding questions and treat with evidence-based interventions. There are ${nTargets} across the five pillars.`,
      alt: `The complete TTIM, with all ${nTargets} treatment targets shown as green hexagons inside the five pillars.` }
  ];
  function mountSteps(el) {
    el.innerHTML = `<div class="mx-fig st-fig"><div class="st-stage" role="button" tabindex="-1" title="Next step">
        ${STEPS.map((s, i) => `<img src="${s.img}" alt="${s.alt}" class="${i ? '' : 'on'}" ${i ? 'aria-hidden="true"' : ''}>`).join('')}
      </div></div>
      <div class="mx-panel st-panel">
        <div class="st-tabs" role="tablist" aria-label="Steps">${STEPS.map((s, i) =>
          `<button type="button" role="tab" data-i="${i}"><b>${i + 1}</b>${s.tab}</button>`).join('')}</div>
        <div class="st-text" aria-live="polite"></div>
      </div>`;
    const imgs = [...el.querySelectorAll('.st-stage img')], tabs = [...el.querySelectorAll('.st-tabs button')], text = el.querySelector('.st-text');
    let at = 0;
    const go = i => {
      at = Math.max(0, Math.min(STEPS.length - 1, i));
      imgs.forEach((im, j) => { im.classList.toggle('on', j === at); im.toggleAttribute('aria-hidden', j !== at); });
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === at); t.classList.toggle('done', j < at); });
      const s = STEPS[at], last = at === STEPS.length - 1;
      text.innerHTML = `<p class="mx-k">Step ${at + 1} of ${STEPS.length}</p><h3>${s.h}</h3><p class="blurb">${s.p}</p>
        <div class="mx-actions">${last
          ? `<a class="btn btn-primary" href="#explorer">Explore the targets</a><a class="btn btn-ghost" href="#full-diagram">See the full diagram</a><button type="button" class="st-link" data-go="0">Start over</button>`
          : `<button type="button" class="btn btn-primary" data-go="${at + 1}">Next: ${STEPS[at + 1].tab.toLowerCase()} &rarr;</button>${at ? `<button type="button" class="st-link" data-go="${at - 1}">Back</button>` : ''}`}</div>`;
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-go],.st-tabs button'); if (b) { go(+(b.dataset.go ?? b.dataset.i)); return; }
      if (e.target.closest('.st-stage')) go(at === STEPS.length - 1 ? 0 : at + 1);
    });
    el.querySelector('.st-tabs').addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { go(at + (e.key === 'ArrowRight' ? 1 : -1)); tabs[at].focus(); }
    });
    go(0);
  }
  mountSteps(document.getElementById('mxSteps'));

  /* ---------- review option: pillar-card titles inside the colored header ---------- */
  const strip = document.getElementById('pillarsStrip');
  if (strip) {
    const note = document.createElement('div');
    note.className = 'review-note';
    note.innerHTML = `<span>For review: where should the pillar names sit?</span>
      <button type="button" class="on" data-t="below">Below the color (current)</button>
      <button type="button" data-t="cap">Inside the colored header</button>`;
    strip.before(note);
    note.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      note.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      document.body.classList.toggle('pc-title-in-cap', b.dataset.t === 'cap');
    });
  }

  /* ---------- concept switcher (review only) ---------- */
  const caps = {
    current: 'The complete TTIM: five pillars, 32 treatment targets, and the systems beneath a lived experience.',
    hourglass: 'The TTIM at a glance. Explore any pillar here, or see the full clinical diagram further down the page.',
    rings: 'The TTIM at a glance. Explore any pillar here, or see the full clinical diagram further down the page.',
    steps: 'The TTIM in three steps. Tap the diagram or use the steps to build it up; the full clinical diagram is further down the page.'
  };
  function show(v) {
    if (!caps[v]) v = 'rings';
    document.querySelectorAll('.hc').forEach(h => h.classList.toggle('on', h.dataset.v === v));
    document.querySelectorAll('.cswitch button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    document.getElementById('heroCap').textContent = caps[v];
    const u = new URL(location); u.searchParams.set('v', v); history.replaceState(null, '', u);
  }
  document.querySelectorAll('.cswitch button').forEach(b => b.addEventListener('click', () => show(b.dataset.v)));
  show(new URLSearchParams(location.search).get('v') || 'rings');
})();
