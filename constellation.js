/* ==========================================================================
   constellation.js — full-height drifting plexus
   --------------------------------------------------------------------------
   Brand texture behind the whole page: nodes live in *document* space and
   scroll with the content; only the viewport-sized canvas is drawn, so the
   bitmap stays small no matter how tall the page is.

       initPlexus(canvas, { reduced })  =>  { draw, destroy }  or null

   Guarantees:
     • transparent canvas; the page owns the background
     • deterministic layout (same seed → same field on every load)
     • density is constant per screen: node count scales with page height
     • only the viewport band (±CULL_MARGIN) is painted each frame
     • DPR capped at 1.5 so 1px links stay crisp
     • sleeps when the tab is hidden; reduced motion paints a static frame
       on scroll instead of running the loop
   ========================================================================== */

(function (global) {
    'use strict';


    var SEED = 0x9E3779B9;              

    var NODE_VIOLET = '#a78bfa';        
    var NODE_STEEL = '#59819f';         
    var STEEL_SHARE = 0.25;             
    var NODE_SIZE = 3;
    var NODE_ALPHA = 0.8;

    var LINK_RGB = '89, 129, 159';      
    var LINK_RADIUS = 140;              
    var EDGE_ALPHA = 0.5;
    var EDGE_FALLOFF = 1.8;
    var ALPHA_LEVELS = 6;               

    var AREA_PER_NODE = 16000;          
    var MAX_NODES = 260;

    var DRIFT_MIN = 6;                  
    var DRIFT_MAX = 10;
    var MAX_DT = 0.05;                  

    var CULL_MARGIN = 60;               
    var LINK_REBUILD_MS = 2000;         
    var DPR_CAP = 1.5;
    var RESIZE_DEBOUNCE = 150;


    var EDGE_STYLES = (function () {
        var out = new Array(ALPHA_LEVELS);
        for (var b = 0; b < ALPHA_LEVELS; b++) {
            var a = ((b + 1) / ALPHA_LEVELS) * EDGE_ALPHA;
            out[b] = 'rgba(' + LINK_RGB + ', ' + a.toFixed(4) + ')';
        }
        return out;
    })();


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


    function initPlexus(canvas, options) {
        options = options || {};
        var reduced = !!options.reduced;
        if (!canvas || typeof canvas.getContext !== 'function') return null;
        var ctx = canvas.getContext('2d');
        if (!ctx) return null;

        var x, y, vx, vy, isSteel;      
        var count = 0;
        var linkA, linkB, linkN = 0;
        var lastLinkBuild = 0;

        var cssW = 0, cssH = 0, docH = 0, dpr = 1;
        var rafId = 0, lastTs = 0, resizeTimer = 0;

        function documentHeight() {
            return Math.max(
                document.documentElement.scrollHeight,
                document.body ? document.body.scrollHeight : 0,
                global.innerHeight
            );
        }

        function seedField() {
            var rng = makeRng(SEED);
            count = Math.min(MAX_NODES, Math.round((cssW * docH) / AREA_PER_NODE));
            x = new Float32Array(count);
            y = new Float32Array(count);
            vx = new Float32Array(count);
            vy = new Float32Array(count);
            isSteel = new Uint8Array(count);
            for (var i = 0; i < count; i++) {
                x[i] = rng() * cssW;
                y[i] = rng() * docH;
                var angle = rng() * 6.283185307179586;
                var speed = DRIFT_MIN + rng() * (DRIFT_MAX - DRIFT_MIN);
                vx[i] = Math.cos(angle) * speed;
                vy[i] = Math.sin(angle) * speed;
                isSteel[i] = rng() < STEEL_SHARE ? 1 : 0;
            }
            linkN = 0;
            lastLinkBuild = 0;
        }

        function measure() {
            var rect = canvas.getBoundingClientRect();
            cssW = Math.max(1, Math.round(rect.width)) || global.innerWidth;
            cssH = Math.max(1, Math.round(rect.height)) || global.innerHeight;
            docH = documentHeight();
            dpr = Math.min(global.devicePixelRatio || 1, DPR_CAP);
            canvas.width = Math.round(cssW * dpr);
            canvas.height = Math.round(cssH * dpr);
            seedField();
        }

        function buildLinks() {
            linkN = 0;
            if (!linkA || linkA.length < count * 4) {
                linkA = new Uint16Array(count * 4);
                linkB = new Uint16Array(count * 4);
            }
            for (var i = 0; i < count; i++) {
                for (var j = i + 1; j < count; j++) {
                    var dx = x[i] - x[j];
                    var dy = y[i] - y[j];
                    if (dx * dx + dy * dy >= LINK_RADIUS * LINK_RADIUS) continue;
                    if (linkN >= linkA.length) return;
                    linkA[linkN] = i;
                    linkB[linkN] = j;
                    linkN++;
                }
            }
        }

        function step(dt) {
            for (var i = 0; i < count; i++) {
                var nx = x[i] + vx[i] * dt;
                var ny = y[i] + vy[i] * dt;
                if (nx < 0 || nx > cssW) { vx[i] = -vx[i]; nx = x[i] + vx[i] * dt; }
                if (ny < 0 || ny > docH) { vy[i] = -vy[i]; ny = y[i] + vy[i] * dt; }
                x[i] = nx;
                y[i] = ny;
            }
        }

        function paint() {
            var scrollY = global.scrollY || document.documentElement.scrollTop || 0;
            var top = scrollY - CULL_MARGIN;
            var bottom = scrollY + cssH + CULL_MARGIN;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, cssW, cssH);
            ctx.lineWidth = 1;

            var l, a, b, dx, dy, d, bucket;
            for (l = 0; l < linkN; l++) {
                a = linkA[l];
                b = linkB[l];
                if ((y[a] < top && y[b] < top) || (y[a] > bottom && y[b] > bottom)) continue;
                dx = x[a] - x[b];
                dy = y[a] - y[b];
                d = Math.sqrt(dx * dx + dy * dy);
                if (d >= LINK_RADIUS) continue;
                bucket = Math.min(ALPHA_LEVELS - 1, ((1 - d / LINK_RADIUS) * ALPHA_LEVELS) | 0);
                ctx.strokeStyle = EDGE_STYLES[bucket];
                ctx.beginPath();
                ctx.moveTo(x[a], y[a] - scrollY);
                ctx.lineTo(x[b], y[b] - scrollY);
                ctx.stroke();
            }

            ctx.globalAlpha = NODE_ALPHA;
            var half = NODE_SIZE / 2;
            for (var i = 0; i < count; i++) {
                if (y[i] < top || y[i] > bottom) continue;
                ctx.fillStyle = isSteel[i] ? NODE_STEEL : NODE_VIOLET;
                ctx.fillRect(x[i] - half, y[i] - scrollY - half, NODE_SIZE, NODE_SIZE);
            }
            ctx.globalAlpha = 1;
        }

        function frame(ts) {
            rafId = 0;
            if (document.hidden) return;
            var dt = lastTs ? Math.min((ts - lastTs) / 1000, MAX_DT) : 0;
            lastTs = ts;
            if (dt) step(dt);
            if (ts - lastLinkBuild > LINK_REBUILD_MS) {
                buildLinks();
                lastLinkBuild = ts;
            }
            paint();
            rafId = global.requestAnimationFrame(frame);
        }

        function start() {
            if (reduced || rafId) return;
            lastTs = 0;
            rafId = global.requestAnimationFrame(frame);
        }

        function stop() {
            if (!rafId) return;
            global.cancelAnimationFrame(rafId);
            rafId = 0;
        }

        var stillPending = 0;
        function paintStill() {
            if (stillPending) return;
            stillPending = global.requestAnimationFrame(function () {
                stillPending = 0;
                paint();
            });
        }

        function onResize() {
            global.clearTimeout(resizeTimer);
            resizeTimer = global.setTimeout(function () {
                stop();
                measure();
                buildLinks();
                paint();
                start();
            }, RESIZE_DEBOUNCE);
        }

        function onScroll() {
            if (reduced) paintStill();
        }

        function onVisibility() {
            if (document.hidden) stop();
            else start();
        }

        measure();
        buildLinks();
        paint();

        global.addEventListener('resize', onResize, { passive: true });
        global.addEventListener('load', onResize);
        global.addEventListener('orientationchange', onResize, { passive: true });
        if (reduced) {
            global.addEventListener('scroll', onScroll, { passive: true });
        } else {
            document.addEventListener('visibilitychange', onVisibility);
            start();
        }

        return {
            draw: paint,
            destroy: function () {
                stop();
                global.clearTimeout(resizeTimer);
                global.removeEventListener('resize', onResize);
                global.removeEventListener('load', onResize);
                global.removeEventListener('orientationchange', onResize);
                global.removeEventListener('scroll', onScroll);
                document.removeEventListener('visibilitychange', onVisibility);
            }
        };
    }

    global.initPlexus = initPlexus;
})(typeof window !== 'undefined' ? window : globalThis);
