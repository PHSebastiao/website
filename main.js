// ===== Single source of truth for motion preference =====
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== Boot =====
document.addEventListener('DOMContentLoaded', function () {
    boot();
});

function boot() {
    initYear();
    initCodeWindow();
    initConstellation();
    initContact();
    initTerminal();
}

function initYear() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
}

function initCodeWindow() {
    const section = document.getElementById('code-showcase');
    if (!section) return;
    const lines = section.querySelectorAll('.code-line');
    if (!lines.length || REDUCED) return;

    for (const line of lines) line.classList.add('pending');

    const observer = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        lines.forEach(function (line, i) {
            setTimeout(function () {
                line.classList.remove('pending');
            }, 70 * i);
        });
    }, { threshold: 0.15 });
    observer.observe(section);
}

function initConstellation() {
    const canvas = document.getElementById('plexus');
    if (!canvas) return;
    initPlexus(canvas, { reduced: REDUCED });
}

function initContact() {
    const emailLink = document.getElementById('email-link');
    const toast = document.getElementById('copy-toast');
    let toastTimer = null;

    if (emailLink && toast) {
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
}

function initTerminal() {
    const overlay = document.getElementById('terminal-overlay');
    const termBody = document.getElementById('terminal-body');
    const closeBtn = document.getElementById('terminal-close');
    if (!overlay || !termBody || !closeBtn) return;

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
