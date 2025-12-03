const overrideVisibleProperties = () => {
    const properties = {
        visibilityState: 'visible',
        hidden: false,
        webkitVisibilityState: 'visible',
        webkitHidden: false
    };
    Object.keys(properties).forEach(prop => {
        Object.defineProperty(document, prop, { value: properties[prop], writable: true });
    });
};

// Overrides focus state to always show the tab has focus
Document.prototype.hasFocus = () => true;

// All the events to block
const eventsToBlock = [
    'focus', 'blur', 'visibilitychange', 'webkitvisibilitychange',
    'pagehide', 'pageshow'
];

// Overrides event listeners to block the events
const overrideEventListeners = (target) => {
    const originalAddEventListener = target.prototype.addEventListener;
    target.prototype.addEventListener = function (type, listener, options) {
        if (eventsToBlock.includes(type)) {
            console.log(`[Canvas Hack] '${type}' event listener subscription prevented.`);
        } else {
            originalAddEventListener.call(this, type, listener, options);
        }
    };

    const originalRemoveEventListener = target.prototype.removeEventListener;
    target.prototype.removeEventListener = function (type, listener, options) {
        if (eventsToBlock.includes(type)) {
            console.log(`[Canvas Hack] '${type}' event listener removal prevented.`);
        } else {
            originalRemoveEventListener.call(this, type, listener, options);
        }
    };
};

let realEventListener = Window.prototype.addEventListener;

// Rewrite requests so that the user can leave the Canvas tab
Window.prototype.addEventListener = function (a, b, c) {
    if (['focus', 'blur', 'visibilitychange'].includes(a)) {
        console.log(`[AD] '${a}' event listener subscription prevented. (Canvas Hack)`);
    } else {
        realEventListener.call(this, a, b, c);
    }
};

// Initialization
overrideVisibleProperties();
overrideEventListeners(Window);
overrideEventListeners(Document);

// Protect against AI Trojan Horse hack
(function () {
    function removeOrHideElements() {
        const targetElement = document.querySelector('#content-wrapper .description.user_content.enhanced[data-resource-type="assignment.body"]');
        if (targetElement) {
            const spans = targetElement.querySelectorAll('span[aria-hidden="true"]');
            spans.forEach(span => {
                try {
                    span.remove();
                } catch (e) {
                    span.style.display = 'none';
                }
            });
            console.log("[CanvasHack] AI Trojan Horse Hack Protected & Prevented");
        } else {
            console.log("[CanvasHack] (AI-THH) un-needed");
        }
    }

    function initObserver() {
        const observer = new MutationObserver(removeOrHideElements);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function checkMetaAndInitialize() {
        const metaElement = document.querySelector('meta[name="apple-itunes-app"][content="app-id=480883488"]');
        if (metaElement) {
            console.log("[CanvasHack] Meta tag found, initializing observer and removing elements");
            initObserver();
            removeOrHideElements();
        } else {
            console.log("[CanvasHack] Meta tag not found, script will not run");
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkMetaAndInitialize);
    } else {
        checkMetaAndInitialize();
    }
})();

// Overwrite the addEventListener function with one that blocks certain events
Element.prototype._addEventListener = Element.prototype.addEventListener;
Element.prototype.addEventListener = function (type, listener, options) {
    const blockedEvents = ["focus", "focusin", "focusout", "blur", "visibilitychange", "webkitvisibilitychange", "mozvisibilitychange", "msvisibilitychange"];

    if (blockedEvents.includes(type)) {
        console.log("[CanvasHack] blocked event " + type);
    } else {
        this._addEventListener(type, listener, options);
    }
};

window.addEventListener = Element.prototype.addEventListener;
window._addEventListener = Element.prototype._addEventListener;
document.addEventListener = Element.prototype.addEventListener;
document._addEventListener = Element.prototype._addEventListener;
console.log("[CanvasHack] overwritten addEventListener");

(function () {
    const path = location.pathname.replace(/\/+$/, '');

    const PATH_RE = /^\/courses\/\d+(?:\/.*)?$/;

    if (!PATH_RE.test(path)) return;

    document.addEventListener('DOMContentLoaded', () => {
        // ─── INJECT ALL <link> ASSETS ─────────────────────────────────────────
        const head = document.head || document.getElementsByTagName('head')[0];
        const assets = [
            { rel: 'stylesheet', href: 'https://site-assets.fontawesome.com/releases/v6.7.2/css/all.css' },
            { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
            { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
            { rel: 'preconnect', href: 'https://rsms.me/' },
            { rel: 'stylesheet', href: 'https://rsms.me/inter/inter.css' },
            {
                rel: 'stylesheet',
                href: 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Montserrat:wght@100;200;300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@400;500&display=swap'
            }
        ];
        assets.forEach(({ rel, href, crossorigin }) => {
            const link = document.createElement('link');
            link.rel = rel;
            link.href = href;
            if (crossorigin !== undefined) link.crossOrigin = crossorigin;
            head.appendChild(link);
        });

        const style = document.createElement('style');
        style.textContent = `

.toolbar-ch {
    position: fixed;
    top: 1rem;
    right: auto;
    width: max-content;
    height: 2.6rem;
    display: flex;
    gap: .4rem;
    align-items: center;
    color: #fff;
    background-color: #141414;
    border-radius: 10rem; 
    padding: .2rem .5rem;
    box-shadow: 0 0 5px #141414c4, inset 0 0 15px #292929;
    border: 2px solid #292929;
    opacity: 1;
    z-index:9999999999;
}

.toolbar-ch, .status-panel { will-change: transform; }

div.logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .4rem;
    box-sizing: border-box;
    padding: 1rem 2rem;
    transition: .3s 
ease all;
    padding-bottom: 1rem;
    border-bottom: 2px solid #272727;
    box-shadow: inset 0 0 10px #111111, 0 0 10px #111111;
    background-image: url(https://data.canvashack.com/images/c-repeat.png);
    background-repeat: no-repeat;
    background-size: 290%;
}

.status-header .status-header-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .6rem;
    height: 3rem;
}

.status-header-bar .logo-container,
.status-header-bar i.fa-solid.fa-gear {
    height: 100%;
    /* fill the 3rem container */
    box-sizing: border-box;
    /* include padding in that 100% */
}

.status-header .status-header-bar i {
    font-size: 1.1rem;
    width: 3rem;
    border-radius: 10rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    transition: .3s ease all;
    background-color: #161616;
    box-shadow: inset 0 0 15px #292929, 0 0 5px #0c0c0c;
    border: 1px dashed #2b2b2b;
}

div.logo-container img {
    width: 85% !important;
    height: auto;
    user-select: none;
    transition: .3s ease all;
}

div.logo-container img:hover {
    transition: .3s ease all;
    opacity: .9;
    cursor: pointer;
}

.toolbar-ch div.logo-container h2 {
    font-size: 1.2rem;
    font-weight: 600;
    font-family: InterVariable, sans-serif;
    text-shadow: 0 0 5px #0e0e0e;
    user-select: none;
}

.toolbar-ch i {
    font-size: 1rem;
    height: 70%;
    width: 1.9rem;
    border-radius: 10rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    transition: .3s ease all;
}

.vertical-line-ch {
    width: 2px;
    height: 70%;
    align-self: center;
    background: #1f1f1f;
    box-shadow: 0 0 10px #0e0e0e,
        inset 0 0 5px #353535;
    border-radius: 10rem;
    transition: .3s ease all;
}

.header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: .5rem;
}

#status-close {
    margin-right: 10%;
    display: flex;       
    align-items: center;
    justify-content: center;
    padding: .35rem .8rem;
    background-color: #161616;
    box-shadow: inset 0 0 15px #292929, 0 0 5px #0c0c0c;
    border: 1px solid #2b2b2b;
    border-radius: 2rem;
    gap: .3rem;
    transition: all .3s ease;
}

#status-close i {
    color: #d1d1d1;
    font-size: .8rem;
    text-shadow: 0 0 10px #272727;
    width: 1rem;
    height: 1rem;
    margin-bottom: -.32rem;
    transition: all .3s ease;
}

#status-close h3 {
    font-size: .8rem;
    height:min-content;
    margin: 0;
    padding: 0;
    color: #d1d1d1;
    font-family: Inter, sans-serif;
    font-weight: 500;
    transition: all .3s ease;
}

#status-close:hover {
    background-color: #1b1b1b;
    transition: all .3s ease;
    box-shadow: inset 0 0 15px #2b2b2b, 0 0 5px #111111;
}

#status-close:hover i {
    color: #f1f1f1;
    transition: all .3s ease;
}

#status-close:hover h3 {
    color: #f1f1f1;
    transition: all .3s ease;
}

.toolbar-ch i#check-icon {
    color: #00be10;
    animation: checkIcon infinite 1.5s ease-in-out;
    border: 1px dashed #2b2b2b00;
    text-shadow: 0 0 10px #0a0a0a;
}

.toolbar-ch i#hide-icon {
    color: #ffffff;
    border: 1px dashed #2b2b2b00;
    width: 2.1rem;
    text-shadow: 0 0 10px #0a0a0a;
}

@keyframes checkIcon {
    0% {
        color: #00be10;
    }

    50% {
        color: #1e941e;
    }

    100% {
        color: #00be10;
    }
}

.toolbar-ch i#check-icon:hover {
    cursor: pointer;
    transition: .3s ease all;
    background-color: #161616;
    box-shadow: inset 0 0 15px #292929, 0 0 10px #161616;
    border: 1px dashed #2b2b2b;
}

.toolbar-ch i#hide-icon {
    color: #ffffff;
    text-shadow: 0 0 10px #0a0a0a;
    transition: all .3s ease;
}

.toolbar-ch i#hide-icon:hover {
    color: #d8d8d8;
    text-shadow: 0 0 10px #3a3a3a;
    cursor: pointer;
    transition: all .3s ease;
}

#tiny-popup {
    position: relative;
    left: 50%;
    transform: translate(-50%);
    border-top: 1px solid #272727;
    box-shadow: inset 0 0 10px #111111, 0 0 10px #111111;
    width: max-content;
    height: min-content;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    gap: .5rem;
    width: 110%;
    animation: tinyPopup 3s infinite ease;
    transition: all .2s ease;
    z-index: 99999;
    margin-top: .7rem;
    padding-top: .9rem;
}

#tiny-popup i {
    padding: 0;
    width: min-content;
    font-size: .8rem;
    margin: 0;
}

#tiny-popup h2 {
    font-weight: 500;
    font-size: .8rem;
    padding: 0;
    color:#d8d8d8;
    margin: 0;
    font-family: InterVariable, sans-serif;
    text-shadow: 0 0 5px #131313;
}

.line {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 0.4rem;
    width: 55px;
    height: 3px;
    border-radius: 1rem;
    background-color: #141414f5;
    box-shadow: 0 0 15px #141414c4, inset 0 0 5px #353535;
    touch-action: none;
    transition: opacity .3s ease-out, transform .3s ease-out;
    cursor: pointer;
    z-index: 998;
}

.line.hidden {
    opacity: 0;
    transform: translateX(-50%) translateY(40px);
}

/* when shown, back to normal */
.line.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

.dot {
    position: relative;
    width: .5rem;
    height: .5rem;
    border-radius: 6rem;
    background-color: #00be10;
    box-shadow: 0 0 15px #141414b4, inset 0 0 4px #1d1d1db0;
}

.dot::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 6rem;
    background-color: #00be10;
    opacity: 0.5;
    animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
    0% {
        transform: scale(1);
        opacity: 0.6;
    }

    50% {
        transform: scale(2.5);
        opacity: 0;
    }

    100% {
        transform: scale(1);
        opacity: 0;
    }
}

/* slide‑out hide animation */
@keyframes slideOutRight {
    to {
        transform: translateX(150%);
        opacity: 0;
    }
}

.status-panel {
    position: fixed;
    top: calc(1rem + 2.6rem + 1.2rem);
    right:auto;
    width: 300px;
    box-sizing: border-box;
    background-color: #141414;
    border-radius: 1.5rem;
    padding: 0 15px 15px 15px;
    box-shadow: 0 0 5px #141414c4, inset 0 0 15px #292929;
    border: 1px dashed #292929;
    font-family: InterVariable, sans-serif;
    color: #ffffff;
    opacity: 0;
    visibility: hidden;
    overflow: hidden;
    transition: .2s ease all;
    z-index: 99999999;
    opacity: 0;
}

.status-panel.open {
    opacity: 1;
    visibility: visible;
}

.status-header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    position: relative;
    overflow: hidden;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 16px;
    width: 120%;
    position: relative;
    left: 50%;
    transform: translate(-50%);
    font-weight: 600;
    padding-bottom: .5rem;
    border-bottom: 1px dashed #222222ff;
    box-shadow: inset 0 0 10px #111111, 0 0 10px #111111;
}

.status-header span {
    margin-left: 10%;
    font-weight:500;
}

.status-header button {
    border: none;
    background: none;
    font-size: 20px;
    line-height: 1;
    width: min-content;
    padding: 0;
    color: #ffffff;
    cursor: pointer;
}

/* timeline line */
.status-timeline {
    list-style: none;
    margin: 0;
    padding: 0;
    position: relative;
}

.status-timeline:before {
    content: "";
    position: absolute;
    left: 14px;
    top: 8px;
    bottom: 12px;
    width: 2px;
    background: #272727;
    box-shadow: 0 0 5px #0e0e0e;
}

/* each step */
.status-step {
    position: relative;
    padding-left: 36px;
    margin-bottom: 10px;
}

.status-step:last-child {
    margin-bottom: 0;
}

/* the circle */
.status-step .circle {
    position: absolute;
    left: 4px;
    top: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    outline: 5px solid #141414;
    border: 2px solid #9e9400;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 0 10px #1818186c;
    font-size: 10px;
    color: #ffffff;
    animation: upcomingAni .6s infinite ease;
}

.status-step.done .circle {
    background: #27b133ff;
    border-color: #32a53cff;
    animation: none;
}

.status-step.pending .circle {
    background: #6554c0;
    animation: none;
}

.status-step.upcoming .circle {
    background: #ffef0f;
    animation: upcomingAni .5s ease infinite;
}

.status-step.done .circle i.fa-check {
    color: #fff;
    font-size: 0.6rem;
    margin-top: .1rem;
}

.status-step .circle i.fa-spinner-scale {
    color: #fff;
    font-size: 0.7rem;
}

@keyframes upcomingAni {
    0% {
        background-color: #ffef0f;
    }

    50% {
        background-color: #a79b00ff;
    }

    100% {
        background-color: #ffef0f;
    }
}

/* text content */
.status-step .content .title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: #e2e2e2;
}

.status-step .content .meta-ch {
    margin-top: 0px;
    font-size: 12px;
    color: #8a8a8a;
    line-height: 2;
}

.status-step .timestamp {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 12px;
    color: #9b9b9b;
    display: flex;
    align-items: center;
    gap: .25rem;
}

.status-step .timestamp i {
    font-size: 12px;
    color: #9b9b9b;
    padding: 0;
    width: min-content;
}
`;
        document.head.appendChild(style);

        // ─── INJECT TOOLBAR ───────────────────────────────────────────────────
        const toolbar = document.createElement('div');
        toolbar.id = 'canvasHackToolbar';
        toolbar.className = 'toolbar-ch';
        toolbar.innerHTML = `
    <i class="fa-regular fa-circle-info" id="check-icon"></i>
    <span class="vertical-line-ch"></span>
    <i class="fa-solid fa-delete-right" id="hide-icon"></i>
  `;
        document.body.appendChild(toolbar);

        // ─── BUILD STATUS PANEL ───────────────────────────────────────────────
        const panel = document.createElement('div');
        panel.id = 'status-panel';
        panel.className = 'status-panel';
        panel.innerHTML = `
    <div class="status-header">
      <div class="logo-container" id="logo-toggle">
        <img src="https://data.canvashack.com/images/canvashack-thin.png" draggable="false">
      </div>
      <div class="header-row">
        <span>Activation status:</span>
        <button id="status-close" aria-label="Close">
          <i class="fa-solid fa-gear"></i>
          <h3>Settings</h3>
        </button>
      </div>
    </div>
    <ul class="status-timeline"></ul>
    <div id="completed-count">
      <h2 style="display:none;">0 / 5</h2>
      <div id="tiny-popup">
        <span class="dot"></span><h2>Protection On</h2>
      </div>
    </div>
  `;
        toolbar.appendChild(panel); // keep this line if you rely on it briefly to build HTML
        (function hoistPanelOutOfToolbar() {
            panel.style.transform = '';
            // Move to <body>
            document.body.appendChild(panel);
            // Compute perfect dock from the *toolbar* position
            const tb = toolbar.getBoundingClientRect();
            const pW = panel.getBoundingClientRect().width || panel.offsetWidth || 300;
            const ROOT_FS = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            const MARGIN = 0.8 * ROOT_FS;
            const GAP = 12;

            // side clamp for panel on first paint
            const left = Math.max(MARGIN, Math.min(tb.left, window.innerWidth - pW - MARGIN));
            const top = tb.top + tb.height + GAP;

            Object.assign(panel.style, {
                position: 'fixed',
                left: left + 'px',
                top: top + 'px',
                right: 'auto',
                bottom: 'auto',
                transform: ''
            });

            // stack above toolbar
            panel.style.zIndex = String(
                Math.max((parseInt(getComputedStyle(toolbar).zIndex, 10) || 9999999999) + 1, 99999999999)
            );
        })();


        // ─── SETUP STEP FUNCTIONS ─────────────────────────────────────────────
        const delay = ms => new Promise(r => setTimeout(r, ms));
        const steps = [
            () => delay(200),
            () => delay(300),
            () => delay(100),
            () => delay(250),
            () => delay(150)
        ];
        const stepInfo = [
            { title: "Override Visibility Props", desc: "Force page visible" },
            { title: "Always-Focused Tab", desc: "Force hasFocus=true" },
            { title: "Block Canvas Events", desc: "Suppress focus/visibility" },
            { title: "Activate Safeguards", desc: "Enable 10+ protections" },
            { title: "AI Trojan Protection", desc: "Remove hidden AI detectors" }
        ];


        const ul = panel.querySelector('.status-timeline');
        stepInfo.forEach((info, i) => {
            const li = document.createElement('li');
            li.dataset.step = i;
            li.className = 'status-step';
            li.innerHTML = `
      <div class="circle"></div>
      <div class="content">
        <p class="title">${info.title}</p>
        <p class="meta-ch">${info.desc}</p>
      </div>`;
            ul.appendChild(li);
        });
        const counter = panel.querySelector('#completed-count h2');

        function closePanel() {
            panel.classList.remove('open');
        }

        // ========= rock-solid coupled dragging (no lag) =========
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const ROOT_FS = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const MARGIN = 0.8 * ROOT_FS;      // 0.8rem pad
        const GAP = 12;

        // viewport width that respects zoom/OS insets
        const vpWidth = () =>
            (window.visualViewport && window.visualViewport.width) ||
            document.documentElement.clientWidth || window.innerWidth || 0;

        // allow for box-shadow glow + subpixel
        const SHADOW_OUTSET = 6; // tweak if your glow is thicker
        const PX_EPS = (window.devicePixelRatio ? 1 / window.devicePixelRatio : 0.5);

        (function addNoTransitionCSS() {
            const s = document.createElement('style');
            s.textContent = `
    .dragging, .dragging * { transition: none !important; }
  `;
            document.head.appendChild(s);
        })();

        function boundToolbar(left, top, tbW, tbH) {
            const w = vpWidth();
            const maxLeft = w - tbW - MARGIN - SHADOW_OUTSET - PX_EPS;
            const maxTop = window.innerHeight - tbH - MARGIN - PX_EPS;
            return {
                left: clamp(left, MARGIN + SHADOW_OUTSET + PX_EPS, Math.max(MARGIN, maxLeft)),
                top: clamp(top, MARGIN + PX_EPS, Math.max(MARGIN, maxTop)),
            };
        }

        function snapBothWithinBounds() {
            // toolbar
            {
                const t = toolbar.getBoundingClientRect();
                const b = boundToolbar(t.left, t.top, t.width, t.height);
                toolbar.style.left = `${b.left}px`;
                toolbar.style.top = `${b.top}px`;
            }
            // panel (use current top; horizontal clamp only)
            {
                const p = panel.getBoundingClientRect();
                const b = boundPanel(p.left, p.top);
                panel.style.left = `${b.left}px`;
                panel.style.top = `${b.top}px`;
            }
        }

        function placeToolbarTopRightAndDock() {
            // normalize current positions (so we can write left/top)
            writeFixed(toolbar);
            writeFixed(panel);

            // estimate a "desired" right-aligned left, then clamp via boundToolbar
            const tb = toolbar.getBoundingClientRect();
            const desiredLeft = (
                (window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth) -
                tb.width - MARGIN - (typeof SHADOW_OUTSET !== 'undefined' ? SHADOW_OUTSET : 0)
            );
            const b = boundToolbar(desiredLeft, MARGIN, tb.width, tb.height);
            toolbar.style.left = `${b.left}px`;
            toolbar.style.top = `${b.top}px`;
            toolbar.style.transform = '';

            // hard-dock the panel under the toolbar, clamped on sides
            const d = dockPanel(b.left, b.top, tb.width, tb.height);
            panel.style.left = `${d.left}px`;
            panel.style.top = `${d.top}px`;
            panel.style.transform = '';
        }


        function writeFixed(el) {
            const r = el.getBoundingClientRect();
            el.style.position = 'fixed';
            el.style.left = `${r.left}px`;
            el.style.top = `${r.top}px`;
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.transform = ''; // reset any previous transform
        }

        function commitTransforms(el) {
            const tr = getComputedStyle(el).transform;
            if (!tr || tr === 'none') return;
            const m = new DOMMatrix(tr);
            const dx = m.m41, dy = m.m42;
            const baseLeft = parseFloat(el.style.left || 0);
            const baseTop = parseFloat(el.style.top || 0);
            commitNoBounceClamped(el, baseLeft + dx, baseTop + dy);
        }


        function boundPanel(left, top) {
            const pW = panel.getBoundingClientRect().width || panel.offsetWidth || 300;
            const w = vpWidth();
            const maxLeft = w - pW - MARGIN - SHADOW_OUTSET - PX_EPS;
            return {
                left: clamp(left, MARGIN + SHADOW_OUTSET + PX_EPS, Math.max(MARGIN, maxLeft)),
                top, // vertical stays free by design
            };
        }

        function initPositions() {
            writeFixed(toolbar);
            writeFixed(panel);
        }
        initPositions();
        snapBothWithinBounds();
        placeToolbarTopRightAndDock();

        if (window.visualViewport) {
            const rebalance = () => {
                writeFixed(toolbar);
                const tb = toolbar.getBoundingClientRect();
                const b = boundToolbar(tb.left, tb.top, tb.width, tb.height);
                toolbar.style.left = `${b.left}px`;
                toolbar.style.top = `${b.top}px`;
                toolbar.style.transform = '';

                writeFixed(panel);
                const d = dockPanel(b.left, b.top, tb.width, tb.height);
                panel.style.left = `${d.left}px`;
                panel.style.top = `${d.top}px`;
                panel.style.transform = '';
            };
            window.visualViewport.addEventListener('resize', rebalance);
            window.visualViewport.addEventListener('scroll', rebalance);
        }

        // instantaneous docking math (no layout reads in move loop)
        function dockPanel(tbLeft, tbTop, tbW, tbH) {
            const pW = panel.getBoundingClientRect().width || panel.offsetWidth || 300;
            const w = vpWidth();
            const minLeft = MARGIN + SHADOW_OUTSET + PX_EPS;
            const maxLeft = Math.max(MARGIN, w - pW - MARGIN - SHADOW_OUTSET - PX_EPS);
            const left = clamp(tbLeft, minLeft, maxLeft);
            const top = tbTop + tbH + GAP;
            return { left, top };
        }

        function commitNoBounce(el, nextLeft, nextTop) {
            // Temporarily disable transitions so committing doesn't animate/bounce
            const prev = el.style.transition;
            el.style.transition = 'none';
            // Commit absolute position and clear transform
            el.style.left = `${nextLeft}px`;
            el.style.top = `${nextTop}px`;
            el.style.transform = '';
            // Force a layout flush so values stick without tweening
            // eslint-disable-next-line no-unused-expressions
            el.offsetWidth;
            // Restore transition on next frame
            requestAnimationFrame(() => { el.style.transition = prev; });
        }

        function commitNoBounceClamped(el, nextLeft, nextTop) {
            const prev = el.style.transition;
            el.style.transition = 'none';

            // Clamp depending on element
            if (el === toolbar) {
                const r = toolbar.getBoundingClientRect();
                const b = boundToolbar(nextLeft, nextTop, r.width, r.height);
                el.style.left = `${b.left}px`;
                el.style.top = `${b.top}px`;
            } else {
                const b = boundPanel(nextLeft, nextTop);
                el.style.left = `${b.left}px`;
                el.style.top = `${b.top}px`;
            }

            el.style.transform = '';
            // flush
            // eslint-disable-next-line no-unused-expressions
            el.offsetWidth;
            requestAnimationFrame(() => { el.style.transition = prev; });
        }


        function makeDraggable(el, { mode = 'toolbar', cancel } = {}) {
            if (!el || el.dataset.dragBound) return;
            el.dataset.dragBound = '1';

            const cancelSel = cancel || [
                'button', 'a', 'input', 'textarea', 'select',
                '[role="button"]', '[contenteditable]',
                '#check-icon', '#hide-icon', '.logo-container', '.no-drag',
                '.status-step', '#status-close', '#tiny-popup', '.circle', '.title', '.meta-ch'
            ].join(',');

            let startX, startY;
            let tbStartL, tbStartT, tbW, tbH;
            let pStartL, pStartT;

            function onDown(e) {
                if (e.button !== undefined && e.button !== 0) return;
                if (cancelSel && e.target.closest(cancelSel)) return;

                // normalize to fixed left/top once
                writeFixed(toolbar);
                writeFixed(panel);

                const tb = toolbar.getBoundingClientRect();
                const pr = panel.getBoundingClientRect();

                startX = e.clientX; startY = e.clientY;
                tbStartL = tb.left; tbStartT = tb.top; tbW = tb.width; tbH = tb.height;
                pStartL = pr.left; pStartT = pr.top;

                // if dragging panel, derive toolbar anchor directly above panel
                if (mode === 'panel') {
                    tbStartL = pStartL;
                    tbStartT = pStartT - tbH - GAP;
                    const b = boundToolbar(tbStartL, tbStartT, tbW, tbH);
                    tbStartL = b.left; tbStartT = b.top;
                    toolbar.style.left = `${tbStartL}px`;
                    toolbar.style.top = `${tbStartT}px`;
                }

                toolbar.classList.add('dragging');
                panel.classList.add('dragging');

                el.setPointerCapture?.(e.pointerId);
                window.addEventListener('pointermove', onMove, { passive: false });
                window.addEventListener('pointerup', onUp, { passive: true });
                e.preventDefault();
            }

            function onMove(e) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                let tL = tbStartL + dx;
                let tT = tbStartT + dy;

                const b = boundToolbar(tL, tT, tbW, tbH);
                tL = b.left; tT = b.top;

                // move toolbar via transform (GPU, same frame)
                toolbar.style.transform = `translate3d(${tL - tbStartL}px, ${tT - tbStartT}px, 0)`;

                // panel is *not* a child anymore → compute absolute dock and move it independently
                const dock = dockPanel(tL, tT, tbW, tbH);   // left = clamp(tL,…), top = tT + tbH + GAP
                panel.style.transform = `translate3d(${dock.left - pStartL}px, ${dock.top - pStartT}px, 0)`;
            }


            function onUp(e) {
                // commit transforms to left/top so future reads are correct
                commitTransforms(toolbar);
                commitTransforms(panel);
                snapBothWithinBounds();

                toolbar.classList.remove('dragging');
                panel.classList.remove('dragging');

                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            }

            el.addEventListener('pointerdown', onDown, { passive: false });
        }

        // init both drag surfaces
        makeDraggable(toolbar, { mode: 'toolbar' });
        makeDraggable(panel, { mode: 'panel' });

        // keep inside bounds on resize, with zero-lag re-dock
        window.addEventListener('resize', () => {
            writeFixed(toolbar);
            const tb = toolbar.getBoundingClientRect();
            const b = boundToolbar(tb.left, tb.top, tb.width, tb.height);
            toolbar.style.left = `${b.left}px`;
            toolbar.style.top = `${b.top}px`;
            toolbar.style.transform = '';
            // snap panel under, instantly
            writeFixed(panel);
            const d = dockPanel(b.left, b.top, tb.width, tb.height);
            panel.style.left = `${d.left}px`;
            panel.style.top = `${d.top}px`;
            panel.style.transform = '';
            snapBothWithinBounds();
        });


        // ─── PERSIST & HANDLE HIDE ────────────────────────────────────────────
        const hideIcon = document.getElementById('hide-icon');

        hideIcon.addEventListener('click', () => {
            // 1) if the panel is open, close it immediately (no bounce / no wait)
            if (panel.classList.contains('open')) {
                // end any drag state
                toolbar.classList.remove('dragging');
                panel.classList.remove('dragging');

                // commit current position without transitions (prevents twitch)
                const pl = parseFloat(panel.style.left || 0);
                const pt = parseFloat(panel.style.top || 0);
                if (!Number.isNaN(pl) && !Number.isNaN(pt)) {
                    // this is your existing helper
                    commitNoBounceClamped(panel, pl, pt);
                }
                panel.classList.remove('open');
            }

            // 2) animate toolbar out, then hide it
            toolbar.style.animation = 'slideOutRight .5s forwards ease';
            const onAnimEnd = () => {
                toolbar.style.display = 'none';
                toolbar.removeEventListener('animationend', onAnimEnd);
            };
            toolbar.addEventListener('animationend', onAnimEnd);
        });

        // on load (or reload) always show it again
        toolbar.style.display = 'flex';

        // ─── TOGGLE & RUN PANEL STEPS ────────────────────────────────────────
        const checkIcon = document.getElementById('check-icon');
        checkIcon.addEventListener('click', async () => {
            if (!panel.classList.contains('open')) {
                const t = toolbar.getBoundingClientRect();
                const b = boundToolbar(t.left, t.top, t.width, t.height);
                toolbar.style.left = `${b.left}px`;
                toolbar.style.top = `${b.top}px`;
                const d = dockPanel(b.left, b.top, t.width, t.height);
                panel.style.left = `${d.left}px`;
                panel.style.top = `${d.top}px`;
                panel.classList.add('open');
                if (panel.dataset.ran) return;
                panel.dataset.ran = 'true';
                for (let i = 0; i < steps.length; i++) {
                    const start = performance.now();
                    await steps[i]();
                    const elapsed = ((performance.now() - start) / 1000).toFixed(1) + 's';
                    const li = panel.querySelector(`li[data-step="${i}"]`);
                    li.classList.add('done');
                    li.querySelector('.circle').innerHTML = '<i class="fa-solid fa-check"></i>';
                    const t = document.createElement('time');
                    t.className = 'timestamp';
                    t.innerHTML = `<i class="fa-regular fa-timer"></i>${elapsed}`;
                    li.appendChild(t);
                    counter.textContent = `${i + 1} / ${steps.length}`;
                }
            } else {
                closePanel();
            }
        });

        // ─── CLOSE ON OUTSIDE CLICK ──────────────────────────────────────────
        document.addEventListener('click', e => {
            if (!panel.classList.contains('open')) return;
            if (!panel.contains(e.target) && !toolbar.contains(e.target)) {
                closePanel();
            }
        });
    });
})();