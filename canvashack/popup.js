document.addEventListener('DOMContentLoaded', async () => {
    const settingsIcon = document.getElementById("settings_icon");
    const updatesIcon = document.getElementById("updates_icon");

    const settingsBackIcon = document.getElementById("settings_back");
    const pageOne = document.getElementById("p1");
    const pageTwo = document.getElementById("p2");
    const pageThree = document.getElementById("p3");
    const pageFour = document.getElementById("p4");
    const pageFive = document.getElementById("p5");
    const pageSix = document.getElementById("p6");
    const pageSeven = document.getElementById("p7");
    const pageEight = document.getElementById("p8");
    const pageNine = document.getElementById("p9");

    const apiURL = 'https://server.canvashack.com'; // https://server.canvashack.com or http://localhost:3000

    window.addEventListener("unhandledrejection", event => {
        if (event.reason?.message?.includes("Could not establish connection")) {
            event.preventDefault(); // Suppress only that error
        }
    });

    function withActiveTabId(run) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs && tabs[0];
            const id = tab && typeof tab.id === 'number' ? tab.id : null;
            if (id == null) return;
            run(id);
        });
    }

    async function checkLoginStatus(email, deviceId) {
        try {
            const response = await fetch(
                `${apiURL}/api/check-login?email=${encodeURIComponent(email)}&deviceId=${encodeURIComponent(deviceId)}`
            );
            const data = await response.json();

            if (data.updatedEmail) {
                // Update the stored email if it has changed
                chrome.storage.local.set({ email: data.updatedEmail }, () => {
                    console.log('Local storage email updated to:', data.updatedEmail);
                });
                chrome.storage.local.set({ customerEmail: data.updatedEmail }, () => {
                    console.log('customerEmail email updated to:', data.updatedEmail);
                });
            }

            if (!response.ok) {
                console.log("Server responded with error:", data.error || data.message);

                // Only log out if the error is specifically "Failed to verify session."
                if (data.error === "Failed to verify session.") {
                    chrome.storage.local.remove(
                        ["email", "paid", "lifetimePaid", "customerEmail"],
                        function () {
                            chrome.runtime.sendMessage({ action: 'clearStorage' });

                            updateUI(false);
                            showOnlyPage(pageOne);
                        }
                    );
                } else if (data.error === "User not found") {
                    chrome.storage.local.remove(
                        ["email", "paid", "lifetimePaid", "customerEmail"],
                        function () {
                            chrome.runtime.sendMessage({ action: 'clearStorage' });

                            updateUI(false);
                            showOnlyPage(pageOne);
                        }
                    );
                } else if (data.error === "Your subscription has been canceled.") {
                    const email = await new Promise(resolve => {
                        chrome.storage.local.get(['email'], function (result) {
                            resolve(result.email);
                        });
                    });
                    const deviceId = await new Promise(resolve => {
                        chrome.storage.local.get(['deviceId'], function (result) {
                            resolve(result.deviceId);
                        });
                    });

                    if (!email || !deviceId) {
                        alert('No user logged in.');
                        document.getElementById("logoutModal").style.display = "none";
                        return;
                    }

                    const response = await fetch(`${apiURL}/api/logout`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email,
                            deviceId
                        })
                    });
                    if (response.ok) {
                        console.log("Logged out user")
                    } else {
                        const errorText = await response.text();
                        alert('Failed to log out: ' + errorText);
                    }
                    chrome.storage.local.remove(
                        ["email", "paid", "lifetimePaid", "customerEmail"],
                        function () {
                            chrome.runtime.sendMessage({ action: 'clearStorage' });

                            updateUI(false);
                            showOnlyPage(pageOne);
                        }
                    );
                }

                return false;
            }

            // If response is OK, then check if user is logged in
            if (data.loggedIn) {
                chrome.storage.local.set({
                    paid: true,
                    email: email
                }, function () {
                    fetchUserStatus(email);
                });
                return true;
            } else {
                // If it's not "Failed to verify session." but still not logged in, handle accordingly
                if (data.message && data.message.includes("canceled")) {
                    console.log(
                        "Your subscription has been canceled. Please purchase a new subscription."
                    );
                } else {
                    updateUI(false);
                }
                return false;
            }
        } catch (error) {
            console.log("Error checking login status:", error);
            updateUI(false);
            return false;
        }
    }

    function getStorage(keys) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result);
                }
            });
        });
    }

    function setStorage(items) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set(items, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    function removeStorage(keys) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.remove(keys, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    async function validatePaidStatus(email, deviceId) {
        try {
            const response = await fetch(`${apiURL}/api/validate-paid-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    deviceId
                })
            });

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.log('[validatePaidStatus] Failed to parse JSON:', jsonError);
                return {
                    success: false,
                    paid: null
                };
            }

            if (!response.ok) {
                console.log('validatePaidStatus error:', data);
                return {
                    success: false,
                    paid: null
                };
            }

            // Log the server response
            console.log('[validatePaidStatus] Server response:', data);

            // Explicitly return the paid status
            if (data.paid === true) {
                return {
                    success: true,
                    paid: true
                };
            } else if (data.paid === false) {
                return {
                    success: true,
                    paid: false
                };
            } else {
                console.log('[validatePaidStatus] Unexpected paid status:', data.paid);
                return {
                    success: false,
                    paid: null
                };
            }
        } catch (err) {
            console.log('[validatePaidStatus] Error:', err);
            return {
                success: false,
                paid: null
            };
        }
    }

    async function checkPaidStatusAndUpdateUI() {
        try {
            const {
                email,
                deviceId,
                paid: previousPaid
            } = await getStorage(['email', 'deviceId', 'paid']);

            if (email && deviceId) {
                console.log("[Popup] Found stored email/deviceId:", email, deviceId);

                const validation = await validatePaidStatus(email, deviceId);

                if (!validation.success) {
                    // The server call failed or didn't parse => keep the existing 'paid' status
                    console.log("[Popup] Unable to validate paid status. Keeping previous state:", previousPaid);
                    chrome.storage.local.remove(
                        ["email", "paid", "lifetimePaid", "customerEmail"],
                        function () {
                            chrome.runtime.sendMessage({ action: 'clearStorage' });
                            updateUI(false);
                            showOnlyPage(pageOne);
                        }
                    );
                    updateUI(!!previousPaid);
                    return;
                }

                // If validation was successful:
                if (validation.paid === true) {
                    // They are confirmed paid
                    console.log("[Popup] User is definitely paid.");
                    await setStorage({
                        paid: true
                    });
                    updateUI(true);
                    // Optional: showMessage('Payment verified. Enjoy your features!', 'success');
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
                } else {
                    // The server returned something unexpected
                    console.log("[Popup] Received unexpected paid status. Keeping previous state:", previousPaid);
                    // Keep the previous paid/unpaid state
                    updateUI(!!previousPaid);
                }

            } else {
                // No credentials stored => they're not logged in
                console.log("[Popup] No stored email/deviceId. User is not logged in.");
                updateUI(false);
                showOnlyPage(pageOne);
            }
        } catch (error) {
            console.log("[Popup] Error checking paid status:", error);
            // If an error occurs, keep the existing paid state
            const {
                paid: previousPaid
            } = await getStorage(['paid']);
            updateUI(!!previousPaid);
            // Optionally show a message:
            // showMessage('An error occurred while verifying your payment status. Keeping current status.', 'error');
        }
    }

    document.getElementById('toggleButton').addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tab = tabs[0];
            if (!tab || !tab.url.startsWith('http')) return;
            chrome.tabs.sendMessage(tab.id, { action: "toggleBar" }, () => {
                if (chrome.runtime.lastError) {

                }
            });
        });
    });
    // Execute the main function
    checkPaidStatusAndUpdateUI();

    function hideUpgradeSeparator() {
        const btn = document.getElementById('upgradeButton');
        const bar = document.querySelector('.logout-container hr');
        if (btn && bar && getComputedStyle(btn).display === 'none') {
            bar.remove();
            return true;
        }
        return false;
    }

    // call once right away
    hideUpgradeSeparator();

    // then poll every 10 ms until it succeeds
    const sepTimer = setInterval(() => {
        if (hideUpgradeSeparator()) clearInterval(sepTimer);
    }, 10);

    chrome.storage.local.get(['lifetimePaid'], ({ lifetimePaid }) => {
        if (lifetimePaid) {
            document.getElementById('upgradeButtonContainer').style.display = 'none';
            document.getElementById('upgradeButton').style.display = 'none';
            document.getElementById('manageButton').textContent = 'Manage Account';
            document.getElementById('subscriptionType').textContent = 'Lifetime Purchase';
            document.getElementById('cancel-manage-cont').style.display = 'none';
        } else {
            chrome.storage.local.get('email', function (result) {
                if (result.email) {
                    console.log('Email exists:', result.email);

                    document.getElementById('customerEmailDisplay').textContent = result.email;

                    fetch(`${apiURL}/api/purchase-details?email=${encodeURIComponent(result.email)}`)
                        .then(async response => {
                            const data = await response.json();
                            if (!response.ok) {
                                throw new Error(data.error || 'Unknown error');
                            }
                            return data;
                        })
                        .then(data => {
                            if (data.current_plan === 'Lifetime Purchase') {
                                chrome.storage.local.set({ lifetimePaid: true }, () => {
                                    if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
                                });

                                document.getElementById('upgradeButtonContainer').style.display = 'none';
                                document.getElementById('upgradeButton').style.display = 'none';
                                document.getElementById('manageButton').textContent = 'Manage Account';
                                document.getElementById('cancel-manage-cont').style.display = 'none';
                                updateUI(true);
                            } else if (data.current_plan === 'Monthly Subscription') {
                                chrome.storage.local.set({ lifetimePaid: false }, () => {
                                    if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
                                });

                                document.getElementById('upgradeButtonContainer').style.display = 'block';
                                document.getElementById('manageButton').textContent = 'Manage';
                                updateUI(true);
                            }
                        })
                        .catch(error => {
                            console.log('Error fetching purchase details:', error);

                            // Check if the error indicates "User not found"
                            if (error.message === 'User not found') {
                                chrome.storage.local.remove(['email', 'paid', 'lifetimePaid', 'customerEmail'], function () {
                                    showOnlyPage(pageOne);
                                    console.log('not logged in');
                                });
                                chrome.storage.local.set({
                                    paid: false
                                });
                            }
                        });
                } else {
                    console.log('Email does not exist.');
                    document.getElementById('upgradeButtonContainer').style.display = 'none';
                }
            });
        }
    });

    chrome.storage.local.get(['email', 'pendingEmail', 'deviceId'], async (result) => {
        const {
            email,
            pendingEmail,
            deviceId
        } = result;

        if (email && deviceId) {
            console.log('[Popup] We have an email:', email);
            await checkLoginStatus(email, deviceId);
        } else if (pendingEmail && deviceId) {
            console.log('[Popup] We only have pendingEmail:', pendingEmail);

            const isVerified = await checkLoginStatus(pendingEmail, deviceId);

            if (isVerified) {
                chrome.storage.local.set({
                    email: pendingEmail
                }, () => {
                    chrome.storage.local.remove(['pendingEmail']);
                    console.log('[Popup] Moved pendingEmail -> email. User verified.');
                    updateUI(true);
                    window.location.reload();
                });
            } else {
                console.log('[Popup] They have not verified yet. Still pending.');
            }
        } else {
            const forceNotPaidInterval = setInterval(async () => {
                await removeStorage(['email', 'paid', 'lifetimePaid']);
                updateUI(false);
                chrome.runtime.sendMessage({ action: 'clearStorage' });
            }, 200);

            // Stop forcing after 10 000 ms (10 seconds)
            setTimeout(() => clearInterval(forceNotPaidInterval), 10000);
        }
    });

    function generateDeviceId() {
        return crypto.randomUUID();
    }

    document.getElementById("purchase-login-button").onclick = async () => {
        showOnlyPage(pageEight);
    };

    document.getElementById("loginButton").onclick = async () => {
        showOnlyPage(pageEight);
    };

    const emailInput = document.getElementById('email-login-input');
    const nextButton = document.getElementById('email-next-button');
    const loginIndicatorMessage = document.getElementById('login-indicator-message');

    function showMessage(message, type) {
        loginIndicatorMessage.classList.remove('success-class', 'error-class', 'warning-class');

        loginIndicatorMessage.style.opacity = "1"

        if (type === 'success') {
            loginIndicatorMessage.classList.add('success-class');
        } else if (type === 'error') {
            loginIndicatorMessage.classList.add('error-class');
        } else if (type === 'warning') {
            loginIndicatorMessage.classList.add('warning-class');
        }

        loginIndicatorMessage.textContent = message;
    }

    async function sendLoginRequest(email) {
        if (!email) {
            showMessage('Please enter a valid email address.', 'error');
            return;
        }

        chrome.storage.local.get(['deviceId', 'lastSendTime'], async (result) => {
            let deviceId = result.deviceId;
            if (!deviceId) {
                deviceId = generateDeviceId();
                chrome.storage.local.set({
                    deviceId: deviceId
                });
            }

            const now = Date.now();
            const lastSendTime = result.lastSendTime || 0;
            const oneMinute = 10 * 1000;

            // Check if enough time has passed since last send
            if (now - lastSendTime < oneMinute) {
                const secondsLeft = Math.ceil((oneMinute - (now - lastSendTime)) / 1000);
                showMessage(`Please wait ${secondsLeft} more second(s) before trying again.`, 'warning');
                return;
            }

            try {
                const response = await fetch(`${apiURL}/api/send-verification`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        deviceId
                    })
                });

                if (response.ok) {
                    // Save the timestamp of the successful send
                    chrome.storage.local.set({
                        lastSendTime: now
                    }, () => {
                        showOnlyPage(pageNine);
                    });
                    chrome.storage.local.set({
                        pendingEmail: email
                    });
                } else {
                    // If not OK, parse the server's error text
                    const errorText = await response.text();

                    // Check if it's the canceled subscription message
                    if (errorText.includes('canceled')) {
                        showMessage(errorText, 'error');
                    } else {
                        showMessage('Failed to send login email: ' + errorText, 'error');
                    }
                }
            } catch (error) {
                showMessage('Error sending login request: ' + error.message, 'error');
            }
        });
    }

    nextButton.onclick = () => {
        const email = emailInput.value.trim();
        sendLoginRequest(email);
    };

    emailInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const email = emailInput.value.trim();
            sendLoginRequest(email);
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'fetchUserStatus') {
            const email = message.email;
            fetchUserStatus(email);
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'payment_status_update') {
            console.log('Received payment status update:', message.paid);
            const customerEmail = message.customerEmail;
            chrome.storage.local.set({
                paid: message.paid,
                email: customerEmail
            }, function () {
                fetchUserStatus(customerEmail);
            });
        }
    });

    async function fetchUserStatus(email) {
        try {
            // Make the request
            const response = await fetch(`${apiURL}/api/user-status?email=${encodeURIComponent(email)}`);

            // If response isn't OK (4xx or 5xx), handle that
            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            // Parse response body
            const data = await response.json();

            // Check for "success" in the returned data
            if (data.success) {
                const typePurchase = parseInt(data.typePurchase, 10);

                // If lifetime (typePurchase===2), mark lifetimePaid
                if (typePurchase === 2) {
                    chrome.storage.local.set({
                        paid: true,
                        lifetimePaid: true,
                        email: email
                    }, () => {
                        updateUI(true);
                    });
                } else if (typePurchase === 1) {
                    // Otherwise, user is paid but not lifetime
                    chrome.storage.local.set({
                        paid: true,
                        lifetimePaid: false,
                        email: email
                    }, () => {
                        updateUI(true);
                    });
                }

            } else {
                // data.success = false
                // Instead of forcing them unpaid/logged out, we just log
                console.log('fetchUserStatus: "success" was false. Keeping previous state.');
                // Optionally show a message to user:
                // showMessage('Could not verify user status from server. Try again later.', 'warning');
            }

        } catch (error) {
            // If fetch fails or JSON parsing fails
            console.log('Error fetching user status:', error);
            // Keep existing user state. Optionally notify user:
            // showMessage('Failed to reach server. Retaining current login status.', 'warning');
        }
    }

    function showOnlyPage(pageToShow) {
        const pages = [pageOne, pageTwo, pageThree, pageFour, pageFive,
            pageSix, pageSeven, pageEight, pageNine];
        // find the currently visible page
        const current = pages.find(p => p.style.display !== 'none');
        if (current === pageToShow) return;  // no-op if already on the page

        // 1) animate current page out
        current.style.animation = 'page-exit 0.3s ease';
        current.addEventListener('animationend', onExit);

        function onExit() {
            current.removeEventListener('animationend', onExit);
            // hide all pages (restores your original logic)
            pages.forEach(p => {
                p.style.display = 'none';
                p.style.animation = '';
            });

            // 2) show the new page & animate it in
            pageToShow.style.display = 'flex';
            pageToShow.style.animation = 'page-enter 0.3s ease';
            pageToShow.addEventListener('animationend', onEnter);
        }

        function onEnter() {
            pageToShow.removeEventListener('animationend', onEnter);
            pageToShow.style.animation = '';
        }

        // maintain your icon‐activation rules
        if (pageToShow !== pageTwo) settingsIcon.classList.remove('activated');
        if (pageToShow !== pageSeven) updatesIcon.classList.remove('activated');
    }


    const monthlyOption = document.getElementById('monthlyOption');
    const lifetimeOption = document.getElementById('lifetimeOption');
    const purchaseButton = document.querySelector('.purchase-button');

    function activateOption(selectedOption) {
        if (selectedOption === 'monthly') {
            // Set monthly as active
            monthlyOption.classList.remove('unactive');
            monthlyOption.classList.add('active');
            monthlyOption.querySelector('i').className = 'fa-solid fa-circle-check';

            // Set lifetime as inactive
            lifetimeOption.classList.remove('active');
            lifetimeOption.classList.add('unactive');
            lifetimeOption.querySelector('i').className = 'fa-regular fa-circle';

            // Update purchase button ID for monthly
            purchaseButton.id = 'paymentButton';
            attachPurchaseHandler('monthly');
        } else if (selectedOption === 'lifetime') {
            // Set lifetime as active
            lifetimeOption.classList.remove('unactive');
            lifetimeOption.classList.add('active');
            lifetimeOption.querySelector('i').className = 'fa-solid fa-circle-check';

            // Set monthly as inactive
            monthlyOption.classList.remove('active');
            monthlyOption.classList.add('unactive');
            monthlyOption.querySelector('i').className = 'fa-regular fa-circle';

            // Update purchase button ID for lifetime
            purchaseButton.id = 'paymentButtonLifetime';
            attachPurchaseHandler('lifetime');
        }
    }

    function attachPurchaseHandler(option) {
        const purchaseButton = document.querySelector('.purchase-button');

        purchaseButton.onclick = async () => {
            // Get or create deviceId
            let {
                deviceId
            } = await new Promise(resolve => {
                chrome.storage.local.get(['deviceId'], resolve);
            });
            if (!deviceId) {
                deviceId = generateDeviceId();
                chrome.storage.local.set({
                    deviceId
                });
            }

            try {
                const response = await fetch(`${apiURL}/create-checkout-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        plan: option,
                        deviceId
                    })
                });

                if (response.ok) {
                    const {
                        url,
                        session_id
                    } = await response.json();
                    console.log(`Stripe session created: ${session_id}`);
                    showOnlyPage(pageFive)
                    window.open(url, 'Purchase', 'width=620,height=800,focused:true,left=450, top=50');
                } else {
                    console.log('Failed to create Stripe session.');
                }
            } catch (error) {
                console.log('Error creating Stripe session:', error);
            }
        };
    }

    monthlyOption.addEventListener('click', function () {
        activateOption('monthly');
    });

    lifetimeOption.addEventListener('click', function () {
        activateOption('lifetime');
    });

    activateOption('lifetime');

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'login_successful') {
            console.log('User logged in:', message.email);
            chrome.storage.local.set({
                paid: true
            }, function () {
                updateUI(true);
            });
        }
    });

    chrome.storage.local.get(['paid'], ({ paid }) => {
        const isPaid = paid === true;
        console.log('Initial payment status:', isPaid);
        updateUI(isPaid);
    });

    document.getElementById("manageButton").onclick = async () => {
        // pull email/deviceId out of extension storage
        const { email, deviceId } = await new Promise(r =>
            chrome.storage.local.get(['email', 'deviceId'], r)
        );
        if (!email || !deviceId) {
            return alert('Please log in first before managing your subscription.');
        }

        try {
            // 1) get a manage-page token
            const resp = await fetch(`${apiURL}/api/create-manage-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, deviceId })
            });
            if (!resp.ok) {
                const err = await resp.json();
                return alert('Cannot open Manage page: ' + (err.error || resp.statusText));
            }
            const { token } = await resp.json();

            // 2) open /manage with that token
            const url = `${apiURL}/manage?token=${encodeURIComponent(token)}`;
            const win = window.open(url, 'Manage', 'width=800,height=900,focused=true,left=450, top=50');
            if (!win) {
                return alert('Popup blocked! Please allow popups for this extension.');
            }
        } catch (e) {
            console.error(e);
            alert('Unexpected error opening Manage page.');
        }
    };


    // Function to update the UI based on payment status
    function updateUI(isPaid) {
        const manageButton = document.getElementById("manageButton");

        if (isPaid) {
            manageButton.style.display = "block";
        } else {
            manageButton.style.display = "none";
            document.getElementById('upgradeButtonContainer').style.display = 'none';
        }

        document.getElementById("paymentButton").style.display = isPaid ? "none" : "block";
        document.getElementById("paymentButtonLifetime").style.display = isPaid ? "none" : "block";
        document.getElementById("paymentButtonPlace").style.display = isPaid ? "none" : "block";
        document.getElementById("loginButton").style.display = isPaid ? "none" : "block";
        document.getElementById("paidStatus").innerHTML = isPaid ? "<span class='span-paid' style='color:#52d11c;'>Paid!</span>" : "Unpaid";
        document.getElementById("preDesc").innerHTML = isPaid ? "Pre-Activated Features:" : "Paid Pre-Activated Features:";
        const statusEls = document.querySelectorAll('#statusReader');
        chrome.storage.local.get('privacyGuardEnabled', ({ privacyGuardEnabled = false }) => {
            // “true” only if paid AND privacy guard is enabled
            const showActive = isPaid && privacyGuardEnabled;

            // update both <b id="statusReader">…</b>
            statusEls.forEach(el => el.innerHTML = showActive ? '<i class="fa-solid fa-shield-check"></i>ACTIVATED' : '<i class="fa-regular fa-circle-exclamation"></i>OFF');

            // grey-out (unpaid class) whenever NOT showActive
            document.getElementById('status')
                .classList.toggle('unpaid', !showActive);
        });
        settingsIcon.style.display = isPaid ? "flex" : "none";

        const toggleButton = document.getElementById("toggleButton");
        toggleButton.classList.toggle("unpaid", !isPaid);
        toggleButton.classList.toggle("paid", isPaid);
    }

    document.getElementById('paymentButtonPlace').addEventListener('click', function () {
        showOnlyPage(pageThree);
    });

    document.getElementById('pricing_back').addEventListener('click', function () {
        showOnlyPage(pageOne);
    });

    document.getElementById('manage_back').addEventListener('click', function () {
        showOnlyPage(pageOne);
    });

    settingsIcon.addEventListener("click", () => {
        settingsIcon.classList.add("activated");
        updatesIcon.classList.remove("activated"); // Only one active at a time
    });

    updatesIcon.addEventListener("click", () => {
        updatesIcon.classList.add("activated");
        settingsIcon.classList.remove("activated"); // Only one active at a time
    });

    settingsIcon.addEventListener('click', function () {
        settingsIcon.classList.add('activated');
        if (pageTwo.style.display === 'flex') {
            showOnlyPage(pageOne)
        } else {
            showOnlyPage(pageTwo);
        }
    });

    settingsBackIcon.addEventListener('click', function () {
        showOnlyPage(pageOne);
        settingsIcon.classList.remove('activated');
    });

    updatesIcon.addEventListener('click', function () {
        updatesIcon.classList.add('activated');
        settingsIcon.classList.remove("activated");
        if (pageSeven.style.display === 'flex') {
            showOnlyPage(pageOne);
        } else {
            showOnlyPage(pageSeven);
        }
    });

    document.getElementById('upgradeButton').addEventListener('click', function () {
        showOnlyPage(pageSix);
        settingsIcon.classList.remove('activated');
        updatesIcon.classList.remove("activated");
    });

    const saveAnswersCheckbox = document.getElementById('saveAnswersCheckbox');

    // Load the saved state from chrome.storage.local
    chrome.storage.local.get(['saveCorrectAnswers'], function (result) {
        // Set the checkbox state based on the stored value, default to true
        saveAnswersCheckbox.checked = result.saveCorrectAnswers !== false;
    });

    // Add event listener to save the state when the checkbox is changed
    saveAnswersCheckbox.addEventListener('change', function () {
        const isChecked = saveAnswersCheckbox.checked;
        // Save the state to chrome.storage.local
        chrome.storage.local.set({ saveCorrectAnswers: isChecked }, function () {
            console.log('Save Correct Answers setting updated:', isChecked);
        });
    });

    const showInjectedUICheckbox = document.getElementById('showInjectedUICheckbox');

    // default: true (show UI)
    chrome.storage.local.get({ showInjectedUI: true }, ({ showInjectedUI }) => {
        if (showInjectedUICheckbox) showInjectedUICheckbox.checked = !!showInjectedUI;
    });

    function sendShowInjectedUIToActiveTab(show) {
        withActiveTabId((id) => {
            chrome.tabs.sendMessage(id, { action: 'applyShowInjectedUI', show }, () => void chrome.runtime.lastError);
        });
    }

    if (showInjectedUICheckbox) {
        showInjectedUICheckbox.addEventListener('change', () => {
            const show = showInjectedUICheckbox.checked;
            chrome.storage.local.set({ showInjectedUI: show }, () => {
                // apply immediately on the current page
                sendShowInjectedUIToActiveTab(show);
            });
        });
    }

    const urlInput = document.getElementById('urlInput');
    const urlContainer = document.getElementById('urlContainer');
    const saveUrlsButton = document.getElementById('saveUrls');

    // Load saved URLs and update UI
    chrome.storage.local.get(['blockedUrls'], function (result) {
        if (result.blockedUrls) {
            result.blockedUrls.forEach(addUrlToUI);
        }
    });

    // Save URLs to storage without duplicates
    function saveUrls() {
        const urls = Array.from(new Set(Array.from(urlContainer.children).map(div => div.textContent.trim().replace('×', ''))));
        chrome.storage.local.set({
            blockedUrls: urls
        }, function () {
            console.log('Blocked URLs saved.');
            // Re-run activate to refresh content script registration
            chrome.runtime.sendMessage({
                action: 'updateBlockedUrls'
            });
        });
    }

    // Save URLs when the Save button is clicked
    saveUrlsButton.addEventListener('click', function () {
        addUrlsFromInput();
        saveUrls();
    });

    // Add URL from input and avoid duplicates
    function addUrlsFromInput() {
        const inputUrls = urlInput.value.split(',').map(url => url.trim());
        const existingUrls = Array.from(urlContainer.children).map(div => div.textContent.trim().replace('×', ''));
        const newUrls = inputUrls.filter(url => url.length > 0 && !existingUrls.includes(url));
        newUrls.forEach(addUrlToUI);
        urlInput.value = ''; // Clear input after adding URLs
        saveUrls(); // Save immediately after adding
    }

    // Function to add a URL to the UI
    function addUrlToUI(url) {
        if (!url) return;
        const urlContainerDiv = document.createElement('div');
        urlContainerDiv.className = 'url-container';

        const urlDiv = document.createElement('div');
        urlDiv.className = 'url-item';
        urlDiv.textContent = url;

        const removeButton = document.createElement('i');
        removeButton.className = 'fa-solid fa-xmark-large remove-url';
        removeButton.onclick = function () {
            urlContainerDiv.remove();
            saveUrls();
        };

        urlDiv.appendChild(removeButton);
        urlContainerDiv.appendChild(urlDiv);
        urlContainer.appendChild(urlContainerDiv);
    }

    // Add event listener for 'Enter' and 'Comma' key presses
    urlInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ',') {
            addUrlsFromInput();
            event.preventDefault(); // Prevent default action for Enter key
        }
    });

    document.getElementById('close-reopen').addEventListener('click', function () {
        window.close();

        chrome.runtime.reload();
    });

    document.getElementById('upgrade_back').addEventListener('click', function () {
        showOnlyPage(pageOne);
    });

    document.getElementById('login_back').addEventListener('click', function () {
        showOnlyPage(pageOne);
    });

    document.getElementById('updates_back').addEventListener('click', function () {
        showOnlyPage(pageOne);
        updatesIcon.classList.remove('activated');
    });

    if (document.getElementById('upgradeButtonContainer')) {
        document.getElementById('upgradeButtonContainer').addEventListener('click', function () {
            showOnlyPage(pageSix);
        });
    }


    const pricingURL = 'https://data.canvashack.com/prices.json';
    const CACHE_KEY = 'pricingCache:v1';
    const TTL_MS = 3 * 60 * 60 * 1000; // 3h

    initPricing();

    function initPricing() {
        const cached = loadCached();
        if (cached) applyPricing(cached);   // instant paint
        refreshPricing();                   // then update in background
    }

    function loadCached() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const { ts, data } = JSON.parse(raw);
            if (!ts || !data) return null;
            if (Date.now() - ts > TTL_MS) return null;
            return data;
        } catch { return null; }
    }

    async function refreshPricing() {
        try {
            const res = await fetch(pricingURL, { cache: 'no-cache' });
            if (!res.ok) throw new Error(`Bad status ${res.status}`);
            const data = await res.json();

            const prev = loadCached();
            if (!deepEqual(prev, data)) {
                applyPricing(data);
                localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
            }
        } catch (e) {
            console.log('pricing refresh failed:', e);
        }
    }

    function deepEqual(a, b) { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; } }
    function toNum(v) { if (typeof v === 'number') return v; const n = parseFloat(v); return Number.isFinite(n) ? n : null; }
    function fmt(v) { const n = toNum(v); if (n == null) return ''; return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; }

    function applyPricing(p) {
        const monthlyOriginal = p?.monthly?.original ?? p?.monthly?.[0];
        const monthlyDiscounted = p?.monthly?.discounted ?? p?.monthly?.[1];
        const oneTimeOriginal = p?.oneTime?.original ?? p?.oneTime?.[0];
        const oneTimeDiscounted = p?.oneTime?.discounted ?? p?.oneTime?.[1];

        // main cards
        const moOrigEl = document.querySelector('.monthly .original-price');
        const moDiscEl = document.querySelector('.monthly .discounted-price');
        const ltOrigEl = document.querySelector('.lifetime .original-price');
        const ltDiscEl = document.querySelector('.lifetime .discounted-price');

        if (moOrigEl) moOrigEl.textContent = fmt(monthlyOriginal);
        if (moDiscEl) moDiscEl.textContent = fmt(monthlyDiscounted);
        if (ltOrigEl) ltOrigEl.textContent = fmt(oneTimeOriginal);
        if (ltDiscEl) ltDiscEl.textContent = fmt(oneTimeDiscounted);

        // mirrored spans you showed in HTML
        const lifetimeOriginalElem = document.querySelector('.lifetimeOriginalPrice');
        const lifetimeDiscountedElem = document.querySelector('.lifetimeDiscountedPrice');
        if (lifetimeOriginalElem) lifetimeOriginalElem.textContent = fmt(oneTimeOriginal);
        if (lifetimeDiscountedElem) lifetimeDiscountedElem.textContent = fmt(oneTimeDiscounted);

        // save text
        const saveEl = document.querySelector('.pricing-option.lifetime h6.right')
            || document.querySelector('.pricing-option.lifetime h6.cool');
        if (saveEl) {
            const jsonSaveText = p?.oneTime?.saveText ?? p?.saveText;
            const jsonSaveAmount = p?.oneTime?.saveAmount ?? p?.saveAmount;
            if (typeof jsonSaveText === 'string' && jsonSaveText.trim()) {
                saveEl.textContent = jsonSaveText.trim();
            } else if (typeof jsonSaveAmount === 'number') {
                saveEl.textContent = `Save ${fmt(jsonSaveAmount)}`;
            } else {
                const o = toNum(oneTimeOriginal), d = toNum(oneTimeDiscounted);
                if (o != null && d != null && o >= d) saveEl.textContent = `Save ${fmt(o - d)}`;
            }
        }

        // launch offer (optional)
        const launchEl = document.querySelector('.launch-offer');
        if (launchEl) {
            const prefix = p?.launchOffer?.prefix ?? 'Launch Offer:';
            const highlight = p?.launchOffer?.highlight ?? '';
            launchEl.textContent = '';
            launchEl.append(document.createTextNode(prefix + ' '));
            const span = document.createElement('span');
            span.textContent = highlight;
            launchEl.append(span);
        }
    }

    chrome.storage.local.get('showPurchasePage', function (result) {
        if (result.showPurchasePage) {
            showOnlyPage(pageThree);

            chrome.storage.local.set({
                showPurchasePage: false
            });
        }
    });

    chrome.storage.local.get('showSettingsPage', function (result) {
        if (result.showSettingsPage) {
            showOnlyPage(pageTwo);
            const settingsIconEl = document.getElementById("settings_icon");
            if (settingsIconEl) settingsIconEl.classList.add('activated');
            chrome.storage.local.set({ showSettingsPage: false });
        }
    });

    const updatesDiv = document.getElementById('updates_content'); // Select the updates content div
    const importantAlertIcon = document.getElementById("important_alert_icon");

    fetch('https://data.canvashack.com/updates.json')
        .then(response => response.json())
        .then(data => {
            let hasImportant = false;
            let latestUpdateDate = null;

            // 1. Helper to format "YYYY-MM-DD" → "Month DD, YYYY"
            function formatDate(dateString) {
                const opts = { year: 'numeric', month: 'long', day: 'numeric' };
                return new Date(dateString).toLocaleDateString('en-US', opts);
            }

            // 2. Calculate days ago
            function calculateDaysAgo(dateString) {
                const updateDate = new Date(dateString);
                const currentDate = new Date();
                const msPerDay = 1000 * 60 * 60 * 24;
                return Math.floor((currentDate - updateDate) / msPerDay);
            }

            // Build content
            let content = '<div class="announcements-block">';
            data.updates.forEach((update, index) => {
                const daysAgo = calculateDaysAgo(update.date);
                const prettyDate = formatDate(update.date);  // use helper here

                content += `
                    <div class="announcements-box">
                    <h3>${prettyDate}
                        <span class="days-ago">
                        <i class="fa-regular fa-clock"></i>${daysAgo}d ago
                        </span>
                    </h3>
                    <p>🚀 ${update.title}</p>
                    <ul>
                        ${update.details.map(detail => `<li>${detail}</li>`).join('')}
                    </ul>
                    <p class="author">Blazer @ CanvasHack</p>
                    </div>
                `;

                // Check for the latest important update
                if (update.important && index === 0) {
                    hasImportant = true;
                    latestUpdateDate = update.date;
                }
            });
            content += '</div>';

            // Inject the content into the updates container
            updatesDiv.innerHTML = content;

            // Show exclamation icon if there's a new important update
            chrome.storage.local.get(['lastViewedUpdateDate'], function (result) {
                if (hasImportant && result.lastViewedUpdateDate !== latestUpdateDate) {
                    importantAlertIcon.style.display = 'block';
                }
            });

            // Event listener for updates icon to clear alert when viewed
            updatesIcon.addEventListener('click', () => {
                if (hasImportant) {
                    chrome.storage.local.set({
                        lastViewedUpdateDate: latestUpdateDate
                    });
                    importantAlertIcon.style.display = 'none';
                }
            });
        })
        .catch(error => console.log('Error fetching updates:', error));

    document.getElementById("logoutButton").onclick = async () => {
        // Show the logout modal
        document.getElementById("logoutModal").style.display = "flex";
    };

    document.getElementById("logoutModalClose").addEventListener("click", () => {
        document.getElementById("logoutModal").style.display = "none";
    });
    document.getElementById("logoutCancelBtn").addEventListener("click", () => {
        document.getElementById("logoutModal").style.display = "none";
    });

    // If you want clicking the overlay to also close the modal
    document.getElementById("logoutModal").addEventListener("click", (e) => {
        if (e.target.id === "logoutModal") {
            e.currentTarget.style.display = "none";
        }
    });

    document.getElementById("logoutConfirmBtn").addEventListener("click", () => {
        attemptLogout(false);
    });

    async function attemptLogout(hasRetried) {
        try {
            const email = await new Promise(resolve => {
                chrome.storage.local.get(['email'], result => resolve(result.email));
            });
            const deviceId = await new Promise(resolve => {
                chrome.storage.local.get(['deviceId'], result => resolve(result.deviceId));
            });

            if (!email || !deviceId) {
                console.log('No user logged in.');
                showOnlyPage(pageOne);
                document.getElementById("logoutModal").style.display = "none";
                return;
            }

            showOnlyPage(pageOne);
            document.getElementById("logoutModal").style.display = "none";

            const response = await fetch(`${apiURL}/api/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, deviceId })
            });

            if (response.ok) {
                chrome.storage.local.remove(
                    ['email', 'deviceId', 'pendingEmail', 'paid', 'lifetimePaid', 'customerEmail'],
                    () => {
                        updateUI(false);

                        chrome.runtime.sendMessage({ action: 'clearStorage' });
                    }
                );
            } else {
                // If the logout call failed and we haven't retried yet, retry once more silently
                if (!hasRetried) {
                    console.log("Logout failed (status " + response.status + "), retrying...");
                    setTimeout(() => attemptLogout(true), 2000);
                }
            }
        } catch (error) {
            if (!hasRetried) {
                console.log("Error during logout, retrying...", error);
                setTimeout(() => attemptLogout(true), 2000);
            }
        } finally {
            document.getElementById("logoutModal").style.display = "none";
        }
    }

    /*document.getElementById('paymentButtonLifetimeUpgrade').addEventListener('click', () => {
        // Show the autoCharge modal
        document.getElementById("autoChargeModal").style.display = "flex";
    });*/

    document.getElementById("autoChargeModalClose").addEventListener("click", () => {
        document.getElementById("autoChargeModal").style.display = "none";
    });
    document.getElementById("autoChargeCancelBtn").addEventListener("click", () => {
        document.getElementById("autoChargeModal").style.display = "none";
    });

    // Overlay click => close
    document.getElementById("autoChargeModal").addEventListener("click", (e) => {
        if (e.target.id === "autoChargeModal") {
            e.currentTarget.style.display = "none";
        }
    });

    // Confirm auto-charge => same logic as before
    document.getElementById("autoChargeConfirmBtn").addEventListener("click", async function () {
        try {
            const {
                email,
                deviceId
            } = await new Promise((resolve, reject) => {
                chrome.storage.local.get(['email', 'deviceId'], function (result) {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });

            if (!email || !deviceId) {
                console.log('Unable to retrieve email or device information. Please try again.');
                document.getElementById("autoChargeModal").style.display = "none";
                return;
            }

            showOnlyPage(pageFive);
            document.getElementById("autoChargeModal").style.display = "none";

            // For auto-charge, force_checkout is false
            const forceCheckout = false;

            // Send the upgrade request to your backend
            const response = await fetch(`${apiURL}/api/upgrade-to-lifetime`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    deviceId,
                    force_checkout: forceCheckout
                })
            });

            const result = await response.json();

            if (response.ok) {
                showOnlyPage(pageFive);
            } else {
                alert(`Error: ${result.error || 'An error occurred while processing your request.'}`);
                showOnlyPage(pageSix);
            }
        } catch (error) {
            console.error('Error upgrading to lifetime:', error);
            alert('An unexpected error occurred. Please try again later.');
        }

        // Hide the modal once done
        document.getElementById("autoChargeModal").style.display = "none";
    });

    // Manual payment method handler: "Change Payment Method"
    document.getElementById('paymentButtonLifetimeUpgradeCPM').addEventListener('click', async function () {
        try {
            // Retrieve email and deviceId from chrome.storage.local
            const {
                email,
                deviceId
            } = await new Promise((resolve, reject) => {
                chrome.storage.local.get(['email', 'deviceId'], function (result) {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });

            if (!email || !deviceId) {
                alert('Unable to retrieve email or device information. Please try again.');
                return;
            }

            showOnlyPage(pageFive);
            document.getElementById("autoChargeModal").style.display = "none";

            // For manual payment method, always force checkout
            const forceCheckout = true;

            // Send the upgrade request to your backend with force_checkout true
            const response = await fetch(`${apiURL}/api/upgrade-to-lifetime`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    deviceId,
                    force_checkout: forceCheckout
                })
            });

            const result = await response.json();

            if (response.ok) {
                // For manual flow, open the Stripe checkout session in a new window
                if (result.session_id) {
                    window.open(result.url, 'Purchase', 'width=620,height=800,focused:true,left=450, top=50');
                } else if (result.url) {
                    window.location.href = result.url;
                } else {
                    alert('Upgrade initiated successfully, but no redirect URL was provided. Please refresh the extension.');
                }
            } else {
                alert(`Error: ${result.error || 'An error occurred while processing your request.'}`);
                showOnlyPage(pageSix);
            }
        } catch (error) {
            console.error('Error upgrading to lifetime (manual):', error);
            alert('An unexpected error occurred. Please try again later.');
        }
    });

    var downArrow = document.getElementById('down-arrow');
    var reviewColumn = document.querySelector('.review-column');
    var scrollInterval; // Variable to store the interval ID

    // Function to start scrolling
    function startScrolling() {
        clearInterval(scrollInterval); // Clear any existing intervals
        scrollInterval = setInterval(function () {
            reviewColumn.scrollBy({
                top: 10, // Adjust scroll amount
                left: 0,
                behavior: 'smooth'
            });
        }, 8); // Adjust interval duration
    }

    // Function to stop scrolling
    function stopScrolling() {
        clearInterval(scrollInterval);
    }

    downArrow.addEventListener('click', function () {
        // Scroll the review column down by 50 pixels
        reviewColumn.scrollBy({
            top: 140, // Scroll down 50 pixels
            left: 0,
            behavior: 'smooth' // Optional: Smooth scrolling effect
        });
    });

    // Event listeners for mouse events
    downArrow.addEventListener('mousedown', startScrolling);
    downArrow.addEventListener('mouseup', stopScrolling);
    downArrow.addEventListener('mouseleave', stopScrolling);

    // Event listeners for touch events (mobile devices)
    downArrow.addEventListener('touchstart', function (e) {
        e.preventDefault();
        startScrolling();
    });
    downArrow.addEventListener('touchend', stopScrolling);

    const featureData = {
        save: {
            title: "Save & Auto-Fill",
            text: `
      On quiz load, CanvasHack pulls down your entire submission history via the Canvas API, finds the highest-scoring attempt for each question
      (including on your <strong>second</strong> and subsequent tries), and - when you hover over a question - auto-fills that "best" answer for you.<br><br>
      <em>This feature is automatically enabled with your subscription</em> and can be toggled off in Settings under
      <span class="setting-name">"Save Correct Answers"</span>.
    `
        },
        privacy: {
            title: "Privacy Mode",
            text: `
      CanvasHack hijacks and overrides the browser's focus/visibility APIs and blocks Canvas's event listeners for
      focus, blur, visibilitychange, fullscreen, pagehide/pageshow, etc.<br><br>
      No matter how many times you switch tabs or windows, Canvas always thinks you stayed
      "on task" in the quiz tab.<br><br>
      <strong>Privacy Mode is 100% always on while your subscription is active</strong> - there's no way for Canvas to detect you leaving the testing page.
    `
        },
        kiosk: {
            title: "Kiosk Mode",
            text: `
       If your instructor makes you log out and launch Canvas's Kiosk App, just flip on Kiosk Mode in CanvasHack. 
      We inject a fake Kiosk banner right into your normal Canvas session so Canvas thinks you're inside the official Kiosk App-while you stay in your browser and can still use all CanvasHack features.<br><br>
      <em>Disabled by default</em>; enable it in Settings under 
      <span class="setting-name">"Kiosk Mode"</span>.
    `
        }
    };



    const modalOverlay = id => document.getElementById(id);

    // Open when you click a feature heading
    document.querySelectorAll('[data-feature]').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
            const key = el.getAttribute('data-feature');
            const { title, text } = featureData[key];
            document.getElementById('featureDetailTitle').textContent = title;
            document.getElementById('featureDetailText').innerHTML = featureData[key].text
            modalOverlay('featureDetailModal').style.display = 'flex';
        });
    });

    // Close button
    document.getElementById('featureDetailClose').addEventListener('click', () => {
        modalOverlay('featureDetailModal').style.display = 'none';
    });

    document.getElementById('featureDetailCloseBtn').addEventListener('click', () => {
        modalOverlay('featureDetailModal').style.display = 'none';
    });

    // Click outside to close
    modalOverlay('featureDetailModal').addEventListener('click', e => {
        if (e.target === modalOverlay('featureDetailModal')) {
            modalOverlay('featureDetailModal').style.display = 'none';
        }
    });

    /*const getHelp = document.querySelector('.get-help');
    const closeBtn = document.querySelector('.close-get-help');

    // 1) Check extension storage to see if we should hide it
    chrome.storage.local.get('hideGetHelp', ({ hideGetHelp }) => {
        if (hideGetHelp) {
            getHelp.style.display = 'none';
        } else {
            // 2) If not hidden, wire up the close button
            closeBtn.addEventListener('click', () => {
                getHelp.style.display = 'none';
                chrome.storage.local.set({ hideGetHelp: true });
            });
        }
    });*/

    // Grab the feature containers & status elements
    const asF = document.getElementById('feature-status-as').parentElement;
    const asS = document.getElementById('feature-status-as');
    const pgF = document.getElementById('feature-status-pg').parentElement;
    const pgS = document.getElementById('feature-status-pg');
    const ksF = document.getElementById('feature-ks');
    const ksS = document.getElementById('feature-status-ks');
    const cb = document.getElementById('saveAnswersCheckbox');
    const st = document.getElementById('status');
    const statusEls = document.querySelectorAll('#statusReader');

    function setAS(on) {
        asF.dataset.status = on ? 'on' : 'off';
        asS.textContent = on ? 'Activated' : 'Off';
        cb.checked = on;
        // toggle styling class:
        asF.classList.toggle('unpaid', !on);
        chrome.storage.local.set({ saveCorrectAnswers: on });
    }

    function setPG(on) {
        pgF.dataset.status = on ? 'on' : 'off';
        pgS.textContent = on ? 'Activated' : 'Deactivated';
        st.classList.toggle('unpaid', !on);
        statusEls.forEach(el => el.innerHTML = on ? '<i class="fa-solid fa-shield-check"></i>ACTIVATED' : '<i class="fa-regular fa-circle-exclamation"></i>OFF');
        pgF.classList.toggle('unpaid', !on);
        chrome.storage.local.set({ privacyGuardEnabled: on });
        withActiveTabId((id) => {
            chrome.tabs.sendMessage(id, { action: on ? 'enablePrivacyGuard' : 'disablePrivacyGuard' }, () => void chrome.runtime.lastError);
        });
    }

    function setKS(on) {
        // 1) Just update the UI
        ksF.dataset.status = on ? 'on' : 'off';
        ksS.textContent = on ? 'Injected' : 'Uninjected';
        ksF.classList.toggle('unpaid', !on);
    }

    // 2) A separate helper that *does* send the message
    function sendKS(on) {
        const action = on ? 'toggleBar' : 'removeBar';
        withActiveTabId((id) => {
            chrome.tabs.sendMessage(id, { action }, () => void chrome.runtime.lastError);
        });
    }

    // 1) Load ‘paid’ and feature flags from storage
    const { paid = false } = await new Promise(r =>
        chrome.storage.local.get('paid', r)
    );
    const isPaid = paid === true;

    const {
        saveCorrectAnswers = true,
        privacyGuardEnabled = true
    } = await new Promise(r =>
        chrome.storage.local.get(
            ['saveCorrectAnswers', 'privacyGuardEnabled'],
            r
        )
    );

    // 3) Now fetch the real per‑tab kiosk state:
    if (paid) {
        withActiveTabId((id) => {
            chrome.tabs.sendMessage(id, { action: 'isInjected' }, (resp) => {
                void chrome.runtime.lastError; // swallow "no receiver" on disallowed pages
                const injected = resp && typeof resp.injected === 'boolean' ? resp.injected : false;
                setKS(injected);
            });
        });

    }

    function refreshKioskState() {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            if (!tab || !tab.url.startsWith('http')) return;
            chrome.tabs.sendMessage(
                tab.id,
                { action: 'isInjected' },
                resp => {
                    const injected = resp?.injected === true;
                    setKS(injected);
                }
            );
        });
    }

    // 2) If unpaid, force everything off + grey‑out; otherwise restore saved settings
    if (!isPaid) {
        setAS(false);
        setPG(false);
        setKS(false);
        [asF, pgF, ksF].forEach(el => el.classList.add('unpaid'));
    } else {
        setAS(saveCorrectAnswers);
        setPG(privacyGuardEnabled);

        refreshKioskState();
    }

    // 4) Wire up clicks only if paid
    if (isPaid) {
        asF.addEventListener('click', () => setAS(!cb.checked));
        pgF.addEventListener('click', () => {
            // turning off privacy needs confirmation
            if (pgF.dataset.status === 'on') {
                document.getElementById('confirmDisablePrivacyModal').style.display = 'flex';
            } else {
                setPG(true);
            }
        });
        ksF.addEventListener('click', () => {
            const shouldInject = ksF.dataset.status === 'off';
            // 1) send the actual toggle request
            sendKS(shouldInject);
            // 2) update the UI immediately
            setKS(shouldInject);
        });
    }

    // 5) Handle the confirm/close buttons for privacy‑off
    document.getElementById('confirmDisableClose').onclick = () =>
        document.getElementById('confirmDisablePrivacyModal').style.display = 'none';
    document.getElementById('cancelDisablePrivacy').onclick = () =>
        document.getElementById('confirmDisablePrivacyModal').style.display = 'none';
    document.getElementById('confirmDisablePrivacy').onclick = () => {
        setPG(false);
        document.getElementById('confirmDisablePrivacyModal').style.display = 'none';
    };

    // 6) React to login_successful and clearStorage messages
    chrome.runtime.onMessage.addListener(message => {
        if (message.action === 'login_successful') {
            // flip both sav­er & privacy on right after login
            setAS(true);
            setPG(true);
        }
        if (message.action === 'clearStorage') {
            setAS(false);
            setPG(false);
            setKS(false);
        }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.paid?.newValue === true) {
            // ensure both features turn on
            setAS(true);
            setPG(true);
        }
    });

    // === Unpaid feature: delegated click -> pageThree; custom hover tooltip ===
    (() => {
        // run the unpaid guard only if NOT paid
        const go = (paidVal) => {
            const isPaid = paidVal === true || paidVal === 'true';
            if (isPaid) return; // ✅ paid: do nothing

            const TIP_TEXT = 'Paid feature — purchase to unlock';
            const container = document.querySelector('.features');
            if (!container) return;

            // tooltip
            const tip = document.createElement('div');
            Object.assign(tip.style, {
                position: 'fixed',
                top: '0px',
                left: '0px',
                padding: '5px 10px',
                maxWidth: '260px',
                fontSize: '12.5px',
                lineHeight: '1.25',
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                color: '#fff',
                background: 'rgba(24, 24, 24, 0.95)',
                outline: 'rgb(34, 34, 34) dashed 2px',
                borderRadius: '16px',
                boxShadow: '0 0 24px rgba(0,0,0,0.35), inset 0 0 10px #0a0a0aff',
                pointerEvents: 'none',
                zIndex: '9997',
                opacity: '0',
                transform: 'translate(-9999px,-9999px)',
                transition: 'opacity .12s ease'
            });
            const HILITE = '<span style="color:rgb(82, 209, 28);font-weight:600">purchase</span>';
            tip.innerHTML = TIP_TEXT.replace(/purchase/i, HILITE);
            document.body.appendChild(tip);

            // make unpaid cards feel disabled
            container.querySelectorAll('.feature.unpaid').forEach(el => {
                el.style.cursor = 'not-allowed';
            });

            // click -> go to pageThree
            container.addEventListener('click', (e) => {
                const card = e.target.closest('.feature.unpaid');
                if (!card) return;
                e.preventDefault();
                e.stopPropagation();
                if (typeof showOnlyPage === 'function' && typeof pageThree !== 'undefined' && pageThree) {
                    showOnlyPage(pageThree);
                }
            });

            // tooltip below cursor, centered
            let activeCard = null;
            const positionTip = (clientX, clientY) => {
                const pad = 10, offsetY = 18;
                tip.style.transform = 'none';
                const rect = tip.getBoundingClientRect();
                let x = clientX - rect.width / 2;
                let y = clientY + offsetY;
                const vw = window.innerWidth, vh = window.innerHeight;
                if (x < pad) x = pad;
                if (x + rect.width + pad > vw) x = vw - rect.width - pad;
                if (y + rect.height + pad > vh) y = clientY - rect.height - offsetY;
                tip.style.left = Math.round(x) + 'px';
                tip.style.top = Math.round(y) + 'px';
            };

            container.addEventListener('pointerover', (e) => {
                const card = e.target.closest('.feature.unpaid');
                if (!card || activeCard) return;
                activeCard = card;
                const msg = card.getAttribute('data-tip') || TIP_TEXT;
                tip.innerHTML = msg.replace(/purchase/i, HILITE);
                tip.style.opacity = '1';
                positionTip(e.clientX, e.clientY);
            });

            container.addEventListener('pointermove', (e) => {
                if (!activeCard) return;
                positionTip(e.clientX, e.clientY);
            });

            container.addEventListener('pointerout', (e) => {
                if (!activeCard) return;
                const to = e.relatedTarget && e.relatedTarget.closest('.feature.unpaid');
                if (!to || to !== activeCard) {
                    activeCard = null;
                    tip.style.opacity = '0';
                    tip.style.transform = 'translate(-9999px,-9999px)';
                }
            });
        };

        // read paid from extension storage (only 'true' means paid)
        try {
            if (chrome?.storage?.local) {
                chrome.storage.local.get({ paid: null }, (res) => go(res.paid));
            } else {
                go(null); // no storage -> treat as unpaid
            }
        } catch {
            go(null);
        }
    })();


    (function initStepperJS() {
        const container = document.querySelector('#step-container');
        if (!container) return;

        const steps = Array.from(container.querySelectorAll('.step'));
        const fill = container.querySelector('.progress-fill');

        // visual spec from your old code: start bar at 25%
        const PROGRESS_START = 25;
        const PROGRESS_END = 100;

        // remember each step's natural display so we can hide/show via JS only
        steps.forEach(s => {
            if (!s.dataset._origDisplay) {
                const cs = getComputedStyle(s);
                s.dataset._origDisplay = (cs.display && cs.display !== 'none') ? cs.display : 'block';
            }
        });

        // add Back buttons (reuse your .next-btn styling if you have it)
        steps.forEach((step, i) => {
            const bar = step.querySelector('.bot-but-con');
            if (!bar) return;

            if (!step.querySelector('.back-btn')) {
                const back = document.createElement('button');
                back.type = 'button';
                back.className = 'next-btn back-btn'; // keeps your existing button styles
                back.innerHTML = '<i class="fa-solid fa-arrow-left"></i>';
                bar.prepend(back);
            }
            step.querySelector('.back-btn').disabled = (i === 0); // disable Back on first step
        });

        // pick initial step: first .active, else 0
        let idx = steps.findIndex(s => s.classList.contains('active'));
        if (idx < 0) idx = 0;
        show(idx);

        function show(i) {
            // hide all
            steps.forEach(s => {
                s.classList.remove('active');
                s.style.display = 'none';
            });

            // show target
            const s = steps[i];
            if (!s) return;
            s.classList.add('active');
            s.style.display = s.dataset._origDisplay || 'block';

            // back button state
            const back = s.querySelector('.back-btn');
            if (back) back.disabled = (i === 0);

            // progress (25% → 100%)
            if (fill) {
                const span = PROGRESS_END - PROGRESS_START;
                const pct = steps.length > 1
                    ? PROGRESS_START + (i / (steps.length - 1)) * span
                    : PROGRESS_END;
                fill.style.width = pct + '%';
            }

            idx = i;
        }

        // Intercept clicks at capture phase to neutralize any old .next-btn listeners
        container.addEventListener('click', (e) => {
            const back = e.target.closest('.back-btn');
            const next = e.target.closest('.next-btn');
            if (!back && !next) return;

            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();

            if (back && idx > 0) {
                show(idx - 1);
                return;
            }

            if (next) {
                if (idx < steps.length - 1) {
                    show(idx + 1);
                } else {
                    // finished
                    localStorage.setItem('tutorialCompleted', 'true');
                    container.style.display = 'none';
                }
            }
        }, true);

        // respect persisted completion flag
        if (!localStorage.getItem('tutorialCompleted')) {
            // show container (keep your layout: use flex if it was flex before)
            const wasHidden = getComputedStyle(container).display === 'none';
            container.style.display = wasHidden ? 'flex' : container.style.display;
        } else {
            container.style.display = 'none';
        }
    })();

    const injectedUINudgeModal = document.getElementById('injectedUINudgeModal');
    const injectedUINudgeClose = document.getElementById('injectedUINudgeClose');
    const keepToolbarBtn = document.getElementById('keepToolbarBtn');
    const hideToolbarBtn = document.getElementById('hideToolbarBtn');

    function showInjectedUINudge() {
        if (!injectedUINudgeModal) return;
        injectedUINudgeModal.style.display = 'flex';
    }
    function closeInjectedUINudge() {
        if (!injectedUINudgeModal) return;
        injectedUINudgeModal.style.display = 'none';
    }

    function applyShowInjectedUISetting(show) {
        chrome.storage.local.set({ showInjectedUI: !!show, injectedUINudgeShown: true }, () => {
            // mirror into the Settings switch
            const checkbox = document.getElementById('showInjectedUICheckbox');
            if (checkbox) checkbox.checked = !!show;

            // apply on the active tab right away
            withActiveTabId((id) => {
                chrome.tabs.sendMessage(
                    id,
                    { action: 'applyShowInjectedUI', show: !!show },
                    () => void chrome.runtime.lastError
                );
            });

            // optional: take them to Settings so they know where it lives
            try {
            } catch (_) { }

            closeInjectedUINudge();
        });
    }

    injectedUINudgeClose?.addEventListener('click', () => {
        chrome.storage.local.set({ injectedUINudgeShown: true });
        closeInjectedUINudge();
    });
    keepToolbarBtn?.addEventListener('click', () => applyShowInjectedUISetting(true));
    hideToolbarBtn?.addEventListener('click', () => applyShowInjectedUISetting(false));

    // Show after tutorial finishes (one time)
    document.getElementById('finish-btn')?.addEventListener('click', () => {
        chrome.storage.local.get({ injectedUINudgeShown: false }, ({ injectedUINudgeShown }) => {
            if (!injectedUINudgeShown) setTimeout(showInjectedUINudge, 250);
        });
    });

    // Safety: if the tutorial is already done but the nudge never showed, surface it once on load
    chrome.storage.local.get({ injectedUINudgeShown: false }, ({ injectedUINudgeShown }) => {
        const tutVisible = document.getElementById('step-container')?.style?.display !== 'none';
        if (!injectedUINudgeShown && !tutVisible) {
            setTimeout(showInjectedUINudge, 500);
        }
    });

    document.querySelectorAll('#injectedUINudgeGallery img').forEach(img => {
        img.addEventListener('click', () => {
            const overlay = document.createElement('div');
            overlay.className = 'image-expand-overlay fade-in';

            const bigImg = document.createElement('img');
            bigImg.src = img.src;
            overlay.appendChild(bigImg);

            overlay.addEventListener('click', () => overlay.remove());

            document.body.appendChild(overlay);
        });
    });
});