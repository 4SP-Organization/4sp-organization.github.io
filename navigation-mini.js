/**
 * navigation-mini.js (Cleaned & Minimized)
 * Responsibility: Logo, Logout, Legal, and Donate.
 */

// =========================================================================
// >> FIREBASE CONFIGURATION <<
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

const DEFAULT_THEME = {
    'avatar-gradient': 'linear-gradient(135deg, #374151 0%, #111827 100%)',
};

const THEME_STORAGE_KEY = 'user-navbar-theme';
const lightThemeNames = ['Light', 'Lavender', 'Rose Gold', 'Mint'];

/**
 * Normalizes zoom levels so the navbar remains the same physical size.
 */
const applyCounterZoom = () => {
    const navbar = document.querySelector('.auth-navbar');
    if (!navbar) return;
    const dpr = window.devicePixelRatio || 1;
    const scale = 1 / dpr;
    navbar.style.transform = `scale(${scale})`;
    navbar.style.width = `${dpr * 100}%`;
};

(function() {
    let auth, db;
    let currentUser = null;
    let currentUserData = null;

    if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey) {
        console.error("Firebase configuration missing.");
        return;
    }

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
            link.rel = 'stylesheet'; link.href = href;
            link.onload = resolve; link.onerror = resolve;
            document.head.appendChild(link);
        });
    };

    const run = async () => {
        try {
            await loadCSS("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js");
            
            initializeApp();
            injectStyles();
            setupContainer(); 
        } catch (error) {
            console.error("Failed to load SDKs:", error);
        }
    };

    const setupContainer = () => {
        if (!document.getElementById('navbar-container')) {
            const navbarDiv = document.createElement('div');
            navbarDiv.id = 'navbar-container';
            document.body.prepend(navbarDiv);
        }
    };

    const initializeApp = () => {
        firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.firestore();
        setupAuthListener();
    };

    const injectStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            body { padding-top: 4rem; }
            .auth-navbar { 
                position: fixed; top: 0; left: 0; right: 0; z-index: 1000; 
                transform-origin: top left;
                background: #000000;
                border-bottom: 1px solid rgb(31 41 55); height: 4rem; 
            }
            .auth-navbar nav { padding: 0 1rem; height: 100%; display: flex; align-items: center; justify-content: space-between; }
            .auth-menu-container { 
                position: absolute; right: 0; top: 50px; width: 14rem; 
                background: #000000; border: 1px solid rgb(55 65 81); border-radius: 0.9rem; padding: 0.75rem; 
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.4);
                transition: transform 0.2s ease-out, opacity 0.2s ease-out; transform-origin: top right; 
            }
            .auth-menu-container.open { opacity: 1; transform: translateY(0) scale(1); }
            .auth-menu-container.closed { opacity: 0; pointer-events: none; transform: translateY(-10px) scale(0.95); }
            .initial-avatar { display: flex; align-items: center; justify-content: center; color: white; text-transform: uppercase; }
            .auth-menu-link, .auth-menu-button { 
                display: flex; align-items: center; gap: 10px; width: 100%; padding: 0.5rem 0.75rem; 
                font-size: 0.875rem; color: #d1d5db; border-radius: 0.375rem; border: none; cursor: pointer; text-decoration: none; background: transparent;
            }
            .auth-menu-link:hover, .auth-menu-button:hover { background-color: #2a2a2a; color: #ffffff; }
            .logged-out-auth-toggle { background: #010101; border: 1px solid #374151; color: #DADADA; }
        `;
        document.head.appendChild(style);
    };

    // Helper for shared links
    const getGeneralLinks = () => {
        return `
            <a href="/legal.html" class="auth-menu-link"><i class="fa-solid fa-gavel w-5"></i>Terms & Policies</a>
            <a href="https://buymeacoffee.com/4simpleproblems" target="_blank" class="auth-menu-link"><i class="fa-solid fa-mug-hot w-5"></i>Donate</a>
        `;
    };

    const hexToRgb = (hex) => {
        let c = hex.substring(1);
        if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
        const num = parseInt(c, 16);
        return { r: (num >> 16) & 0xFF, g: (num >> 8) & 0xFF, b: (num >> 0) & 0xFF };
    };

    const getLuminance = (rgb) => {
        const a = [rgb.r, rgb.g, rgb.b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const getLetterAvatarTextColor = (gradientBg) => {
        const match = gradientBg.match(/#([0-9a-fA-F]{3}){1,2}/);
        const firstHex = match ? match[0] : null;
        if (!firstHex) return '#FFFFFF';
        const rgb = hexToRgb(firstHex);
        if (getLuminance(rgb) > 0.5) return '#1a1a1a';
        return '#FFFFFF';
    };

    const renderNavbar = (user, userData) => {
        const container = document.getElementById('navbar-container');
        if (!container) return;

        const logoPath = "/images/potato.png";

        const loggedOutView = () => `
            <div class="relative">
                <button id="auth-toggle" class="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-gray-700 transition logged-out-auth-toggle">
                    <i class="fa-solid fa-user"></i>
                </button>
                <div id="auth-menu-container" class="auth-menu-container closed">
                    <a href="/connection.html" class="auth-menu-link"><i class="fa-solid fa-lock w-5"></i>Connect</a>
                    ${getGeneralLinks()}
                </div>
            </div>
        `;

        const loggedInView = (u, ud) => {
            const username = ud?.username || u.displayName || 'User';
            const initial = (ud?.letterAvatarText || username.charAt(0)).toUpperCase();
            
            let avatarHtml = '';
            const pfpType = ud?.pfpType || 'google';

            if (pfpType === 'custom' && ud?.customPfp) {
                avatarHtml = `<img src="${ud.customPfp}" class="w-full h-full object-cover rounded-full" alt="Profile">`;
            } else if (pfpType === 'letter') {
                const bg = ud?.pfpLetterBg || DEFAULT_THEME['avatar-gradient'];
                const textColor = getLetterAvatarTextColor(bg);
                avatarHtml = `<div class="initial-avatar w-full h-full rounded-full font-semibold" style="background: ${bg}; color: ${textColor}">${initial}</div>`;
            } else {
                const photo = u.photoURL || '';
                if (photo) avatarHtml = `<img src="${photo}" class="w-full h-full object-cover rounded-full" alt="Profile">`;
                else avatarHtml = `<div class="initial-avatar w-full h-full rounded-full font-semibold" style="background: ${DEFAULT_THEME['avatar-gradient']}">${initial}</div>`;
            }

            return `
                <div class="relative">
                    <button id="auth-toggle" class="w-10 h-10 rounded-full border border-gray-600 overflow-hidden flex items-center justify-center">
                        ${avatarHtml}
                    </button>
                    <div id="auth-menu-container" class="auth-menu-container closed">
                        <div class="border-b border-gray-700 mb-2 pb-2">
                            <p class="text-sm font-semibold text-white truncate">${username}</p>
                            <p class="text-xs text-gray-400 truncate">${u.email}</p>
                        </div>
                        ${getGeneralLinks()}
                        <button id="logout-button" class="auth-menu-button text-red-400 hover:bg-red-900/50 mt-1">
                            <i class="fa-solid fa-right-from-bracket w-5"></i>Log Out
                        </button>
                    </div>
                </div>
            `;
        };

        container.innerHTML = `
            <header class="auth-navbar">
                <nav>
                    <a href="/" class="flex items-center">
                        <img src="${logoPath}" alt="Logo" class="h-10 w-auto">
                    </a>
                    <div id="auth-controls-wrapper-mini">
                        ${user ? loggedInView(user, userData) : loggedOutView()}
                    </div>
                </nav>
            </header>
        `;

        applyCounterZoom();
        setupEventListeners(user);
    };

    const setupEventListeners = (user) => {
        const toggleButton = document.getElementById('auth-toggle');
        const menu = document.getElementById('auth-menu-container');

        if (toggleButton && menu) {
            toggleButton.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('closed');
                menu.classList.toggle('open');
            });
        }

        document.addEventListener('click', (e) => {
            if (menu && menu.classList.contains('open') && !menu.contains(e.target) && e.target !== toggleButton) {
                menu.classList.add('closed');
                menu.classList.remove('open');
            }
        });

        if (user) {
            const logoutBtn = document.getElementById('logout-button');
            if (logoutBtn) logoutBtn.addEventListener('click', () => auth.signOut());
        }

        window.addEventListener('resize', applyCounterZoom);
    };

    const setupAuthListener = () => {
        auth.onAuthStateChanged(async (user) => {
            currentUser = user;
            if (user) {
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    currentUserData = userDoc.exists ? userDoc.data() : null;
                    renderNavbar(user, currentUserData);
                } catch (error) {
                    renderNavbar(user, null);
                }
            } else {
                currentUserData = null;
                renderNavbar(null, null);
            }
        });
    };

    document.addEventListener('DOMContentLoaded', run);
})();
