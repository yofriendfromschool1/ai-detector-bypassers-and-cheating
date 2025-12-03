chrome.storage.local.get(['email', 'paid'], (result) => {
    if (!result.paid && result.email) {
    }
});

chrome.storage.local.get(['paid', 'lifetimePaid', 'blockedUrls'], function (result) {
    const currentUrl = new URL(window.location.href).href;

    function normalizeUrl(url) {
        if (!url) return '';
        let parsedUrl = new URL(url);
        let hostname = parsedUrl.hostname.replace(/^www\./, '');
        return `${parsedUrl.protocol}//${hostname}`;
    }

    const isBlocked = result.blockedUrls && result.blockedUrls.some(blockedUrl => {
        if (!blockedUrl.trim()) return false;
        const normalizedBlockedUrl = normalizeUrl(blockedUrl.trim());
        const normalizedCurrentUrl = normalizeUrl(currentUrl);

        return normalizedCurrentUrl.startsWith(normalizedBlockedUrl);
    });

    if (isBlocked) {
        console.log(`[Canvas Hack] Injection blocked on: ${currentUrl}`);
        return;
    }

    const isPaid = result.lifetimePaid || result.paid;

    function checkMetaTag() {
        const metaElement = document.querySelector('meta[name="apple-itunes-app"][content="app-id=480883488"]');

        if (metaElement && !isPaid) {
            // User hasn't purchased, open the popup and show the purchase page
            chrome.runtime.sendMessage({ action: 'openPurchasePopup' });
        }
    }

    checkMetaTag();

    // Open extension popup directly to Settings when the injected "Settings" button is clicked
    // ✅ Paste to replace your entire attachOpenSettingsFromInjectedUI IIFE
    (function attachOpenSettingsFromInjectedUI() {
        // use originals in case the page patches addEventListener
        const add = EventTarget.prototype.addEventListener;
        const rm = EventTarget.prototype.removeEventListener;
        const CAP = { capture: true, passive: true };

        function openSettingsNow() {
            // close panel if it's open
            const panel = document.getElementById('status-panel');
            if (panel) panel.classList.remove('open');

            // set the flag, then ask background to open the popup
            if (chrome && chrome.runtime && chrome.runtime.id) {
                try {
                    chrome.storage.local.set({ showSettingsPage: true }, () => {
                        try {
                            chrome.runtime.sendMessage({ action: 'openPopup' }, () => {
                                // swallow benign errors (e.g., nav/teardown race)
                                void chrome.runtime.lastError;
                            });
                        } catch (_) { /* ignore */ }
                    });
                } catch (_) { /* ignore */ }
            }
        }

        // one delegated handler catches clicks even if the button is re-created
        function onDocClick(e) {
            const btn = e.target && e.target.closest ? e.target.closest('#status-close') : null;
            if (!btn) return;

            // de-dupe rapid double-clicks
            if (btn.dataset._opening === '1') return;
            btn.dataset._opening = '1';
            openSettingsNow();
            setTimeout(() => { try { delete btn.dataset._opening; } catch { } }, 400);
        }

        // register using the pristine addEventListener on the capture phase
        add.call(document, 'click', onDocClick, CAP);

        // clean up on teardown so we don't hold a dead listener across SPA nav
        add.call(window, 'pagehide', () => rm.call(document, 'click', onDocClick, CAP), { once: true });
    })();


    if (isPaid) {
        chrome.storage.local.set({ injectQuizAnswers: true }, function () {
            console.log('injectQuizAnswers set to true in storage.');
        });

        chrome.storage.local.get(['shouldReload'], function (result) {
            const barExists = document.getElementById('inputCanvasHack') !== null;
            const iframeExists = document.getElementById('kioskIframe') !== null;

            if (barExists && iframeExists) {
                if (result.shouldReload) {
                    // Inject script if shouldReload is true
                    chrome.storage.local.set({ shouldReload: false });
                } else {
                    // Set shouldReload to true and reload tab
                    chrome.storage.local.set({ shouldReload: true }, function () {
                        chrome.runtime.sendMessage({ action: "reloadTab" });
                    });
                }
            }
        });

        let barInjected = !!document.getElementById('inputCanvasHack');

        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            switch (msg.action) {
                case 'toggleBar':
                    if (barInjected) removeBar();
                    else injectBar();
                    sendResponse({ injected: barInjected });
                    break;

                case 'removeBar':
                    removeBar();
                    sendResponse({ injected: barInjected });
                    break;

                case 'isInjected':
                    sendResponse({ injected: barInjected });
                    break;

                case 'enablePrivacyGuard':
                    window.__blockCanvasEvents = true;
                    break;

                case 'disablePrivacyGuard':
                    window.__blockCanvasEvents = false;
                    break;
            }
            return true;
        });

        function removeBar() {
            const el = document.getElementById('inputCanvasHack');
            if (el) el.remove();
            barInjected = false;
        }

        // Inject helper: creates one <div id="inputCanvasHack">…</div> and prepends it
        function injectBar() {
            if (barInjected) return;        // guard
            const pageSrc = window.location.href;
            const wrapper = document.createElement('div');
            wrapper.id = 'inputCanvasHack';

            // inner HTML no longer needs its own <div id="inputCanvasHack">
            wrapper.innerHTML = `
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="stylesheet" href="https://site-assets.fontawesome.com/releases/v6.2.0/css/all.css">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Montserrat:wght@100;200;300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
                <div class="bar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" viewBox="0 0 24 24" style="fill: rgba(0, 0, 0, 1)"><path d="m4.431 12.822 13 9A1 1 0 0 0 19 21V3a1 1 0 0 0-1.569-.823l-13 9a1.003 1.003 0 0 0 0 1.645z"></path></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" heighst="16" viewBox="0 0 24 24" style="fill: rgb(160, 160, 160)"><path d="M5.536 21.886a1.004 1.004 0 0 0 1.033-.064l13-9a1 1 0 0 0 0-1.644l-13-9A1 1 0 0 0 5 3v18a1 1 0 0 0 .536.886z"></path></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0.00 0.00 658.00 778.00" class="home">
                        <path fill="#000000" d="   M 328.50 0.00   L 328.84 0.00   Q 330.01 1.05 331.17 2.08   Q 488.37 141.50 652.67 287.38   C 655.74 290.10 657.36 292.61 657.36 296.55   Q 657.38 536.28 657.36 776.69   Q 657.36 777.37 656.73 777.62   Q 656.38 777.75 655.50 777.75   Q 328.27 777.75 1.05 777.75   Q 0.72 777.75 0.48 777.60   Q 0.21 777.42 0.00 777.22   L 0.00 291.94   C 0.48 291.44 0.60 290.90 1.14 290.43   Q 164.76 145.28 328.50 0.00   Z   M 621.00 308.16   A 1.18 1.18 0.0 0 0 620.60 307.28   L 329.43 48.97   A 1.18 1.18 0.0 0 0 327.87 48.97   L 36.63 307.34   A 1.18 1.18 0.0 0 0 36.23 308.22   L 36.28 740.40   A 1.18 1.18 0.0 0 0 37.46 741.58   L 619.82 741.59   A 1.18 1.18 0.0 0 0 621.00 740.41   L 621.00 308.16   Z"/>
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0.00 0.00 779.00 672.00" class="reload">
                        <path fill="#000000" d="   M 337.30 672.00   L 336.16 672.00   Q 329.35 671.75 322.54 671.51   C 276.02 669.88 229.94 657.66 187.40 636.91   C 147.95 617.67 112.34 589.81 83.28 556.99   Q 49.15 518.45 27.95 469.68   Q 4.35 415.38 0.87 355.25   Q 0.44 347.72 0.00 340.22   L 0.00 339.22   L 0.00 332.40   L 0.00 331.50   Q 0.72 314.70 1.29 308.26   Q 9.89 210.92 68.60 133.30   C 100.75 90.78 142.10 56.50 190.04 33.62   Q 282.65 -10.56 384.74 3.76   C 452.76 13.30 515.87 44.95 566.21 91.54   Q 573.40 98.19 580.17 105.49   Q 655.88 187.03 670.00 298.54   C 670.77 304.55 670.73 310.54 671.03 316.51   A 0.66 0.65 -18.1 0 0 672.05 317.02   Q 673.97 315.74 675.42 313.77   Q 707.79 269.59 742.65 222.63   C 747.91 215.55 754.87 211.41 763.89 213.67   Q 774.36 216.29 777.59 227.20   Q 779.14 232.43 777.82 237.22   Q 776.99 240.27 772.89 245.81   Q 719.52 318.02 664.08 393.18   Q 663.07 394.56 661.69 393.55   Q 590.27 340.90 519.48 288.56   C 511.39 282.58 502.89 274.02 506.53 263.05   Q 509.59 253.83 516.91 250.14   Q 523.85 246.64 530.80 249.38   Q 537.30 251.95 543.13 256.27   Q 586.49 288.42 629.72 320.39   A 1.08 1.08 0.0 0 0 631.36 319.94   Q 631.61 319.35 631.63 318.52   Q 631.75 313.48 631.25 308.77   Q 629.15 289.05 624.68 269.74   Q 607.02 193.50 554.44 135.83   Q 521.22 99.40 478.57 76.29   C 450.39 61.03 420.18 49.75 388.51 44.37   Q 306.58 30.46 229.80 59.53   Q 208.10 67.74 188.03 79.28   Q 137.96 108.07 102.13 154.11   Q 75.80 187.95 60.42 227.09   Q 38.25 283.53 39.90 343.52   C 42.23 428.11 80.19 508.14 145.10 562.61   Q 173.65 586.57 205.28 601.96   C 243.07 620.34 283.64 630.58 325.25 632.00   Q 400.82 634.56 469.13 600.59   Q 526.35 572.14 566.39 522.11   C 569.91 517.71 573.93 512.04 577.93 508.98   Q 586.17 502.70 595.52 505.33   C 611.71 509.90 613.44 526.69 603.61 538.64   Q 596.18 547.67 586.95 558.47   Q 564.46 584.79 534.74 606.49   Q 447.05 670.50 337.30 672.00   Z"/>
                    </svg>
                    <p>Restart session</p>
                </div>

                <iframe src="${pageSrc}" id="kioskIframe" scrolling="auto" sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation allow-top-navigation-by-user-activation"></iframe>

                <style>
                    body {
                        height: 100vh;
                        width: 100vw;
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                    }

                    .bar {
                        position: fixed;
                        height: 2.75vw;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        background-color: #e4e4e4;
                        border-bottom: 1px solid #b6b6b6;
                        display: flex;
                        margin: auto;
                        align-items: center;
                        padding-left: .8vw;
                        gap: 1.1vw;
                        user-select: none;
                        z-index: 9999999999999;
                    }

                    iframe {
                        position: fixed;
                        border: none;
                        top: 2.75vw;
                        width: 100vw;
                        height: 100vh;
                        left: 0;
                        z-index: 99999;
                    }
                    
                    .bar p {
                        font-size: 1vw;
                        margin: 0;
                        font-family: 'Roboto', sans-serif;
                        color: #273540;
                        font-weight: 400;
                        margin-left: .2vw;
                    }
                    
                    .home {
                        height: 1vw;
                        width: .8vw;
                    }
                    
                    .reload {
                        height: 1vw;
                        width: 1.1vw;
                    }
                </style>
                <script>
                    function updateIframeHref(iframe) {
                        if (iframe && iframe.contentDocument) {
                            const mainDomain = iframe.contentWindow.location.protocol + '//' + iframe.contentWindow.location.host;
                    
                            const links = iframe.contentDocument.getElementsByTagName('a');
                    
                            for (let i = 0; i < links.length; i++) {
                                const href = links[i].getAttribute('href');
                                
                                if (href && href.startsWith('/')) {
                                    links[i].setAttribute('href', mainDomain + href);
                                }
                            }
                        }
                    }
                    
                    // Function to handle the iframe load event
                    function onIframeLoad() {
                        const iframe = document.getElementById('kioskIframe');
                        updateIframeHref(iframe);
                        console.log("iframe updated");
                    }
                    
                    // Attach the load event listener to the iframe
                    const iframeElement = document.getElementById('kioskIframe');
                    if (iframeElement) {
                        iframeElement.addEventListener('load', onIframeLoad);
                    }
                </script>
            `;
            document.body.prepend(wrapper);
            barInjected = true;
        }

        console.log("This site has NOT been blocked from CanvasHacks injecting service and is fully running its protection scripts.");
    } else {
        console.log("User has not paid, scripts will not be injected.");

        chrome.storage.local.set({ injectQuizAnswers: false }, function () {
            console.log('injectQuizAnswers set to false in storage.');
        });
    }
});

(function initInjectedUIVisibilityToggle() {
    const STYLE_ID = 'ch-hide-injected-ui-style';

    function setHidden(hidden) {
        let styleEl = document.getElementById(STYLE_ID);
        if (hidden) {
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = STYLE_ID;
                styleEl.textContent = `
          /* Only target the inject.js toolbar UI */
          #canvasHackToolbar.toolbar-ch,
          #canvasHackToolbar.toolbar-ch * {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          /* (status panel is a child of the toolbar in inject.js) */
        `;
                (document.head || document.documentElement).appendChild(styleEl);
            }
        } else {
            if (styleEl) styleEl.remove();
        }
    }

    chrome.storage.local.get({ showInjectedUI: true }, ({ showInjectedUI }) => {
        setHidden(!showInjectedUI);
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg && msg.action === 'applyShowInjectedUI') {
            setHidden(!msg.show);
        }
    });
})();
