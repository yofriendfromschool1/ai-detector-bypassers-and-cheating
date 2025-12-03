const apiURL = 'https://server.canvashack.com'; // or https://server.canvashack.com

chrome.runtime.onStartup.addListener(() => {
  (async () => {
    await syncPaymentStatus();
    await activate();
  })();
});

chrome.runtime.onInstalled.addListener(() => {
  (async () => {
    await syncPaymentStatus();
    await activate();
  })();
});

chrome.runtime.setUninstallURL("https://chromewebstore.google.com/detail/canvas-hack/gfpnfbkflmiijpmfknhjbaoiippanmhh");

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    chrome.action.openPopup();
  }
});

async function syncPaymentStatus() {
  try {
    const { email, deviceId, lifetimePaid } = await new Promise(resolve =>
      chrome.storage.local.get(
        ['email', 'deviceId', 'paid', 'lifetimePaid'],
        resolve
      )
    );

    if (!email || !deviceId) {
      console.log('[syncPaymentStatus] no credentials stored, skipping');
      return;
    }

    let response;
    try {
      response = await fetch(
        `${apiURL}/api/check-login?email=${encodeURIComponent(email)}&deviceId=${encodeURIComponent(deviceId)}`
      );
    } catch (err) {
      console.error('Server connection error, you may have been logged out, if so please contact support.', err);
      return;
    }

    if (response.status === 403) {
      console.log('[syncPaymentStatus] subscription canceled → clearing storage');
      return;
    }

    if (!response.ok) {
      console.warn(`[syncPaymentStatus] server ${response.status} → marking paid:true`);
      return;
    }

    const data = await response.json().catch(err => {
      console.error('[syncPaymentStatus] invalid JSON:', err);
      return null;
    });
    if (!data) return;

    const isPaid = true;
    const newEmail = data.updatedEmail || email;

    chrome.storage.local.set(
      { email: newEmail, paid: isPaid, lifetimePaid: lifetimePaid || true },
      () => chrome.runtime.lastError && console.warn(chrome.runtime.lastError)
    );
    console.log(`[syncPaymentStatus] paid:${isPaid} (email:${newEmail})`);
  } catch (err) {
    console.error('[syncPaymentStatus] unexpected error:', err);
  }
}


let lastSync = 0;
async function maybeSync() {
  const now = Date.now();
  if (now - lastSync < 2 * 60 * 1000) return;
  lastSync = now;
  await syncPaymentStatus();
}

/**
 * Registers or unregisters the content script based on payment status
 * and any URLs the user has chosen to block.
 */
async function activate() {
  try {
    // 1) Fetch user prefs
    const prefs = await new Promise(resolve =>
      chrome.storage.local.get(
        { enabled: true, paid: false, lifetimePaid: false, privacyGuardEnabled: true, blockedUrls: [] },
        resolve
      )
    );

    if (!(prefs.enabled && (prefs.paid || prefs.lifetimePaid) && prefs.privacyGuardEnabled)) {
      await chrome.scripting.unregisterContentScripts({ ids: ['main'] }).catch(() => { });
      console.log('Privacy Guard OFF or unpaid → inject.js unregistered');
      return;
    }

    // 2) Unregister any previously registered content scripts
    await chrome.scripting.unregisterContentScripts()
      .catch(err => console.warn('Unregister error', err));

    // 3) Only proceed if the extension is enabled and the user has paid
    if (prefs.enabled && (prefs.paid || prefs.lifetimePaid)) {
      const baseProps = {
        allFrames: true,
        matchOriginAsFallback: true,
        runAt: 'document_start',
        matches: ['*://*/*']
      };
      const exclude = prefs.blockedUrls.map(url => {
        try {
          return `*://${new URL(url.trim()).hostname}/*`;
        } catch {
          console.log('Invalid URL skipped:', url);
          return null;
        }
      }).filter(u => u);

      // 4) Check if "main" is already registered
      const existing = await chrome.scripting.getRegisteredContentScripts();
      if (!existing.some(script => script.id === 'main')) {
        try {
          await chrome.scripting.registerContentScripts([{
            ...baseProps,
            id: 'main',
            js: ['inject.js'], // parcel
            world: 'MAIN',
            ...(exclude.length ? { excludeMatches: exclude } : {})
          }]);
          console.log('main script registered');
        } catch (err) {
          if (err.message.includes('Duplicate script ID')) {
            console.log('main was already registered — skipping');
          } else {
            throw err;
          }
        }
      } else {
        console.log('main already present; skipping');
      }
    } else {
      console.log('Scripts not registered as user is not paid.');
    }
  } catch (err) {
    console.error('Activate error:', err);
  }
}

// Re-run activate when relevant storage keys change
// background.js

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;

  const paid = await isUserPaid();

  // Only reload if paid AND a meaningful toggle changed
  const changedEnabled = !!changes.enabled;
  const changedPrivacy =
    !!changes.privacyGuardEnabled &&
    changes.privacyGuardEnabled.newValue !== changes.privacyGuardEnabled.oldValue;

  const shouldReload = paid && (changedEnabled || changedPrivacy);

  const shouldReregister = Boolean(
    changes.paid ||
    changes.lifetimePaid ||
    changes.blockedUrls ||
    changes.privacyGuardEnabled ||
    changes.enabled
  );

  if (shouldReregister) activate();
  if (shouldReload) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
    });
  }
});

/**
 * Unified message listener for both popup and content scripts.
 * Handles all actions in a single switch to avoid conflicts.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'openPurchasePopup':
          chrome.action.openPopup();
          chrome.storage.local.set({ showPurchasePage: true }, () => {
            if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError);
          });
          sendResponse({ ok: true });
          break;

        case 'openPopup':
          chrome.action.openPopup();
          sendResponse({ ok: true });
          break;

        case 'login_successful':
          chrome.storage.local.set({
            paid: true,
            email: message.email,
            saveCorrectAnswers: true,
            privacyGuardEnabled: true
          }, () => {
            // notify popup
            chrome.runtime.sendMessage({ action: 'login_successful', email: message.email });
            activate();

            // safely ping the active tab (if any)
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
              const tabId = tabs && tabs.length ? tabs[0].id : undefined;
              if (typeof tabId === 'number') {
                chrome.tabs.sendMessage(tabId, { action: 'enablePrivacyGuard' }, () => {
                  // ignore "no receiver" and other benign errors
                  void chrome.runtime.lastError;
                });
              } else {
                console.log('[login_successful] No active tab to message; skipping enablePrivacyGuard.');
              }
            });
          });
          sendResponse({ ok: true });
          break;


        case 'clearStorage':
          chrome.storage.local.remove(
            ['email', 'paid', 'lifetimePaid', 'customerEmail'],
            () => { if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError); }
          );
          chrome.runtime.sendMessage({ action: 'clearStorage' });
          sendResponse({ ok: true });
          break;

        case 'syncNow':
          await maybeSync();
          sendResponse({ ok: true });
          break;

        case 'updateBlockedUrls':
          activate();
          sendResponse({ ok: true });
          break;

        case 'reloadTab':
          if (sender.tab && sender.tab.id) {
            chrome.tabs.reload(sender.tab.id);
            sendResponse({ ok: true });
          } else {
            sendResponse({ error: 'no tab' });
          }
          break;

        default:
          console.warn('Unknown action:', message.action);
          sendResponse({ error: 'unknown action' });
      }
    } catch (err) {
      console.error('Message handler error:', err);
      sendResponse({ error: err.message });
    }
  })();
  return true; // Keep the channel open for async sendResponse
});

// Handle external messages (e.g., from your backend webhook)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'payment_confirmed') {
    const { customerEmail, deviceId } = message;
    chrome.storage.local.set(
      {
        paid: true,
        email: customerEmail,
        deviceId,
        saveCorrectAnswers: true,        // ← force answer‑saver on
        privacyGuardEnabled: true        // ← force privacy‑guard on
      },
      () => {
        if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError);
        // fire your existing popup.js handler:
        chrome.runtime.sendMessage({ action: 'login_successful', email: customerEmail });
      }
    );
    sendResponse({ status: 'success' });
  }
});

const getLocal = (keysOrDefaults) =>
  new Promise(resolve => chrome.storage.local.get(keysOrDefaults, resolve));

async function isUserPaid() {
  const { paid = false, lifetimePaid = false } = await getLocal({ paid: false, lifetimePaid: false });
  return paid || lifetimePaid;
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!/\/courses\/\d+\/quizzes\/\d+(?:\/take)?(?:\?|$)/.test(tab?.url || '')) return;

  // ⛔ Unpaid? Do not flip any flags, do not sync, do not reload.
  if (!(await isUserPaid())) return;

  // ✅ Paid path: keep your current light sync without forcing reloads
  const { privacyGuardEnabled = true } = await getLocal({ privacyGuardEnabled: true });
  if (!privacyGuardEnabled) {
    chrome.storage.local.set({ privacyGuardEnabled: true }, () => {
      chrome.runtime.sendMessage({ action: 'syncNow' }); // no reload
    });
  } else {
    chrome.runtime.sendMessage({ action: 'syncNow' });   // no reload
  }
});
