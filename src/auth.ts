import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, User, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDatabase, ref, get, child, update, remove } from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';
import { registerStatsActions } from './dashboard-actions';

// Initialize external scripts
registerStatsActions();

declare global {
  interface Window {
    handleLogin?: (e: Event) => Promise<void>;
    logoutUser?: () => Promise<void>;
    currentUser?: User | null;
    openLoginModal?: () => void;
    closeLoginModal?: () => void;
    showLoading?: (text?: string) => void;
    hideLoading?: () => void;
    customConfirm?: (title: string, message: string, options?: { type: 'info' | 'warn' | 'delete' }) => Promise<boolean>;
    fetchFirebaseData?: (path: string) => Promise<any>;
    updateFirebaseData?: (path: string, data: any) => Promise<void>;
    deleteFirebaseData?: (path: string, key: string) => Promise<void>;
  }
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Explicitly pass databaseURL to handle non-default instances (e.g. asia-southeast1)
export const db = getDatabase(app, firebaseConfig.databaseURL);

// Ensure local persistence for session stability
setPersistence(auth, browserLocalPersistence).catch(err => console.error("Persistence error:", err));

window.fetchFirebaseData = async (path: string) => {
    const dbRef = ref(db);
    try {
        const snapshot = await get(child(dbRef, path));
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return null;
        }
    } catch (error) {
        console.error("Firebase SDK Fetch Error:", error);
        throw error;
    }
};

window.updateFirebaseData = async (path: string, data: any) => {
    try {
        const dbRef = ref(db, path);
        await update(dbRef, data);
    } catch (error) {
        console.error("Firebase SDK Update Error:", error);
        throw error;
    }
};

window.deleteFirebaseData = async (path: string, key: string) => {
    try {
        const dbRef = ref(db, `${path}/${key}`);
        await remove(dbRef);
    } catch (error) {
        console.error("Firebase SDK Delete Error:", error);
        throw error;
    }
};

// Expose handleLogin
window.handleLogin = async (e: Event) => {
    e.preventDefault();
    const emailInput = document.getElementById('login-email') as HTMLInputElement;
    const passwordInput = document.getElementById('login-password') as HTMLInputElement;
    
    if (!emailInput || !passwordInput) return;
    
    if (window.showLoading) window.showLoading('Login...');
    try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        window.location.href = '/admin/index.html';
    } catch (error: any) {
        if (window.hideLoading) window.hideLoading();
        let errorMsg = document.getElementById('login-error-msg');
        if (!errorMsg) {
            errorMsg = document.createElement('div');
            errorMsg.id = 'login-error-msg';
            errorMsg.className = 'text-rose-500 text-sm font-medium mt-2 bg-rose-50 p-3 rounded-lg border border-rose-200';
            const form = document.getElementById('login-form');
            if (form) form.insertBefore(errorMsg, form.firstChild);
        }
        if (errorMsg) {
            // Convert Firebase error code to human readable
            let humanError = "Email atau password yang Anda masukkan salah.";
            if (error.code === 'auth/network-request-failed') {
                humanError = "Koneksi internet terputus. Silakan coba lagi.";
            } else if (error.code === 'auth/too-many-requests') {
                humanError = "Terlalu banyak percobaan. Harap tunggu beberapa saat lalu coba lagi.";
            } else if (error.message) {
                 // Try mapping standard invalid credential string if present
                if (error.code === 'auth/invalid-credential') {
                    humanError = "Email atau Password anda salah.";
                }
            }

            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i> ${humanError}`;
        }
        console.error("Login gagal:", error);
    }
};

window.logoutUser = async () => {
    // Show confirmation before logging out
    if (window.customConfirm) {
        const confirmed = await window.customConfirm("Keluar Akun", "Apakah Anda yakin ingin keluar (logout) dari sistem ini?", { type: 'warn' });
        if (!confirmed) return;
    }

    if (window.showLoading) window.showLoading('Keluar...');
    try {
        await signOut(auth);
        
        // Clear localStorage (except theme) and sessionStorage
        const savedTheme = localStorage.getItem('theme');
        localStorage.clear();
        sessionStorage.clear();
        if (savedTheme) localStorage.setItem('theme', savedTheme);

        // Clear login form fields if they exist
        const emailInput = document.getElementById('login-email') as HTMLInputElement;
        const passwordInput = document.getElementById('login-password') as HTMLInputElement;
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';

        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            window.location.replace('/');
        } else {
            window.location.replace('/');
        }
    } catch (error: any) {
        if (window.hideLoading) window.hideLoading();
        console.error("Logout gagal: " + error.message);
    }
};

// Listen to auth state
let firstAuthChecked = false;
onAuthStateChanged(auth, (user) => {
    // Expose user to window for other scripts
    window.currentUser = user;

    if (!firstAuthChecked) {
        firstAuthChecked = true;
        console.log("Auth: First auth check complete, user:", user ? user.email : "anonymous");
        (window as any).firebaseIsReady = true;
        window.dispatchEvent(new Event('firebaseReady'));
    }

    const loginBtn = document.getElementById('login-dropdown-btn') as HTMLElement;
    const adminBtn = document.getElementById('admin-dashboard-btn') as HTMLElement;
    
    if (user) {
        if (adminBtn) {
            adminBtn.style.display = 'flex';
        }
        // Change login button to Logout
        if (loginBtn) {
            loginBtn.style.display = 'flex';
            // Ubah class agar tampilannya merah (logout)
            loginBtn.className = "btn text-sm border-0 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-colors flex items-center gap-2 px-4 py-2 font-medium rounded-lg";

            loginBtn.innerHTML = `
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            `;
            // Override click to trigger logout
            loginBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if(window.logoutUser) window.logoutUser();
            };
        }
    } else {
        // User logged out
        if (adminBtn) {
            adminBtn.style.display = 'none';
        }
        if (loginBtn) {
            loginBtn.style.display = 'flex';
            // Ubah class agar tampilannya biru (login)
            loginBtn.className = "btn text-sm border-0 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2 px-4 py-2 font-medium rounded-lg";

            loginBtn.innerHTML = `
                <i class="fas fa-sign-in-alt"></i>
                <span>Login</span>
            `;
            // Restore click
            loginBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if(window.openLoginModal) window.openLoginModal();
            };
        }

        // Redirect if on admin page without auth - Added safety delay
        if (window.location.pathname.includes('admin')) {
            setTimeout(() => {
                if (!window.currentUser) {
                    window.location.replace('/');
                }
            }, 800);
        }
    }
});
