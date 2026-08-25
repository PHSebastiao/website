// Typing animation for bio
document.addEventListener('DOMContentLoaded', function () {
    const bioTexts = [
        "Desenvolvedor FullStack",
        "Criador do Botijela",
        "Entusiasta de Tecnologia"
    ];

    const typingText = document.querySelector('.typing-text');
    if (!typingText) return;

    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        typingText.textContent = bioTexts[0];
    } else {
        function type() {
            const currentText = bioTexts[textIndex];

            if (isDeleting) {
                charIndex--;
            } else {
                charIndex++;
            }

            typingText.textContent = currentText.substring(0, charIndex);

            if (!isDeleting && charIndex < currentText.length) {
                setTimeout(type, 150);
            } else if (!isDeleting && charIndex === currentText.length) {
                setTimeout(() => {
                    isDeleting = true;
                    setTimeout(type, 2000);
                }, 2000);
            } else if (isDeleting && charIndex > 0) {
                setTimeout(type, 75);
            } else {
                isDeleting = false;
                textIndex = (textIndex + 1) % bioTexts.length;
                setTimeout(type, 500);
            }
        }

        type();
    }

    // Scroll progress indicator
    const progressBar = document.querySelector('.scroll-progress-bar');
    if (progressBar) {
        let scrollTicking = false;
        window.addEventListener('scroll', function () {
            if (!scrollTicking) {
                window.requestAnimationFrame(function () {
                    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                    if (scrollHeight > 0) {
                        const scrolled = (scrollTop / scrollHeight) * 100;
                        progressBar.style.transform = 'scaleX(' + (scrolled / 100) + ')';
                    }
                    scrollTicking = false;
                });
                scrollTicking = true;
            }
        }, { passive: true });
    }

    // Section animations with Intersection Observer
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    document.querySelectorAll('.section').forEach(function (s) {
        observer.observe(s);
    });
    // ===== Auto-typing code window (P1) =====
    var codeSection = document.getElementById('code-showcase');
    var codeLines = codeSection ? codeSection.querySelectorAll('.code-line') : [];
    if (codeSection && codeLines.length) {
        var typeCursor = document.createElement('span');
        typeCursor.className = 'type-cursor';
        typeCursor.setAttribute('aria-hidden', 'true');
        typeCursor.textContent = '|';

        var lineIndex = 0;
        var typingTimer = null;
        var inViewport = true;

        function showLine(i) {
            codeLines[i].classList.add('visible');
            codeLines[i].appendChild(typeCursor);
        }

        function clearTyped() {
            for (var i = 0; i < codeLines.length; i++) {
                codeLines[i].classList.remove('visible');
            }
            lineIndex = 0;
        }

        function tick() {
            if (!inViewport) return;
            if (lineIndex >= codeLines.length) {
                clearTyped();
                typingTimer = setTimeout(tick, 4000);
                return;
            }
            showLine(lineIndex);
            lineIndex++;
            typingTimer = setTimeout(tick, 140);
        }

        if (prefersReducedMotion) {
            for (var i = 0; i < codeLines.length; i++) {
                codeLines[i].classList.add('visible');
            }
        } else {
            var typingObserver = new IntersectionObserver(function (entries) {
                inViewport = entries[0].isIntersecting;
                if (inViewport && !typingTimer) {
                    tick();
                }
            }, { threshold: 0.1 });
            typingObserver.observe(codeSection);
        }
    }

    // ===== Stats count-up (P4) =====
    var countTargets = document.querySelectorAll('.stat-value[data-count]');
    if (countTargets.length) {
        var countObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                var target = parseInt(el.getAttribute('data-count'), 10);
                var duration = 900;
                var startTime = null;

                function frame(now) {
                    if (!startTime) startTime = now;
                    var progress = Math.min((now - startTime) / duration, 1);
                    var eased = 1 - Math.pow(1 - progress, 3);
                    el.textContent = Math.round(eased * target);
                    if (progress < 1) {
                        requestAnimationFrame(frame);
                    }
                }

                if (prefersReducedMotion) {
                    el.textContent = target;
                } else {
                    requestAnimationFrame(frame);
                }
                countObserver.unobserve(el);
            });
        }, { threshold: 0.5 });
        countTargets.forEach(function (t) {
            countObserver.observe(t);
        });
    }

    // ===== Randomized particle drift =====

    // ===== Randomized particle drift =====
    if (!prefersReducedMotion) {
        var particles = document.querySelectorAll('.particle');
        for (var k = 0; k < particles.length; k++) {
            var floatDur = 14 + Math.random() * 12;   // 14–26s
            var swayDur = 5 + Math.random() * 6;      // 5–11s
            var swayAmp = Math.round(15 + Math.random() * 30) + 'px'; // 15–45px
            particles[k].style.animationDuration = floatDur.toFixed(1) + 's, ' + swayDur.toFixed(1) + 's';
            particles[k].style.animationDelay = (-Math.random() * floatDur).toFixed(1) + 's, ' + (-Math.random() * swayDur).toFixed(1) + 's';
            particles[k].style.setProperty('--sway', swayAmp);
            if (Math.random() < 0.5) {
                particles[k].style.animationDirection = 'normal, reverse';
            }
        }
    }

    // ===== Cursor interactivity =====
    if (!prefersReducedMotion) {
        var bgAnim = document.querySelector('.background-animation');
        if (bgAnim) {
            var orbWrappers = bgAnim.querySelectorAll('.orb-wrapper');
            var particleWrappers = bgAnim.querySelectorAll('.particle-wrapper');
            var cursorGlow = document.querySelector('.cursor-glow');
            var REPEL_RADIUS = 180;
            var REPEL_STRENGTH = 35;
            var ORB_PARALLAX_MAX = 20;
            var targetX = window.innerWidth / 2;
            var targetY = window.innerHeight / 2;
            var cursorX = window.innerWidth / 2;
            var cursorY = window.innerHeight / 2;

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
                var force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
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
                for (var i = 0; i < particleWrappers.length; i++) {
                    var wrapper = particleWrappers[i];
                    var inner = wrapper.querySelector('.particle');
                    var rect = inner.getBoundingClientRect();
                    var px = rect.left + rect.width / 2;
                    var py = rect.top + rect.height / 2;
                    var dx = px - cursorX;
                    var dy = py - cursorY;
                    var dist = Math.sqrt(dx * dx + dy * dy);

                    var r = repel(dx, dy, dist);
                    if (r.x !== 0 || r.y !== 0) {
                        wrapper.style.transform = 'translate(' + r.x.toFixed(1) + 'px,' + r.y.toFixed(1) + 'px)';
                    } else {
                        wrapper.style.transform = '';
                    }
                }

                // Orbs parallax (opposite to cursor, subtle) + repulsion
                var centerX = window.innerWidth / 2;
                var centerY = window.innerHeight / 2;
                for (var j = 0; j < orbWrappers.length; j++) {
                    var orb = orbWrappers[j];
                    var ratio = Number(orb.getAttribute('data-parallax')) || 1;
                    var offsetX = -((cursorX - centerX) / centerX) * ORB_PARALLAX_MAX * ratio;
                    var offsetY = -((cursorY - centerY) / centerY) * ORB_PARALLAX_MAX * ratio;

                    var orbRect = orb.getBoundingClientRect();
                    var orbCx = orbRect.left + orbRect.width / 2;
                    var orbCy = orbRect.top + orbRect.height / 2;
                    var orbDx = orbCx - cursorX;
                    var orbDy = orbCy - cursorY;
                    var orbDist = Math.sqrt(orbDx * orbDx + orbDy * orbDy);
                    var r = repel(orbDx, orbDy, orbDist);
                    offsetX += r.x;
                    offsetY += r.y;

                    orb.style.transform = 'translate(' + offsetX.toFixed(2) + 'px,' + offsetY.toFixed(2) + 'px)';
                }
            }

            // Magnetic attraction on interactive targets (P2)
            var magneticTargets = document.querySelectorAll('.social-link, .btn, .tech-item');
            var MAGNET_MAX = 8;
            var MAGNET_RADIUS = 70;
            for (var m = 0; m < magneticTargets.length; m++) {
                (function (el) {
                    el.addEventListener('mousemove', function (e) {
                        var rect = el.getBoundingClientRect();
                        var cx = rect.left + rect.width / 2;
                        var cy = rect.top + rect.height / 2;
                        var dx = e.clientX - cx;
                        var dy = e.clientY - cy;
                        var dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < MAGNET_RADIUS && dist > 0) {
                            var force = (1 - dist / MAGNET_RADIUS) * MAGNET_MAX;
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
                })(magneticTargets[m]);
            }

            requestAnimationFrame(animate);
        }
    }
});

// Footer year
document.getElementById("current-year").textContent = new Date().getFullYear();

// ===== Copy e-mail + uptime + easter egg terminal (P5/P3) =====
document.addEventListener('DOMContentLoaded', function () {
    var emailLink = document.getElementById('email-link');
    var toast = document.getElementById('copy-toast');
    var toastTimer = null;
    if (emailLink && toast) {
        emailLink.addEventListener('click', function (e) {
            var email = 'phsilva.sebastiao@gmail.com';
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
                var ta = document.createElement('textarea');
                ta.value = email;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                var ok = false;
                try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
                document.body.removeChild(ta);
                return ok;
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(email).then(function () {
                    e.preventDefault();
                    showToast('E-mail copiado!');
                }).catch(function () {
                    if (fallbackCopy()) {
                        e.preventDefault();
                        showToast('E-mail copiado!');
                    }
                });
            } else if (fallbackCopy()) {
                e.preventDefault();
                showToast('E-mail copiado!');
            }
        });
    }

    var uptimeEl = document.getElementById('uptime');
    if (uptimeEl) {
        var loadTime = Date.now();
        function fmtUptime() {
            var s = Math.floor((Date.now() - loadTime) / 1000);
            var h = Math.floor(s / 3600);
            var m = Math.floor((s % 3600) / 60);
            if (h > 0) return 'uptime: ' + h + 'h ' + m + 'm';
            if (m > 0) return 'uptime: ' + m + 'm ' + (s % 60) + 's';
            return 'uptime: ' + s + 's';
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            uptimeEl.textContent = 'status: online';
        } else {
            uptimeEl.textContent = fmtUptime();
            setInterval(function () {
                uptimeEl.textContent = fmtUptime();
            }, 60000);
        }
    }

    var overlay = document.getElementById('terminal-overlay');
    var termBody = document.getElementById('terminal-body');
    var closeBtn = document.getElementById('terminal-close');
    if (!overlay || !termBody || !closeBtn) return;

    var SCRIPT = [
        { cmd: 'whoami', out: ['Pedro "Brejelinha" Sebastião — dev fullstack @ IATec'] },
        { cmd: 'ls projects/', out: ['botijela/  dashboards/  tools/  [REDACTED]'] },
        { cmd: 'cat botijela/stats', out: ['commands: 15+  platforms: 3  version: 3.1  chaos: high'] },
        { cmd: '--social', out: ['github.com/PHSebastiao · twitch.tv/brejelinha · bsky.app/profile/brejelinha.net'] },
        { cmd: 'exit', out: [] }
    ];
    var konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var konamiIdx = 0;
    var typedBuffer = '';
    var avatarClicks = 0;
    var avatarTimer = null;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var lastFocus = null;

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function appendLine(html) {
        var div = document.createElement('div');
        div.innerHTML = html;
        termBody.appendChild(div);
        termBody.scrollTop = termBody.scrollHeight;
    }

    function promptLine(cmd) {
        appendLine('<span class="t-prompt">brejela@portfolio:~$</span> ' + esc(cmd));
    }

    function runSequence() {
        var step = 0;
        function next() {
            if (step >= SCRIPT.length) {
                setTimeout(closeTerminal, 800);
                return;
            }
            var s = SCRIPT[step];
            promptLine(s.cmd);
            s.out.forEach(function (line) {
                var cls = line.indexOf('REDACTED') >= 0 ? 't-dim' : (line.indexOf('chaos') >= 0 ? 't-ok' : '');
                appendLine(cls ? '<span class="' + cls + '">' + esc(line) + '</span>' : esc(line));
            });
            step++;
            if (!reducedMotion) {
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
            return;
        }
        if (e.key === konami[konamiIdx]) {
            konamiIdx++;
            if (konamiIdx === konami.length) {
                konamiIdx = 0;
                openTerminal();
            }
        } else {
            konamiIdx = (e.key === konami[0]) ? 1 : 0;
        }
        if (e.key.length === 1) {
            typedBuffer = (typedBuffer + e.key.toLowerCase()).slice(-7);
            if (typedBuffer === 'brejela') {
                typedBuffer = '';
                openTerminal();
            }
        }
    });

    var avatar = document.querySelector('.hero-avatar');
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
});
