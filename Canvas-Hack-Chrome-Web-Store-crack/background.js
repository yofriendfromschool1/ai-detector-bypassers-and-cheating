chrome.runtime.onStartup.addListener(activate);
chrome.runtime.onInstalled.addListener(activate);

chrome.runtime.setUninstallURL(""); // Remove the uninstall tracking URL

async function activate() {
    // Force all "Paid" flags to true immediately
    await chrome.storage.local.set({
        paid: true,
        lifetimePaid: true,
        email: "cracked@example.com", // Dummy email to satisfy checks
        privacyGuardEnabled: true,
        saveCorrectAnswers: true,
        enabled: true
    });

    // Register the content scripts (inject.js)
    try {
        await chrome.scripting.unregisterContentScripts();
        
        const prefs = await chrome.storage.local.get({ blockedUrls: [] });
        const exclude = prefs.blockedUrls.map(url => {
            try { return `*://${new URL(url.trim()).hostname}/*`; } catch { return null; }
        }).filter(u => u);

        await chrome.scripting.registerContentScripts([{
            id: 'main',
            js: ['inject.js'],
            world: 'MAIN',
            allFrames: true,
            matchOriginAsFallback: true,
            runAt: 'document_start',
            matches: ['*://*/*'],
            excludeMatches: exclude
        }]);
        console.log('[Canvas Hack] Protection scripts registered locally.');
    } catch (err) {
        console.error('Activation error:', err);
    }
}

// Keep the message listener for UI interactions, but remove server syncs
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openPopup') {
        chrome.action.openPopup();
    } else if (message.action === 'reloadTab' && sender.tab) {
        chrome.tabs.reload(sender.tab.id);
    } else if (message.action === 'updateBlockedUrls') {
        activate();
    }
    sendResponse({ ok: true });
    return true;
});
