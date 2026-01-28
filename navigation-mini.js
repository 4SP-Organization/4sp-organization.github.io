/**
 * navigation-mini.js
 * * A lightweight navigation script focused on Authentication.
 * * Pinning, Theming, and extra redirects have been removed.
 */

// =========================================================================
// >> ACTION REQUIRED: PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE <<
// =========================================================================
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAZBKAckVa4IMvJGjcyndZx6Y1XD52lgro",
    authDomain: "project-zirconium.firebaseapp.com",
    projectId: "project-zirconium",
    storageBucket: "project-zirconium.firebasestorage.app",
    messagingSenderId: "1096564243475",
    appId: "1:1096564243475:web:6d0956a70125eeea1ad3e6",
    measurementId: "G-1D4F692C1Q"
};
// =========================================================================

const PRIVILEGED_EMAIL = '4simpleproblems@gmail.com'; 

let auth;
let db;

(function() {
    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    const loadCSS = (href) => {
        return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            document.head.appendChild(link);
        });
    };
    
    const hexToRgb = (hex) => {
        if (!hex || typeof hex !== 'string') return null;
        let c = hex.substring(1); 
        if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
        if (c.length !== 6) return null;
        const num = parseInt(c, 16);
        return { r: (num >> 16) & 0xFF, g: (num >> 8) & 0xFF, b: (num >> 0) & 0xFF };
    };

    const getLuminance = (rgb) => {
        if (!rgb) return 0;
        const a = [rgb.r, rgb.g, rgb.b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const getLetterAvatarTextColor = (gradientBg) => {
        if (!gradientBg) return '#FFFFFF'; 
        const match = gradientBg.match(/#([0-9a-fA-F]{3}){1,2}/);
        const firstHexColor = match ? match[0] : null;
        if (!firstHexColor) return '#FFFFFF'; 
        const rgb = hexToRgb(firstHexColor);
        if (!rgb) return '#FFFFFF';
        if (getLuminance(rgb) > 0.5) { 
            const darkenFactor = 0.5; 
            return `#${((1 << 24) + (Math.floor(rgb.r * darkenFactor) << 16) + (Math.floor(rgb.g * darkenFactor) << 8) + Math.floor(rgb.b * darkenFactor)).toString(16).slice(1)}`;
        }
        return '#FFFFFF';
    };

    const run = async () => {
        if (!document.getElementById('navbar-container')) {
            const navbarDiv = document.createElement('div');
            navbarDiv.id = 'navbar-container';
            document.body.prepend(navbarDiv);
        }
        
        if (!document.getElementById('notification-container')) {
            const notifDiv = document.createElement('div');
            notifDiv.id = 'notification-container';
            document.body.appendChild(notifDiv);
        }
        
        injectStyles();

        const container = document.getElementById('navbar-container');
        
        // --- Structure (Mini) ---
        container.innerHTML = `
            <a href="/" class="flex items-center space-x-2 flex-shrink-0 overflow-hidden relative" style="z-index: 20;">
                <img src="/images/logo.png" alt="4SP Logo" class="navbar-logo" id="navbar-logo">
            </a>
            <div id="auth-controls-wrapper" class="auth-controls-wrapper" style="z-index: 20;">
                <div class="auth-toggle-placeholder"></div>
            </div>
        `;

        await loadCSS("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css");
        
        try {
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js");
            initializeApp(FIREBASE_CONFIG);
        } catch (error) {
            console.error("Failed to load core Firebase SDKs:", error);
            renderNavbar(null, null, false);
        }
    };

    const injectStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            /* Base Styles */
            body { padding-top: 64px !important; }
            
            /* --- Navbar Styles (Hardcoded Dark Theme) --- */
            #navbar-container {
                position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important;
                z-index: 9999 !important;
                background: #000000 !important;
                backdrop-filter: blur(12px) !important;
                -webkit-backdrop-filter: blur(12px) !important;
                border-bottom: 1px solid rgb(31 41 55) !important;
                height: 64px !important; width: 100% !important;
                display: flex !important; align-items: center !important; justify-content: space-between !important;
                padding: 0 1rem !important; box-sizing: border-box !important;
                overflow: visible !important;
            }

            #navbar-container > * { position: relative; z-index: 10; }
            .navbar-logo { height: 40px; width: auto; }

            /* --- Auth / Menu Styles --- */
            .auth-controls-wrapper { display: flex; align-items: center; gap: 1rem; position: relative; }
            
            .initial-avatar {
                background: linear-gradient(135deg, #374151 0%, #111827 100%);
                font-family: sans-serif; text-transform: uppercase; display: flex; align-items: center; justify-content: center; color: white;
            }
            #auth-toggle {
                border-color: #4b5563; transition: border-color 0.3s ease;
                border-radius: 14px; border-width: 1px; width: 40px; height: 40px;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; position: relative;
            }
            #auth-toggle:hover { z-index: 50; }

            .auth-menu-container {
                position: absolute; right: 0; top: 55px; width: 16rem;
                background: #000000;
                border: 1px solid rgb(55 65 81);
                border-radius: 1.25rem; padding: 0.75rem;
                display: flex; flex-direction: column; gap: 0.5rem;
                box-shadow: 0 10px 30px rgba(0,0,0,0.6);
                transition: transform 0.2s ease-out, opacity 0.2s ease-out;
                transform-origin: top right; z-index: 10000;
            }
            .auth-menu-container .border-b { border-color: #374151 !important; }
            .auth-menu-username { color: #ffffff; text-align: left !important; margin: 0 !important; font-weight: 400 !important; }
            .auth-menu-email { color: #9ca3af; text-align: left !important; margin: 0 !important; font-weight: 400 !important; }
            
            @keyframes menu-pop-in {
                0% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                70% { transform: translateY(2px) scale(1.01); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes menu-pop-out {
                0% { opacity: 1; transform: translateY(0) scale(1); }
                100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
            }

            .auth-menu-container.open { display: flex !important; animation: menu-pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            .auth-menu-container.closing { display: flex !important; animation: menu-pop-out 0.3s ease-in forwards; pointer-events: none; }
            .auth-menu-container.closed { opacity: 0; pointer-events: none; transform: translateY(-10px) scale(0.95); display: none !important; }

            .auth-menu-link, .auth-menu-button { 
                display: flex; align-items: center; gap: 0.75rem; width: 100%; text-align: left; 
                padding: 0.75rem 1rem; font-size: 0.9rem; color: #d1d5db; 
                background: rgba(79, 70, 229, 0.05);
                border-radius: 1rem; transition: all 0.2s ease; cursor: pointer;
                border: 1px solid rgba(79, 70, 229, 0.05);
                margin-bottom: 0; 
            }
            .auth-menu-link:hover, .auth-menu-button:hover { 
                background-color: rgba(79, 70, 229, 0.05); 
                border-color: #4f46e5;
                color: #ffffff;
                transform: translateY(-2px) scale(1.02);
            }

            .logged-out-auth-toggle { 
                background: #010101; border: 1px solid #374151; 
                border-radius: 14px; 
            }
            .logged-out-auth-toggle i { color: #DADADA; }
            .auth-menu-link i.w-4, .auth-menu-button i.w-4 { width: 1rem; text-align: center; } 

            .marquee-container { overflow: hidden; white-space: nowrap; position: relative; max-width: 100%; }
            .marquee-container.active { mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); }
            .marquee-content { display: inline-block; white-space: nowrap; }
            .marquee-container.active .marquee-content { animation: marquee 10s linear infinite; min-width: 100%; }
            @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

            /* Notifications */
            #notification-container {
                position: fixed; bottom: 2rem; right: 2rem; display: flex; flex-direction: column; gap: 0.75rem; z-index: 20000; pointer-events: none;
            }
            .notification-toast {
                background-color: #0a0a0a; border: 1px solid #333; border-radius: 14px;
                padding: 0.75rem 1.25rem; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem;
                min-width: 200px; transform: translateX(120%);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease, background-color 0.2s;
                opacity: 0; pointer-events: auto; cursor: default;
            }
            .notification-toast.show { transform: translateX(0); opacity: 1; }
            .notification-toast.show:hover {
                transform: scale(1.02) translateX(-5px); background-color: #151515;
                border-color: #555; box-shadow: 0 8px 25px rgba(0,0,0,0.7);
            }
        `;
        document.head.appendChild(style);
    };

    const initializeApp = (firebaseConfig) => {
        if (!document.getElementById('navbar-container')) {
            const navbarDiv = document.createElement('div');
            navbarDiv.id = 'navbar-container';
            document.body.prepend(navbarDiv);
        }
        
        injectStyles();

        const app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        let currentUser = null;
        let currentUserData = null;
        let currentIsPrivileged = false;
        let globalClickListenerAdded = false;
        let authCheckCompleted = false; 

        const getAuthControlsHtml = () => {
            const user = currentUser;
            const userData = currentUserData;

            // Shared Links
            const menuLinks = `
                <a href="/" class="auth-menu-link"><i class="fa-solid fa-house w-4"></i>Home</a>
                <a href="../4sp_history.html" class="auth-menu-link"><i class="fa-solid fa-clock-rotate-left w-4"></i>4SP History</a>
                <a href="../legal.html" class="auth-menu-link"><i class="fa-solid fa-gavel w-4"></i>Terms & Policies</a>
                <a href="https://buymeacoffee.com/4simpleproblems" class="auth-menu-link" target="_blank"><i class="fa-solid fa-mug-hot w-4"></i>Donate</a>
            `;

            const loggedOutView = `
                <div id="auth-button-container" class="relative flex-shrink-0 flex items-center">
                    <button id="auth-toggle" class="w-10 h-10 border flex items-center justify-center hover:bg-gray-700 transition logged-out-auth-toggle">
                        <i class="fa-solid fa-user"></i>
                    </button>
                    <div id="auth-menu-container" class="auth-menu-container closed" style="width: 16rem;">
                        ${menuLinks}
                    </div>
                </div>
            `;

            const loggedInView = (user, userData) => {
                const username = userData?.username || user.displayName || 'User';
                const email = user.email || 'No email';
                const initial = (userData?.letterAvatarText || username.charAt(0)).toUpperCase();
                let avatarHtml = '';
                const pfpType = userData?.pfpType || 'google'; 

                if (pfpType === 'custom' && userData?.customPfp) {
                    avatarHtml = `<img src="${userData.customPfp}" class="w-full h-full object-cover" style="border-radius: 12px;" alt="Profile">`;
                } else if (pfpType === 'mibi' && userData?.mibiConfig) {
                    const { eyes, mouths, hats, bgColor, rotation, size, offsetX, offsetY } = userData.mibiConfig;
                    const scale = (size || 100) / 100;
                    const rot = rotation || 0; const x = offsetX || 0; const y = offsetY || 0;
                    avatarHtml = `
                        <div class="w-full h-full relative overflow-hidden" style="background-color: ${bgColor || '#3B82F6'}; border-radius: 12px;">
                             <div class="absolute inset-0 w-full h-full" style="transform: translate(${x}%, ${y}%) rotate(${rot}deg) scale(${scale}); transform-origin: center;">
                                 <img src="/mibi-avatars/head.png" class="absolute inset-0 w-full h-full object-contain">
                                 ${eyes ? `<img src="/mibi-avatars/eyes/${eyes}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                                 ${mouths ? `<img src="/mibi-avatars/mouths/${mouths}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                                 ${hats ? `<img src="/mibi-avatars/hats/${hats}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                             </div>
                        </div>
                    `;
                } else {
                    const googleProvider = user.providerData.find(p => p.providerId === 'google.com');
                    const displayPhoto = (pfpType === 'google') ? (googleProvider ? googleProvider.photoURL : user.photoURL) : null;

                    if (displayPhoto && pfpType === 'google') {
                        avatarHtml = `<img src="${displayPhoto}" class="w-full h-full object-cover" style="border-radius: 12px;" alt="Profile">`;
                    } else {
                        const bg = userData?.pfpLetterBg || 'linear-gradient(135deg, #374151 0%, #111827 100%)';
                        const textColor = getLetterAvatarTextColor(bg);
                        const fontSizeClass = initial.length >= 3 ? 'text-xs' : (initial.length === 2 ? 'text-sm' : 'text-base');
                        avatarHtml = `<div class="initial-avatar w-full h-full font-semibold ${fontSizeClass}" style="background: ${bg}; color: ${textColor}; border-radius: 12px;">${initial}</div>`;
                    }
                }
                
                return `
                    <div id="auth-button-container" class="relative flex-shrink-0 flex items-center">
                        <button id="auth-toggle" class="w-10 h-10 border border-gray-600 overflow-hidden" style="border-radius: 14px;">${avatarHtml}</button>
                        <div id="auth-menu-container" class="auth-menu-container closed">
                            <div class="border-b border-gray-700 mb-2 w-full min-w-0 flex items-center">
                                <div class="min-w-0 flex-1 overflow-hidden">
                                    <div class="marquee-container" id="username-marquee"><p class="text-sm font-semibold auth-menu-username marquee-content">${username}</p></div>
                                    <div class="marquee-container" id="email-marquee"><p class="text-xs text-gray-400 auth-menu-email marquee-content">${email}</p></div>
                                </div>
                            </div>
                            ${menuLinks}
                            <button id="logout-button" class="auth-menu-button text-red-400 hover:bg-red-900/50 hover:text-red-300"><i class="fa-solid fa-right-from-bracket w-4"></i>Log Out</button>
                        </div>
                    </div>
                `;
            };

            return `${user ? loggedInView(user, userData) : loggedOutView}`;
        }

        const setupAuthToggleListeners = (user) => {
            const toggleButton = document.getElementById('auth-toggle');
            const menu = document.getElementById('auth-menu-container');

            if (toggleButton && menu) {
                toggleButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (menu.classList.contains('open')) {
                        menu.classList.remove('open'); menu.classList.add('closing');
                        menu.addEventListener('animationend', () => { menu.classList.remove('closing'); menu.classList.add('closed'); }, { once: true });
                    } else {
                        menu.classList.remove('closed'); menu.classList.remove('closing'); menu.classList.add('open');
                        checkMarquees();
                    }
                });
            }

            if (user) {
                const logoutButton = document.getElementById('logout-button');
                if (logoutButton) logoutButton.addEventListener('click', () => auth.signOut().catch(err => console.error("Logout failed:", err)));
            }
        };

        const checkMarquees = () => {
            requestAnimationFrame(() => {
                const containers = document.querySelectorAll('.marquee-container');
                containers.forEach(container => {
                    const content = container.querySelector('.marquee-content');
                    if (!content) return;
                    container.classList.remove('active');
                    if (content.nextElementSibling && content.nextElementSibling.classList.contains('marquee-content')) content.nextElementSibling.remove();
                    if (content.offsetWidth > container.offsetWidth) {
                        container.classList.add('active');
                        const duplicate = content.cloneNode(true);
                        duplicate.setAttribute('aria-hidden', 'true'); 
                        content.style.paddingRight = '2rem'; duplicate.style.paddingRight = '2rem';
                        container.appendChild(duplicate);
                    } else {
                        content.style.paddingRight = '';
                    }
                });
            });
        };

        const renderNavbar = (user, userData, isPrivilegedUser) => {
            const authControlsWrapper = document.getElementById('auth-controls-wrapper');
            if (authControlsWrapper) authControlsWrapper.innerHTML = getAuthControlsHtml();
            
            setupEventListeners(user);
            checkMarquees();
        };

        const setupEventListeners = (user) => {
            setupAuthToggleListeners(user);

            if (!globalClickListenerAdded) {
                document.addEventListener('click', (e) => {
                    const menu = document.getElementById('auth-menu-container');
                    const toggleButton = document.getElementById('auth-toggle');
                    
                    if (menu && menu.classList.contains('open') && !menu.contains(e.target) && (toggleButton && !toggleButton.contains(e.target))) {
                        menu.classList.remove('open'); menu.classList.add('closing');
                        menu.addEventListener('animationend', () => { menu.classList.remove('closing'); menu.classList.add('closed'); }, { once: true });
                    }
                });
                
                window.addEventListener('pfp-updated', (e) => {
                    if (!currentUserData) currentUserData = {};
                    Object.assign(currentUserData, e.detail);
                    
                    const username = currentUserData.username || currentUser?.displayName || 'User';
                    const initial = (currentUserData.letterAvatarText) ? currentUserData.letterAvatarText : username.charAt(0).toUpperCase();
                    let newContent = '';
                    
                    if (currentUserData.pfpType === 'custom' && currentUserData.customPfp) {
                        newContent = `<img src="${currentUserData.customPfp}" class="w-full h-full object-cover" style="border-radius: 12px;" alt="Profile">`;
                    } else if (currentUserData.pfpType === 'mibi' && currentUserData.mibiConfig) {
                        const { eyes, mouths, hats, bgColor, rotation, size, offsetX, offsetY } = currentUserData.mibiConfig;
                        const scale = (size || 100) / 100; const rot = rotation || 0; const x = offsetX || 0; const y = offsetY || 0;
                        newContent = `
                            <div class="w-full h-full relative overflow-hidden" style="background-color: ${bgColor || '#3B82F6'}; border-radius: 12px;">
                                 <div class="absolute inset-0 w-full h-full" style="transform: translate(${x}%, ${y}%) rotate(${rot}deg) scale(${scale}); transform-origin: center;">
                                     <img src="/mibi-avatars/head.png" class="absolute inset-0 w-full h-full object-contain">
                                     ${eyes ? `<img src="/mibi-avatars/eyes/${eyes}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                                     ${mouths ? `<img src="/mibi-avatars/mouths/${mouths}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                                     ${hats ? `<img src="/mibi-avatars/hats/${hats}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                                 </div>
                            </div>
                        `;
                    } else {
                        const bg = currentUserData.letterAvatarColor || 'linear-gradient(135deg, #374151 0%, #111827 100%)';
                        const textColor = getLetterAvatarTextColor(bg);
                        const fontSizeClass = initial.length >= 3 ? 'text-xs' : (initial.length === 2 ? 'text-sm' : 'text-base');
                        newContent = `<div class="initial-avatar w-full h-full font-semibold ${fontSizeClass}" style="background: ${bg}; color: ${textColor}; border-radius: 12px;">${initial}</div>`;
                    }

                    const authToggle = document.getElementById('auth-toggle');
                    if (authToggle) {
                        authToggle.style.transition = 'opacity 0.2s ease'; authToggle.style.opacity = '0';
                        setTimeout(() => { authToggle.innerHTML = newContent; authToggle.style.opacity = '1'; }, 200);
                    }
                });
                globalClickListenerAdded = true;
            }
        };

        auth.onAuthStateChanged(async (user) => {
            let isPrivilegedUser = false;
            let userData = null;
            if (user) {
                isPrivilegedUser = user.email === PRIVILEGED_EMAIL;
                try {
                    const [userDoc, adminDoc] = await Promise.all([
                        db.collection('users').doc(user.uid).get(),
                        db.collection('admins').doc(user.uid).get()
                    ]);
                    userData = userDoc.exists ? userDoc.data() : null;
                    if (!isPrivilegedUser && adminDoc.exists) isPrivilegedUser = true;
                } catch (error) { console.error("Error fetching user data:", error); }
            }
            currentUser = user;
            currentUserData = userData;
            currentIsPrivileged = isPrivilegedUser;
            renderNavbar(currentUser, currentUserData, currentIsPrivileged);
            if (!authCheckCompleted) authCheckCompleted = true;
        });
    };

    // --- Sound & Notification Logic ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let isMuted = false;

    window.playClickSound = function() {
        if (isMuted) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.015);
        osc.start(); osc.stop(audioCtx.currentTime + 0.015);
    };

    window.showNotification = function(message, iconClass = 'fa-solid fa-info-circle', type = 'info') {
        const notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) return;
        while (notificationContainer.children.length >= 3) notificationContainer.removeChild(notificationContainer.firstChild);
        
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `<i class="${iconClass} notification-icon ${type}"></i><span>${message}</span>`;
        notificationContainer.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add('show');
            if (window.playClickSound) window.playClickSound();
        });
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300);
        }, 3000);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
})();
