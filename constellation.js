/* ==========================================================================
   constellation.js — canvas plexus layer (Slice A)
   --------------------------------------------------------------------------
   Frozen API:

       var plexus = initPlexus(canvas, {
           getCursor,   // () => ({ x, y }) | null — read-only, polled per frame
           lowEnd,      // boolean — true disables the layer entirely
           reduced      // boolean — true disables the layer entirely
       });
       // plexus => { start, stop, destroy } — or null when reduced/lowEnd

   What this layer guarantees:
     • transparent canvas (clearRect each frame); the host page owns the bg
     • full-document field: the bitmap and the node field cover the whole page
       and scroll with it; only the viewport band (±60px) is drawn each frame
     • touches only the canvas it was handed; registers ZERO mousemove listeners
     • budgets: desktop 65 nodes / R=150 / edge cap 220
                innerWidth < 640 → 34 nodes / R=110 / edge cap 100
                scaled ×1–3 by page-height / viewport-height
     • DPR capped at 1.5 (the 1px links stay crisp, the fill rate stays sane)
     • deterministic seeded layout (stable per load), drift 6–10 px/s + bounce
     • grid-hash neighbour scan (cell = R), preallocated Float32Arrays, zero
       per-frame allocation; links are batched into two colour passes with
       prebuilt RGBA styles (no rgba string building in the frame loop);
       nodes are 2px fillRects, one fillStyle per colour
     • link alpha = (1 - d/R)^1.8 * 0.55, quantised into a few fixed levels so
       each colour pass needs a handful of strokes instead of a stroke per link
     • one zap at a time: random live link every 2800 ± 1200 ms, ~900 ms
       traverse, near-white 1.5px segment at alpha 0.9, no shadowBlur
     • cursor: gentle node pull inside 130px, same math as the site stars,
       viewport cursor shifted into document space by the scroll offset
     • sleeps (cancels the rAF) when the tab is hidden or the canvas is
       offscreen; 150ms debounced resize re-seeds only when the node count
       changes or height moves >25%; a ResizeObserver on <html> catches
       content growth without a window resize
   ========================================================================== */

(function (global) {
    'use strict';

    /* ---- Tuning ---------------------------------------------------------- */

    var SEED = 0x9E3779B9;              // fixed → identical layout every load

    var PRESET_DESKTOP = { nodes: 65, radius: 150, edgeCap: 220 };
    var PRESET_SMALL = { nodes: 34, radius: 110, edgeCap: 100 };
    var SMALL_WIDTH = 640;
    var MAX_HEIGHT_FACTOR = 3;          // page height / viewport height, capped

    /* Full-document canvas: density scales with page height, so the arrays
       hold the worst case (desktop preset × MAX_HEIGHT_FACTOR). */
    var MAX_NODES = PRESET_DESKTOP.nodes * MAX_HEIGHT_FACTOR;   // 195
    var MAX_EDGES = PRESET_DESKTOP.edgeCap * MAX_HEIGHT_FACTOR; // 660

    var DPR_CAP = 1.5;
    var MARGIN = 8;                     // keep nodes off the exact canvas edge
    var CULL_MARGIN = 60;               // px of overscan around the viewport band

    var DRIFT_MIN = 6;                  // px/s
    var DRIFT_MAX = 10;
    var MAX_DT = 0.05;                  // seconds; kills tab-switch jumps

    var CURSOR_RADIUS = 130;            // same numbers as the site star field
    var CURSOR_PULL = 26;
    var CURSOR_EASE = 0.12;

    var EDGE_FALLOFF = 1.8;
    var EDGE_ALPHA = 0.55;
    var EDGE_WIDTH = 1;
    var ALPHA_LEVELS = 4;               // quantised alpha buckets per colour

    var NODE_SIZE = 2;
    var NODE_COLOR_A = '#A78BFA';       // purple
    var NODE_COLOR_B = '#5EEAD4';       // teal
    var TEAL_SHARE = 0.4;               // ~40% teal nodes

    var ZAP_BASE = 2800;                // ms between zaps, ± ZAP_JITTER
    var ZAP_JITTER = 1200;
    var ZAP_MS = 900;                   // traverse duration
    var ZAP_WIDTH = 1.5;
    var ZAP_STYLE = 'rgba(245, 243, 255, 0.9)'; // near-white at alpha 0.9
    var ZAP_TRAIL = 0.22;               // fraction of the link the segment spans

    var RESIZE_DEBOUNCE = 150;

    var TAU = 6.283185307179586;

    /* ---- Prebuilt styles (never built inside the frame loop) -------------- */
    /* alpha for bucket b = ((b + 1) / ALPHA_LEVELS) * 0.55, i.e. the
       (1 - d/R)^1.8 * 0.55 falloff quantised to ALPHA_LEVELS steps. */
    var EDGE_STYLES = (function () {
        var rgb = ['139, 92, 246', '45, 212, 191'];
        var out = [new Array(ALPHA_LEVELS), new Array(ALPHA_LEVELS)];
        for (var c = 0; c < 2; c++) {
            for (var b = 0; b < ALPHA_LEVELS; b++) {
                var a = ((b + 1) / ALPHA_LEVELS) * EDGE_ALPHA;
                out[c][b] = 'rgba(' + rgb[c] + ', ' + a.toFixed(4) + ')';
            }
        }
        return out;
    })();

    /* ---- Deterministic RNG (mulberry32) ----------------------------------- */

    function makeRng(seed) {
        var state = seed >>> 0;
        return function () {
            state = (state + 0x6D2B79F5) >>> 0;
            var t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* Stable per-link colour: purple-dominant with teal accents, like the
       reference art (~3/8 teal). */
    function linkIsTeal(i, j) {
        var h = (i * 73856093) ^ (j * 19349663);
        return (h & 7) < 3;
    }

    /* ---- initPlexus ------------------------------------------------------- */

    function initPlexus(canvas, options) {
        if (!canvas || typeof canvas.getContext !== 'function') return null;

        var opts = options || {};
        if (opts.reduced || opts.lowEnd) return null;   // render nothing

        var doc = canvas.ownerDocument || global.document;
        var win = (doc && doc.defaultView) || global;
        if (!doc || !win) return null;

        var ctx = canvas.getContext('2d');
        if (!ctx) return null;

        var getCursor = typeof opts.getCursor === 'function' ? opts.getCursor : null;

        if (canvas.classList) canvas.classList.add('constellation-canvas');
        canvas.setAttribute('aria-hidden', 'true');

        /* -- state: all preallocated, the frame loop allocates nothing ------ */

        var px = new Float32Array(MAX_NODES);
        var py = new Float32Array(MAX_NODES);
        var vx = new Float32Array(MAX_NODES);
        var vy = new Float32Array(MAX_NODES);
        var ox = new Float32Array(MAX_NODES);   // cursor-pull offset (star math)
        var oy = new Float32Array(MAX_NODES);
        var nodeTeal = new Uint8Array(MAX_NODES);
        var twPhase = new Float32Array(MAX_NODES);  // twinkle phase, radians
        var twFreq = new Float32Array(MAX_NODES);   // angular frequency, rad/ms
        var twPeak = new Float32Array(MAX_NODES);   // twinkle peak alpha (CSS --peak)

        var nexts = new Int32Array(MAX_NODES);
        var heads = null;                       // Int32Array(cellCount), sized on resize
        var cols = 0;
        var rows = 0;

        var segPurple = new Float32Array(ALPHA_LEVELS * MAX_EDGES * 4);
        var segTeal = new Float32Array(ALPHA_LEVELS * MAX_EDGES * 4);
        var countPurple = new Int32Array(ALPHA_LEVELS);
        var countTeal = new Int32Array(ALPHA_LEVELS);

        var liveA = new Int32Array(MAX_EDGES);  // live link endpoints (node indices)
        var liveB = new Int32Array(MAX_EDGES);
        var liveCount = 0;

        var w = 1;
        var h = 1;
        var vh = 1;                     // viewport height, refreshed in resize()
        var dpr = 1;
        var preset = PRESET_DESKTOP;
        var radius = preset.radius;
        var radius2 = radius * radius;
        var edgeCap = preset.edgeCap;
        var nodeCount = preset.nodes;
        var lastSeedH = 0;              // document height at the last seed
        var lastSeedCount = -1;         // node count at the last seed
        var seeded = false;

        var rng = makeRng(SEED);

        var rafId = 0;
        var lastNow = 0;
        var hasLast = false;
        var cursorX = 0;
        var cursorY = 0;
        var cursorSeen = false;

        var zapA = -1;
        var zapB = -1;
        var zapStart = 0;
        var nextZapAt = -1;                     // -1 = schedule on next frame

        var manualRunning = true;
        var mqReduced = false;
        var pageVisible = !doc.hidden;
        var inView = true;
        var destroyed = false;
        var resizeTimer = 0;

        /* -- sizing / seeding ------------------------------------------------- */

        function buildGrid() {
            cols = Math.max(1, Math.ceil(w / radius));
            rows = Math.max(1, Math.ceil(h / radius));
            var cells = cols * rows;
            if (!heads || heads.length !== cells) heads = new Int32Array(cells);
        }

        function seedNodes() {
            var r = makeRng(SEED);
            var spanX = w - MARGIN * 2;
            var spanY = h - MARGIN * 2;
            if (spanX < 1) spanX = 1;
            if (spanY < 1) spanY = 1;
            for (var i = 0; i < nodeCount; i++) {
                px[i] = MARGIN + r() * spanX;
                py[i] = MARGIN + r() * spanY;
                var ang = r() * TAU;
                var spd = DRIFT_MIN + r() * (DRIFT_MAX - DRIFT_MIN);
                vx[i] = Math.cos(ang) * spd;
                vy[i] = Math.sin(ang) * spd;
                ox[i] = 0;
                oy[i] = 0;
                nodeTeal[i] = r() < TEAL_SHARE ? 1 : 0;
                twPhase[i] = r() * TAU;
                var tSec = 2 + r() * 3;                 // period 2s–5s
                twFreq[i] = TAU / (tSec * 1000);        // rad/ms (rAF now is ms)
                twPeak[i] = 0.2 + r() * 0.6;            // 0.2–0.8 envelope
            }
            lastSeedH = h;
            lastSeedCount = nodeCount;
            seeded = true;
        }

        function resize() {
            var rect = canvas.getBoundingClientRect();
            w = rect.width || canvas.clientWidth || win.innerWidth || 1;
            h = rect.height || canvas.clientHeight || win.innerHeight || 1;
            vh = win.innerHeight || 1;

            preset = win.innerWidth < SMALL_WIDTH ? PRESET_SMALL : PRESET_DESKTOP;
            radius = preset.radius;
            radius2 = radius * radius;

            /* Full page: scale node/edge budgets with page-height ratio. */
            var factor = h / vh;
            if (factor < 1) factor = 1;
            else if (factor > MAX_HEIGHT_FACTOR) factor = MAX_HEIGHT_FACTOR;
            var nextCount = Math.round(preset.nodes * factor);
            var nextCap = Math.round(preset.edgeCap * factor);
            if (nextCount > MAX_NODES) nextCount = MAX_NODES;
            if (nextCap > MAX_EDGES) nextCap = MAX_EDGES;
            nodeCount = nextCount;
            edgeCap = nextCap;

            dpr = Math.min(win.devicePixelRatio || 1, DPR_CAP);
            var bw = Math.max(1, Math.round(w * dpr));
            var bh = Math.max(1, Math.round(h * dpr));
            if (canvas.width !== bw) canvas.width = bw;
            if (canvas.height !== bh) canvas.height = bh;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            buildGrid();

            /* Re-seed only on node-count change or a >25% height delta;
               otherwise keep the field and just resize the bitmap/grid. */
            if (!seeded ||
                nodeCount !== lastSeedCount ||
                Math.abs(h - lastSeedH) > lastSeedH * 0.25) {
                seedNodes();
            }
        }

        /* -- lifecycle -------------------------------------------------------- */

        function canAnimate() {
            return !destroyed && manualRunning && !mqReduced && pageVisible && inView;
        }

        function cancelLoop() {
            if (rafId) {
                win.cancelAnimationFrame(rafId);
                rafId = 0;
            }
        }

        function kick() {
            if (rafId || !canAnimate()) return;
            hasLast = false;                    // first frame after sleep gets dt 0
            rafId = win.requestAnimationFrame(animate);
        }

        function onVisibility() {
            pageVisible = !doc.hidden;
            if (pageVisible) kick();
            else cancelLoop();
        }

        function onResize() {
            if (resizeTimer) win.clearTimeout(resizeTimer);
            resizeTimer = win.setTimeout(function () {
                resizeTimer = 0;
                if (destroyed) return;
                resize();                       // re-seeds only per the seed policy
                zapA = -1;
                zapB = -1;
                nextZapAt = -1;
                clearCanvas();
                hasLast = false;
                kick();
            }, RESIZE_DEBOUNCE);
        }

        var mq = null;

        function onMq() {
            mqReduced = !!(mq && mq.matches);
            if (mqReduced) {
                clearCanvas();
                cancelLoop();
            } else {
                kick();
            }
        }

        /* -- frame ------------------------------------------------------------ */

        function clearCanvas() {
            ctx.clearRect(0, 0, w, h);
        }

        function drawFrame(now) {
            var i;
            var j;
            var k;
            var b;
            var c;
            var dt;

            if (hasLast) {
                dt = (now - lastNow) / 1000;
                if (dt < 0) dt = 0;
                else if (dt > MAX_DT) dt = MAX_DT;
            } else {
                dt = 0;
                hasLast = true;
            }
            lastNow = now;

            /* Viewport band in document coords (cheap reads, zero listeners). */
            var viewTop = win.scrollY || win.pageYOffset || 0;
            var viewBottom = viewTop + (win.innerHeight || vh || 1);
            var bandTop = viewTop - CULL_MARGIN;
            var bandBottom = viewBottom + CULL_MARGIN;

            /* Cursor is read-only and polled once per frame — no listeners.
               getCursor() is viewport-relative, so shift it into doc space. */
            if (getCursor) {
                var cur = getCursor();
                if (cur) {
                    cursorX = cur.x;
                    cursorY = cur.y + viewTop;
                    cursorSeen = true;
                } else {
                    cursorSeen = false;
                }
            }

            /* -- drift + gentle cursor pull (same math as the site stars) ----- */

            var cursorR2 = CURSOR_RADIUS * CURSOR_RADIUS;
            for (i = 0; i < nodeCount; i++) {
                var x = px[i] + vx[i] * dt;
                var y = py[i] + vy[i] * dt;
                if (x < MARGIN) {
                    x = MARGIN;
                    vx[i] = -vx[i];
                } else if (x > w - MARGIN) {
                    x = w - MARGIN;
                    vx[i] = -vx[i];
                }
                if (y < MARGIN) {
                    y = MARGIN;
                    vy[i] = -vy[i];
                } else if (y > h - MARGIN) {
                    y = h - MARGIN;
                    vy[i] = -vy[i];
                }
                px[i] = x;
                py[i] = y;

                var tx = 0;
                var ty = 0;
                if (cursorSeen) {
                    var nx = x + ox[i];
                    var ny = y + oy[i];
                    var dx = cursorX - nx;
                    var dy = cursorY - ny;
                    /* Broad-phase box check, then the star pull curve. */
                    if (dx < CURSOR_RADIUS && dx > -CURSOR_RADIUS &&
                        dy < CURSOR_RADIUS && dy > -CURSOR_RADIUS) {
                        var d2 = dx * dx + dy * dy;
                        if (d2 < cursorR2 && d2 > 1) {
                            var dist = Math.sqrt(d2);
                            var force = (1 - dist / CURSOR_RADIUS) * CURSOR_PULL;
                            tx = (dx / dist) * force;
                            ty = (dy / dist) * force;
                        }
                    }
                }
                ox[i] += (tx - ox[i]) * CURSOR_EASE;
                oy[i] += (ty - oy[i]) * CURSOR_EASE;
            }

            /* -- grid hash, cell size = R (no O(n*n) scan) -------------------- */

            heads.fill(-1);
            for (i = 0; i < nodeCount; i++) {
                var gx = ((px[i] + ox[i]) / radius) | 0;
                var gy = ((py[i] + oy[i]) / radius) | 0;
                if (gx < 0) gx = 0;
                else if (gx >= cols) gx = cols - 1;
                if (gy < 0) gy = 0;
                else if (gy >= rows) gy = rows - 1;
                var cell = gy * cols + gx;
                nexts[i] = heads[cell];
                heads[cell] = i;
            }

            /* -- collect links into preallocated colour/alpha buckets --------- */

            countPurple.fill(0);
            countTeal.fill(0);
            liveCount = 0;

            outer:
            for (i = 0; i < nodeCount; i++) {
                var xi = px[i] + ox[i];
                var yi = py[i] + oy[i];
                var cx = (xi / radius) | 0;
                var cy = (yi / radius) | 0;
                if (cx < 0) cx = 0;
                else if (cx >= cols) cx = cols - 1;
                if (cy < 0) cy = 0;
                else if (cy >= rows) cy = rows - 1;

                for (var cyo = -1; cyo <= 1; cyo++) {
                    var ry = cy + cyo;
                    if (ry < 0 || ry >= rows) continue;
                    var rowBase = ry * cols;
                    for (var cxo = -1; cxo <= 1; cxo++) {
                        var rx = cx + cxo;
                        if (rx < 0 || rx >= cols) continue;
                        for (j = heads[rowBase + rx]; j !== -1; j = nexts[j]) {
                            if (j <= i) continue;           // each pair once
                            if (liveCount >= edgeCap) break outer;

                            var jx = px[j] + ox[j];
                            var jy = py[j] + oy[j];
                            var ex = jx - xi;
                            var ey = jy - yi;
                            var d2e = ex * ex + ey * ey;
                            if (d2e > radius2) continue;

                            /* Full-field live list (zap/cursor math stays global);
                               only in-band links are batched for drawing. */
                            var inBand = !(yi < bandTop && jy < bandTop) &&
                                         !(yi > bandBottom && jy > bandBottom);
                            if (inBand) {
                                var q = 1 - Math.sqrt(d2e) / radius;
                                var a = Math.pow(q, EDGE_FALLOFF); // (1-d/R)^1.8
                                var lvl = (a * ALPHA_LEVELS) | 0;
                                if (lvl >= ALPHA_LEVELS) lvl = ALPHA_LEVELS - 1;

                                var segs;
                                var counts;
                                if (linkIsTeal(i, j)) {
                                    segs = segTeal;
                                    counts = countTeal;
                                } else {
                                    segs = segPurple;
                                    counts = countPurple;
                                }
                                var slot = (lvl * edgeCap + counts[lvl]) * 4;
                                segs[slot] = xi;
                                segs[slot + 1] = yi;
                                segs[slot + 2] = jx;
                                segs[slot + 3] = jy;
                                counts[lvl] = counts[lvl] + 1;
                            }

                            liveA[liveCount] = i;
                            liveB[liveCount] = j;
                            liveCount++;
                        }
                    }
                }
            }

            /* -- pass 1: links (purple pass, then teal pass) + nodes ---------- */

            /* Clear only the visible band; pixels outside it are never seen and
               a later scroll into them clears the band again anyway. */
            ctx.clearRect(0, bandTop, w, bandBottom - bandTop);
            ctx.lineWidth = EDGE_WIDTH;

            for (c = 0; c < 2; c++) {
                var passSegs = c === 0 ? segPurple : segTeal;
                var passCounts = c === 0 ? countPurple : countTeal;
                var passStyles = EDGE_STYLES[c];
                for (b = 0; b < ALPHA_LEVELS; b++) {
                    var segCount = passCounts[b];
                    if (segCount === 0) continue;
                    ctx.strokeStyle = passStyles[b];    // once per bucket
                    ctx.beginPath();
                    for (k = 0; k < segCount; k++) {
                        var o = (b * edgeCap + k) * 4;
                        ctx.moveTo(passSegs[o], passSegs[o + 1]);
                        ctx.lineTo(passSegs[o + 2], passSegs[o + 3]);
                    }
                    ctx.stroke();
                }
            }

            var half = NODE_SIZE * 0.5;
            var tw;
            var nBand;
            ctx.fillStyle = NODE_COLOR_A;
            for (i = 0; i < nodeCount; i++) {
                if (nodeTeal[i] === 0) {
                    nBand = py[i] + oy[i];
                    if (nBand < bandTop || nBand > bandBottom) continue;
                    tw = twPeak[i] * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * twFreq[i] + twPhase[i])));
                    ctx.globalAlpha = tw;
                    ctx.fillRect(px[i] + ox[i] - half, py[i] + oy[i] - half, NODE_SIZE, NODE_SIZE);
                }
            }
            ctx.fillStyle = NODE_COLOR_B;
            for (i = 0; i < nodeCount; i++) {
                if (nodeTeal[i] === 1) {
                    nBand = py[i] + oy[i];
                    if (nBand < bandTop || nBand > bandBottom) continue;
                    tw = twPeak[i] * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * twFreq[i] + twPhase[i])));
                    ctx.globalAlpha = tw;
                    ctx.fillRect(px[i] + ox[i] - half, py[i] + oy[i] - half, NODE_SIZE, NODE_SIZE);
                }
            }
            ctx.globalAlpha = 1;                    // always restored after both passes

            /* -- pass 2: at most one zap, on a random live link ---------------- */

            if (zapA < 0) {
                if (nextZapAt < 0) {
                    nextZapAt = now + ZAP_BASE + (rng() * 2 - 1) * ZAP_JITTER;
                } else if (now >= nextZapAt && liveCount > 0) {
                    var pick = (rng() * liveCount) | 0;
                    if (pick >= liveCount) pick = liveCount - 1;
                    zapA = liveA[pick];
                    zapB = liveB[pick];
                    zapStart = now;
                    nextZapAt = -1;                 // rescheduled when it finishes
                }
            } else {
                var t = (now - zapStart) / ZAP_MS;
                if (t >= 1) {
                    zapA = -1;
                    zapB = -1;
                    nextZapAt = now + ZAP_BASE + (rng() * 2 - 1) * ZAP_JITTER;
                } else {
                    var ease = t * t * (3 - 2 * t); // smooth traverse
                    var ax = px[zapA] + ox[zapA];
                    var ay = py[zapA] + oy[zapA];
                    var bx = px[zapB] + ox[zapB];
                    var by = py[zapB] + oy[zapB];
                    var tail = ease - ZAP_TRAIL;
                    if (tail < 0) tail = 0;
                    var hx = ax + (bx - ax) * ease;
                    var hy = ay + (by - ay) * ease;
                    var sx = ax + (bx - ax) * tail;
                    var sy = ay + (by - ay) * tail;

                    ctx.lineWidth = ZAP_WIDTH;
                    ctx.strokeStyle = ZAP_STYLE;    // no shadowBlur, ever
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(hx, hy);
                    ctx.stroke();
                }
            }
        }

        function animate(now) {
            rafId = 0;
            if (!canAnimate()) return;
            drawFrame(now);
            if (canAnimate()) rafId = win.requestAnimationFrame(animate);
        }

        /* -- boot ------------------------------------------------------------- */

        resize();                               // seeds on the first call
        clearCanvas();

        if (typeof win.matchMedia === 'function') {
            mq = win.matchMedia('(prefers-reduced-motion: reduce)');
            mqReduced = mq.matches;
            if (mqReduced) {
                clearCanvas();
            } else if (mq.addEventListener) {
                mq.addEventListener('change', onMq);
            } else if (mq.addListener) {
                mq.addListener(onMq);
            }
        }

        doc.addEventListener('visibilitychange', onVisibility);
        win.addEventListener('resize', onResize, { passive: true });

        var io = null;
        if (typeof win.IntersectionObserver === 'function') {
            io = new win.IntersectionObserver(function (entries) {
                for (var e = 0; e < entries.length; e++) {
                    if (entries[e].target === canvas) {
                        inView = entries[e].isIntersecting;
                        break;
                    }
                }
                if (inView) kick();
                else cancelLoop();
            }, { threshold: 0 });
            io.observe(canvas);
        }

        /* Content growth (fonts, reveals) changes document height without a
           window resize; watch <html> and reuse the debounced handler. */
        var ro = null;
        if (typeof win.ResizeObserver !== 'undefined' && doc.documentElement) {
            ro = new win.ResizeObserver(onResize);
            ro.observe(doc.documentElement);
        }

        kick();                                 // auto-start; start() resumes later

        return {
            start: function () {
                if (destroyed) return;
                manualRunning = true;
                kick();
            },
            stop: function () {
                manualRunning = false;
                cancelLoop();
            },
            destroy: function () {
                if (destroyed) return;
                destroyed = true;
                manualRunning = false;
                cancelLoop();
                if (resizeTimer) {
                    win.clearTimeout(resizeTimer);
                    resizeTimer = 0;
                }
                doc.removeEventListener('visibilitychange', onVisibility);
                win.removeEventListener('resize', onResize);
                if (io) {
                    io.disconnect();
                    io = null;
                }
                if (ro) {
                    ro.disconnect();
                    ro = null;
                }
                if (mq) {
                    if (mq.removeEventListener) mq.removeEventListener('change', onMq);
                    else if (mq.removeListener) mq.removeListener(onMq);
                }
                clearCanvas();
            }
        };
    }

    global.initPlexus = initPlexus;

    if (typeof module !== 'undefined' && module.exports) module.exports = initPlexus;
})(typeof window !== 'undefined' ? window : globalThis);
