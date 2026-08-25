// ===== Single source of truth for motion preference =====
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== Boot =====
document.addEventListener('DOMContentLoaded', boot);

function boot() {
    initYear();
    initTyping();
    initScrollProgress();
    initReveal();
    initCodeWindow();
    initStats();
    initParticles();
    initCursorFx();
    initContact();
    initTerminal();
}

// ===== Footer year =====
function initYear() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
}

// ===== Typing animation for bio =====
const BIO_TEXTS = [
    "Desenvolvedor FullStack",
    "Criador do Botijela",
    "Entusiasta de Tecnologia"
];
const HOLD_MS = 2000;
const TYPE_MS = 150;
const DELETE_MS = 75;
const BETWEEN_MS = 500;

function initTyping() {
    const typingText = document.querySelector('.typing-text');
    if (!typingText) return;

    if (REDUCED) {
        typingText.textContent = BIO_TEXTS[0];
        return;
    }

    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function type() {
        const currentText = BIO_TEXTS[textIndex];

        if (isDeleting) {
            charIndex--;
        } else {
            charIndex++;
        }

        typingText.textContent = currentText.substring(0, charIndex);

        if (!isDeleting && charIndex < currentText.length) {
            setTimeout(type, TYPE_MS);
        } else if (!isDeleting && charIndex === currentText.length) {
            // B5: single hold pause between full phrase and deletion
            setTimeout(() => {
                isDeleting = true;
                type();
            }, HOLD_MS);
        } else if (isDeleting && charIndex > 0) {
            setTimeout(type, DELETE_MS);
        } else {
            isDeleting = false;
            textIndex = (textIndex + 1) % BIO_TEXTS.length;
            setTimeout(type, BETWEEN_MS);
        }
    }

    type();
}

// ===== Scroll progress indicator =====
function initScrollProgress() {
    const progressBar = document.querySelector('.scroll-progress-bar');
    if (!progressBar) return;

    let scrollTicking = false;
    window.addEventListener('scroll', function () {
        if (scrollTicking) return;
        scrollTicking = true;
        window.requestAnimationFrame(function () {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (scrollHeight > 0) {
                const scrolled = (scrollTop / scrollHeight) * 100;
                progressBar.style.transform = 'scaleX(' + (scrolled / 100) + ')';
            }
            scrollTicking = false;
        });
    }, { passive: true });
}

// ===== Section reveal =====
function initReveal() {
    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.section').forEach(function (s) {
        observer.observe(s);
    });
}

// ===== Auto-typing code window =====
function initCodeWindow() {
    const codeSection = document.getElementById('code-showcase');
    if (!codeSection) return;
    const codeLines = codeSection.querySelectorAll('.code-line');
    if (!codeLines.length) return;

    const typeCursor = document.createElement('span');
    typeCursor.className = 'type-cursor';
    typeCursor.setAttribute('aria-hidden', 'true');
    typeCursor.textContent = '|';

    let lineIndex = 0;
    let typingTimer = null;
    let inViewport = true;

    function showLine(i) {
        codeLines[i].classList.add('visible');
        codeLines[i].appendChild(typeCursor);
    }

    function clearTyped() {
        for (let i = 0; i < codeLines.length; i++) {
            codeLines[i].classList.remove('visible');
        }
        lineIndex = 0;
    }

    function tick() {
        if (!inViewport) {
            typingTimer = null;
            return;
        }
        if (lineIndex >= codeLines.length) {
            typingTimer = setTimeout(function () {
                clearTyped();
                tick();
            }, 3000);
            return;
        }
        showLine(lineIndex);
        lineIndex++;
        typingTimer = setTimeout(tick, 140);
    }

    if (REDUCED) {
        for (let i = 0; i < codeLines.length; i++) {
            codeLines[i].classList.add('visible');
        }
        return;
    }

    const typingObserver = new IntersectionObserver(function (entries) {
        inViewport = entries[0].isIntersecting;
        if (inViewport && !typingTimer) {
            tick();
        }
    }, { threshold: 0.1 });
    typingObserver.observe(codeSection);
}

// ===== Stats count-up =====
function initStats() {
    const countTargets = document.querySelectorAll('.stat-value[data-count]');
    if (!countTargets.length) return;

    // B3: the HTML holds the final values (no-JS fallback); JS resets to 0
    // at boot, before any section reveal, so there is no flash of the target.
    countTargets.forEach(el => { el.textContent = '0'; });

    if (REDUCED) {
        countTargets.forEach(el => {
            el.textContent = parseInt(el.getAttribute('data-count'), 10);
        });
        return;
    }

    const countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseInt(el.getAttribute('data-count'), 10);
            const duration = 900;
            let startTime = null;

            function frame(now) {
                if (!startTime) startTime = now;
                const progress = Math.min((now - startTime) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(eased * target);
                if (progress < 1) {
                    requestAnimationFrame(frame);
                }
            }

            requestAnimationFrame(frame);
            countObserver.unobserve(el);
        });
    }, { threshold: 0.5 });
    countTargets.forEach(function (t) {
        countObserver.observe(t);
    });
}

// ===== Randomized particle drift =====
function initParticles() {
    if (REDUCED) return;

    const particles = document.querySelectorAll('.particle');
    for (const p of particles) {
        const floatDur = 14 + Math.random() * 12;   // 14–26s
        const swayDur = 5 + Math.random() * 6;      // 5–11s
        const swayAmp = Math.round(15 + Math.random() * 30) + 'px'; // 15–45px
        p.style.animationDuration = floatDur.toFixed(1) + 's, ' + swayDur.toFixed(1) + 's';
        p.style.animationDelay = (-Math.random() * floatDur).toFixed(1) + 's, ' + (-Math.random() * swayDur).toFixed(1) + 's';
        p.style.setProperty('--sway', swayAmp);
        if (Math.random() < 0.5) {
            p.style.animationDirection = 'normal, reverse';
        }
    }
}

// ===== Cursor interactivity =====
function initCursorFx() {
    if (REDUCED) return;

    const bgAnim = document.querySelector('.background-animation');
    if (!bgAnim) return;

    const orbWrappers = bgAnim.querySelectorAll('.orb-wrapper');
    const particleWrappers = bgAnim.querySelectorAll('.particle-wrapper');
    const cursorGlow = document.querySelector('.cursor-glow');
    const REPEL_RADIUS = 180;
    const REPEL_STRENGTH = 35;
    const ORB_PARALLAX_MAX = 20;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;

    document.addEventListener('mousemove', function (e) {
        targetX = e.clientX;
        targetY = e.clientY;
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
        targetX = window.innerWidth / 2;
        targetY = window.innerHeight / 2;
    }, { passive: true });

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function repel(dx, dy, dist) {
        if (dist >= REPEL_RADIUS || dist <= 1) {
            return { x: 0, y: 0 };
        }
        const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
        return { x: (dx / dist) * force, y: (dy / dist) * force };
    }

    function animate() {
        cursorX = lerp(cursorX, targetX, 0.08);
        cursorY = lerp(cursorY, targetY, 0.08);

        // Cursor glow follows
        if (cursorGlow) {
            cursorGlow.style.transform = 'translate3d(' + cursorX.toFixed(1) + 'px,' + cursorY.toFixed(1) + 'px,0)';
        }

        // Particles repulsion
        for (let i = 0; i < particleWrappers.length; i++) {
            const wrapper = particleWrappers[i];
            const inner = wrapper.querySelector('.particle');
            const rect = inner.getBoundingClientRect();
            const px = rect.left + rect.width / 2;
            const py = rect.top + rect.height / 2;
            const dx = px - cursorX;
            const dy = py - cursorY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const r = repel(dx, dy, dist);
            if (r.x !== 0 || r.y !== 0) {
                wrapper.style.transform = 'translate(' + r.x.toFixed(1) + 'px,' + r.y.toFixed(1) + 'px)';
            } else {
                wrapper.style.transform = '';
            }
        }

        // Orbs parallax (opposite to cursor, subtle) + repulsion
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        for (let j = 0; j < orbWrappers.length; j++) {
            const orb = orbWrappers[j];
            const ratio = Number(orb.getAttribute('data-parallax')) || 1;
            let offsetX = -((cursorX - centerX) / centerX) * ORB_PARALLAX_MAX * ratio;
            let offsetY = -((cursorY - centerY) / centerY) * ORB_PARALLAX_MAX * ratio;

            const orbRect = orb.getBoundingClientRect();
            const orbCx = orbRect.left + orbRect.width / 2;
            const orbCy = orbRect.top + orbRect.height / 2;
            const orbDx = orbCx - cursorX;
            const orbDy = orbCy - cursorY;
            const orbDist = Math.sqrt(orbDx * orbDx + orbDy * orbDy);
            const r = repel(orbDx, orbDy, orbDist);
            offsetX += r.x;
            offsetY += r.y;

            orb.style.transform = 'translate(' + offsetX.toFixed(2) + 'px,' + offsetY.toFixed(2) + 'px)';
        }

        requestAnimationFrame(animate);
    }

    // Magnetic attraction on interactive targets
    const magneticTargets = document.querySelectorAll('.social-link, .btn, .tech-item');
    const MAGNET_MAX = 8;
    const MAGNET_RADIUS = 70;
    for (const el of magneticTargets) {
        el.addEventListener('mousemove', function (e) {
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MAGNET_RADIUS && dist > 0) {
                const force = (1 - dist / MAGNET_RADIUS) * MAGNET_MAX;
                el.style.setProperty('--mx', ((dx / dist) * force).toFixed(1) + 'px');
                el.style.setProperty('--my', ((dy / dist) * force).toFixed(1) + 'px');
            } else {
                el.style.setProperty('--mx', '0px');
                el.style.setProperty('--my', '0px');
            }
        }, { passive: true });
        el.addEventListener('mouseleave', function () {
            el.style.setProperty('--mx', '0px');
            el.style.setProperty('--my', '0px');
        });
    }

    requestAnimationFrame(animate);
}

// ===== Copy e-mail + uptime =====
function initContact() {
    const emailLink = document.getElementById('email-link');
    const toast = document.getElementById('copy-toast');
    let toastTimer = null;

    if (emailLink && toast) {
        // J2: single source for the email — derive it from the link itself
        const email = emailLink.href.replace('mailto:', '');

        emailLink.addEventListener('click', function (e) {
            e.preventDefault();

            function showToast(msg) {
                toast.textContent = msg;
                toast.classList.remove('sr-only');
                toast.classList.add('visible');
                clearTimeout(toastTimer);
                toastTimer = setTimeout(function () {
                    toast.classList.remove('visible');
                    toastTimer = setTimeout(function () {
                        toast.classList.add('sr-only');
                    }, 300);
                }, 2000);
            }

            function fallbackCopy() {
                const ta = document.createElement('textarea');
                ta.value = email;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                let ok = false;
                try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
                document.body.removeChild(ta);
                return ok;
            }

            function copyFailed() {
                window.location.href = 'mailto:' + email;
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(email).then(function () {
                    showToast('E-mail copiado!');
                }).catch(function () {
                    if (fallbackCopy()) {
                        showToast('E-mail copiado!');
                    } else {
                        copyFailed();
                    }
                });
            } else if (fallbackCopy()) {
                showToast('E-mail copiado!');
            } else {
                copyFailed();
            }
        });
    }

    // B2: the static HTML owns "status: online"; the uptime span only ticks
    // in motion mode, so reduced-motion never duplicates the status text.
    const uptimeEl = document.getElementById('uptime');
    if (!uptimeEl || REDUCED) return;

    const loadTime = Date.now();
    function fmtUptime() {
        const s = Math.floor((Date.now() - loadTime) / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        if (h > 0) return 'uptime: ' + h + 'h ' + m + 'm';
        if (m > 0) return 'uptime: ' + m + 'm ' + (s % 60) + 's';
        return 'uptime: ' + s + 's';
    }
    uptimeEl.textContent = fmtUptime();
    setInterval(function () {
        uptimeEl.textContent = fmtUptime();
    }, 60000);
}

// ===== Terminal overlay (easter egg) =====
function initTerminal() {
    const overlay = document.getElementById('terminal-overlay');
    const termBody = document.getElementById('terminal-body');
    const closeBtn = document.getElementById('terminal-close');
    if (!overlay || !termBody || !closeBtn) return;

    // J3: presentation class lives in the data, not in content sniffing
    const SCRIPT = [
        { cmd: 'whoami', out: [{ text: 'Pedro "Brejelinha" Sebastião — dev fullstack @ IATec' }] },
        { cmd: 'ls projects/', out: [{ text: 'botijela/  dashboards/  tools/  [REDACTED]', cls: 't-dim' }] },
        { cmd: 'cat botijela/stats', out: [{ text: 'commands: 15+  platforms: 3  version: 3.1  chaos: high', cls: 't-ok' }] },
        { cmd: '--social', out: [{ text: 'github.com/PHSebastiao · twitch.tv/brejelinha · bsky.app/profile/brejelinha.net' }] },
        { cmd: 'exit', out: [] }
    ];
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIdx = 0;
    let typedBuffer = '';
    let avatarClicks = 0;
    let avatarTimer = null;
    let lastFocus = null;

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function appendLine(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        termBody.appendChild(div);
        termBody.scrollTop = termBody.scrollHeight;
    }

    function promptLine(cmd) {
        appendLine('<span class="t-prompt">brejela@portfolio:~$</span> ' + esc(cmd));
    }

    function runSequence() {
        let step = 0;
        function next() {
            if (step >= SCRIPT.length) {
                setTimeout(closeTerminal, 800);
                return;
            }
            const s = SCRIPT[step];
            promptLine(s.cmd);
            s.out.forEach(function (item) {
                appendLine(item.cls ? '<span class="' + item.cls + '">' + esc(item.text) + '</span>' : esc(item.text));
            });
            step++;
            if (!REDUCED) {
                setTimeout(next, 500);
            } else {
                next();
            }
        }
        termBody.innerHTML = '';
        next();
    }

    function openTerminal() {
        if (!overlay.hidden) return;
        lastFocus = document.activeElement;
        overlay.hidden = false;
        termBody.focus();
        runSequence();
    }

    function closeTerminal() {
        overlay.hidden = true;
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    closeBtn.addEventListener('click', closeTerminal);
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeTerminal();
    });

    document.addEventListener('keydown', function (e) {
        if (!overlay.hidden) {
            if (e.key === 'Escape') closeTerminal();
            // F1: trap Tab inside the dialog — the close button is the only
            // tabbable element, so keep focus cycling on it.
            if (e.key === 'Tab') {
                if (document.activeElement !== closeBtn) closeBtn.focus();
                e.preventDefault();
            }
            return;
        }
        if (e.key === KONAMI[konamiIdx]) {
            konamiIdx++;
            if (konamiIdx === KONAMI.length) {
                konamiIdx = 0;
                openTerminal();
            }
        } else {
            konamiIdx = (e.key === KONAMI[0]) ? 1 : 0;
        }
        if (e.key.length === 1) {
            typedBuffer = (typedBuffer + e.key.toLowerCase()).slice(-7);
            if (typedBuffer === 'brejela') {
                typedBuffer = '';
                openTerminal();
            }
        }
    });

    const avatar = document.querySelector('.hero-avatar');
    if (avatar) {
        avatar.addEventListener('click', function () {
            avatarClicks++;
            clearTimeout(avatarTimer);
            avatarTimer = setTimeout(function () { avatarClicks = 0; }, 1500);
            if (avatarClicks >= 5) {
                avatarClicks = 0;
                openTerminal();
            }
        });
    }
}
