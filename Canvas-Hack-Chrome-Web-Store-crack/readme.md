#### READMEEE
load unpacked in extensions must have developer mode enabled

To test the vulnerability in your local version of the extension, you need to modify the logic that decides whether to show the "Paid" view or the "Unpaid" view.

The primary control logic is located in the `popup.js` file.

### Target Function: `checkPaidStatusAndUpdateUI`

This function is responsible for asking the server if the user is paid and then updating the interface. It starts around **line 235** in `popup.js`.

The specific block that handles the "Unpaid" decision is around **lines 282–291**:

```javascript
} else if (validation.paid === false) {
    const forceNotPaidInterval = setInterval(async () => {
        // Optionally override the validation object if needed
        if (validation.paid !== false) validation.paid = false;

        await removeStorage(['email', 'paid', 'lifetimePaid']);
        chrome.runtime.sendMessage({ action: 'clearStorage' });
        updateUI(false);
    }, 200);

    // Stop forcing after 10 000 ms (10 seconds)
    setTimeout(() => clearInterval(forceNotPaidInterval), 10000);
}
```

### The Bypass Modification

To force the popup to act as if the user is paid, you can modify the `checkPaidStatusAndUpdateUI` function to ignore the server response and always execute the "success" logic.

**Replace the entire validation logic (lines 255–300) with this simple override:**

```javascript
// ORIGINAL CODE TO REMOVE/COMMENT OUT:
/* if (!validation.success) { ... }
if (validation.paid === true) { ... } 
else if (validation.paid === false) { ... }
*/

// BYPASS CODE TO ADD:
console.log("[Popup] Bypassing payment check...");
await setStorage({ paid: true, lifetimePaid: true }); // Force storage to True
updateUI(true); // Force the UI to show the "Paid" screen
return; 
```

### Why this works

1.  **Storage Injection:** `await setStorage({ paid: true ... })` writes the "paid" status directly to your browser's local storage.
2.  **UI Override:** `updateUI(true)` tells the popup to hide the "Purchase" buttons and show the "Manage" and "Settings" buttons instead.
3.  **Persistence:** Because `content.js` (the script that runs on the actual Canvas page) checks `chrome.storage.local.get(['paid', ...])` to decide whether to inject the cheats, this popup modification will effectively unlock the features on the web page as well.

### Note on `background.js`

Be aware that `background.js` also has a sync function called `syncPaymentStatus` (lines 26–76) that runs periodically. If you only modify `popup.js`, the background script might eventually check the server, realize the account is invalid, and wipe the storage again.

To make the bypass permanent in your local version, you would also need to disable the check in `background.js` by commenting out the call to `syncPaymentStatus()` inside the `chrome.runtime.onStartup` listener.
