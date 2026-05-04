import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- PASTE YOUR ACTUAL FIREBASE CONFIG HERE ---
const firebaseConfig = {
    apiKey: "AIza...", // Should start with AIza
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:12345:web:abcde"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let isSignUpMode = false;
let currentUser = null;

// Global Page Switcher
window.showPage = (pageId) => {
    const pages = ['landing-page', 'auth-page', 'dashboard-page', 'entries-page'];
    pages.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    document.getElementById(pageId)?.classList.remove('hidden');
};

// Auth Toggle (Sign In <-> Sign Up)
window.toggleAuthMode = () => {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? "Create Account" : "Sign In";
    document.getElementById('auth-submit-btn').innerText = isSignUpMode ? "Sign Up" : "Sign In";
    document.getElementById('auth-toggle-btn').innerText = isSignUpMode ? "Sign In" : "Sign Up";
    document.getElementById('auth-error').classList.add('hidden');
};

// Handle Auth Form
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const btn = document.getElementById('auth-submit-btn');
    const errorEl = document.getElementById('auth-error');

    btn.disabled = true;
    btn.innerText = "Authenticating...";

    try {
        if (isSignUpMode) {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        errorEl.innerText = error.message;
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerText = isSignUpMode ? "Sign Up" : "Sign In";
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const navAuth = document.getElementById('nav-auth-buttons');
    const navApp = document.getElementById('nav-app-buttons');

    if (user) {
        navAuth.classList.add('hidden');
        navApp.classList.remove('hidden');
        navApp.classList.add('flex');
        setDailyData();
        showPage('dashboard-page');
    } else {
        navAuth.classList.remove('hidden');
        navApp.classList.add('hidden');
        navApp.classList.remove('flex');
        showPage('landing-page');
    }
});

// Load Verse and Date
async function setDailyData() {
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    try {
        const res = await fetch('https://labs.bible.org/api/?passage=random&type=json');
        const data = await res.json();
        document.getElementById('daily-verse').innerText = `"${data[0].text}"`;
        document.getElementById('daily-verse-ref').innerText = `- ${data[0].bookname} ${data[0].chapter}:${data[0].verse}`;
    } catch (e) {
        document.getElementById('daily-verse').innerText = '"Be still, and know that I am God."';
        document.getElementById('daily-verse-ref').innerText = '- Psalm 46:10';
    }
}

// Save Entry
document.getElementById('journal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-entry-btn');
    const status = document.getElementById('save-status');
    const title = document.getElementById('entry-title');
    const content = document.getElementById('entry-content');

    btn.disabled = true;
    btn.innerText = "Saving...";

    try {
        await addDoc(collection(db, "entries"), {
            userId: currentUser.uid,
            title: title.value,
            content: content.value,
            date: new Date().toISOString(),
            timestamp: serverTimestamp()
        });
        status.innerText = "Entry Saved! ✨";
        status.className = "text-green-600 font-bold opacity-100";
        title.value = '';
        content.value = '';
        setTimeout(() => status.classList.add('opacity-0'), 3000);
    } catch (err) {
        console.error(err);
        status.innerText = "Save Failed: Check Database Rules";
        status.className = "text-red-600 font-bold opacity-100";
    } finally {
        btn.disabled = false;
        btn.innerText = "Save Entry";
    }
});

// View Entries
window.loadEntries = async () => {
    showPage('entries-page');
    const list = document.getElementById('entries-list');
    list.innerHTML = '<p class="text-center py-10">Fetching your journal...</p>';

    try {
        const q = query(collection(db, "entries"), where("userId", "==", currentUser.uid), orderBy("date", "desc"));
        const snap = await getDocs(q);
        if (snap.empty) {
            list.innerHTML = '<p class="text-center py-10 text-gray-500">No entries yet. Write your first reflection!</p>';
            return;
        }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const date = new Date(d.date).toLocaleDateString();
            html += `
            <div class="bg-white p-6 rounded-xl shadow-sm mb-4 border border-gray-100">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-indigo-900 text-lg">${d.title}</h3>
                    <span class="text-xs text-gray-400">${date}</span>
                </div>
                <p class="text-gray-600 whitespace-pre-wrap">${d.content}</p>
            </div>`;
        });
        list.innerHTML = html;
    } catch (err) {
        list.innerHTML = `<p class="text-red-500 text-center">Error: ${err.message}</p>`;
    }
};            userId: currentUser.uid,
            title: title.value,
            content: content.value,
            date: new Date().toISOString(),
            timestamp: serverTimestamp()
        });
        status.innerText = "Saved Successfully! ✨";
        status.className = "text-green-600 font-bold opacity-100";
        title.value = '';
        content.value = '';
        setTimeout(() => status.classList.add('opacity-0'), 3000);
    } catch (err) {
        status.innerText = "Error: Check Firestore Rules";
        status.className = "text-red-600 font-bold opacity-100";
    } finally {
        btn.disabled = false;
        btn.innerText = "Save Entry";
    }
});

window.loadEntries = async () => {
    showPage('entries-page');
    const list = document.getElementById('entries-list');
    list.innerHTML = '<p class="text-center text-gray-500">Loading...</p>';
    try {
        const q = query(collection(db, "entries"), where("userId", "==", currentUser.uid), orderBy("date", "desc"));
        const snap = await getDocs(q);
        if (snap.empty) {
            list.innerHTML = '<p class="text-center text-gray-500">No entries found.</p>';
            return;
        }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            html += `<div class="bg-white p-6 rounded-xl shadow-sm mb-4 border border-gray-100">
                <h3 class="font-bold text-indigo-900">${d.title}</h3>
                <p class="text-gray-600 whitespace-pre-wrap mt-2">${d.content}</p>
            </div>`;
        });
        list.innerHTML = html;
    } catch (err) {
        list.innerHTML = `<p class="text-red-500 text-center">${err.message}</p>`;
    }
};        }
    });
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const navAuth = document.getElementById('nav-auth-buttons');
    const navApp = document.getElementById('nav-app-buttons');
    if (user) {
        navAuth?.classList.add('hidden');
        navApp?.classList.remove('hidden');
        navApp?.classList.add('flex');
        setDailyData();
        showPage('dashboard-page');
    } else {
        navAuth?.classList.remove('hidden');
        navApp?.classList.add('hidden');
        navApp?.classList.remove('flex');
        showPage('landing-page');
    }
});

async function setDailyData() {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    try {
        const res = await fetch('https://labs.bible.org/api/?passage=random&type=json');
        const data = await res.json();
        document.getElementById('daily-verse').innerText = `"${data[0].text}"`;
        document.getElementById('daily-verse-ref').innerText = `- ${data[0].bookname} ${data[0].chapter}:${data[0].verse}`;
    } catch (e) {
        document.getElementById('daily-verse').innerText = '"The Lord is my shepherd; I shall not want."';
        document.getElementById('daily-verse-ref').innerText = '- Psalm 23:1';
    }
}

const journalForm = document.getElementById('journal-form');
if (journalForm) {
    journalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-entry-btn');
        const status = document.getElementById('save-status');
        const title = document.getElementById('entry-title');
        const content = document.getElementById('entry-content');

        btn.disabled = true;
        btn.innerText = "Saving...";

        try {
            await addDoc(collection(db, "entries"), {
                userId: currentUser.uid,
                title: title.value,
                content: content.value,
                date: new Date().toISOString(),
                timestamp: serverTimestamp()
            });
            status.innerText = "Saved Successfully! ✨";
            status.className = "text-green-600 font-bold opacity-100";
            title.value = '';
            content.value = '';
            setTimeout(() => status.classList.add('opacity-0'), 3000);
        } catch (err) {
            status.innerText = "Error saving. Check Firestore Rules.";
            status.className = "text-red-600 font-bold opacity-100";
        } finally {
            btn.disabled = false;
            btn.innerText = "Save Entry";
        }
    });
}

window.loadEntries = async () => {
    showPage('entries-page');
    const list = document.getElementById('entries-list');
    list.innerHTML = '<p class="text-center text-gray-500">Loading your journey...</p>';
    try {
        const q = query(collection(db, "entries"), where("userId", "==", currentUser.uid), orderBy("date", "desc"));
        const snap = await getDocs(q);
        if (snap.empty) {
            list.innerHTML = '<p class="text-center text-gray-500">No entries yet. Start writing!</p>';
            return;
        }
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            const dateStr = new Date(d.date).toLocaleDateString();
            html += `
            <div class="bg-white p-6 rounded-xl shadow-sm mb-4 border border-gray-100">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-bold text-indigo-900">${d.title}</h3>
                    <span class="text-xs text-gray-400">${dateStr}</span>
                </div>
                <p class="text-gray-600 whitespace-pre-wrap">${d.content}</p>
            </div>`;
        });
        list.innerHTML = html;
    } catch (err) {
        list.innerHTML = `<p class="text-red-500 text-center">Error: ${err.message}</p>`;
    }
};            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
        document.getElementById('auth-form').reset();
    } catch (error) {
        errorEl.innerText = error.message.replace('Firebase:', '').trim();
        errorEl.classList.remove('hidden');
        btn.innerText = isSignUpMode ? "Sign Up" : "Sign In";
        btn.disabled = false;
    }
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const navAuth = document.getElementById('nav-auth-buttons');
    const navApp = document.getElementById('nav-app-buttons');
    const btn = document.getElementById('auth-submit-btn');
    btn.disabled = false;

    if (user) {
        navAuth.classList.add('hidden');
        navApp.classList.remove('hidden');
        navApp.classList.add('flex');
        setDailyData();
        showPage('dashboard-page');
    } else {
        navAuth.classList.remove('hidden');
        navApp.classList.add('hidden');
        navApp.classList.remove('flex');
        showPage('landing-page');
    }
});

// --- DASHBOARD LOGIC (Verse & Journal) ---
async function setDailyData() {
    // Set Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', options);

    // Fetch random verse (Fallback provided if API fails)
    try {
        const response = await fetch('https://labs.bible.org/api/?passage=random&type=json');
        const data = await response.json();
        document.getElementById('daily-verse').innerText = `"${data[0].text}"`;
        document.getElementById('daily-verse-ref').innerText = `- ${data[0].bookname} ${data[0].chapter}:${data[0].verse}`;
    } catch (e) {
        document.getElementById('daily-verse').innerText = '"Trust in the LORD with all your heart and lean not on your own understanding."';
        document.getElementById('daily-verse-ref').innerText = '- Proverbs 3:5';
    }
}

document.getElementById('journal-form').addEventListener('submit', async (e) => {
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- REPLACE THESE WITH YOUR ACTUAL KEYS FROM FIREBASE SETTINGS ---
const firebaseConfig = {
    apiKey: "PASTE_YOUR_API_KEY_HERE",
    authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "PASTE_YOUR_PROJECT_ID",
    storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "PASTE_YOUR_SENDER_ID",
    appId: "PASTE_YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- STATE MANAGEMENT ---
let isSignUpMode = false;
let currentUser = null;

// --- UI NAVIGATION ---
window.showPage = (pageId) => {
    ['landing-page', 'auth-page', 'dashboard-page', 'entries-page'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
    window.scrollTo(0, 0);
};

document.getElementById('nav-logo').addEventListener('click', () => {
    if (currentUser) showPage('dashboard-page');
    else showPage('landing-page');
});

// --- AUTHENTICATION LOGIC ---
window.toggleAuthMode = () => {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? "Create Account" : "Sign In";
    document.getElementById('auth-submit-btn').innerText = isSignUpMode ? "Sign Up" : "Sign In";
    document.getElementById('auth-toggle-text').innerText = isSignUpMode ? "Already have an account?" : "Don't have an account?";
    document.getElementById('auth-toggle-btn').innerText = isSignUpMode ? "Sign In" : "Sign Up";
    document.getElementById('auth-error').classList.add('hidden');
};

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    const btn = document.getElementById('auth-submit-btn');
    
    btn.innerText = "Loading...";
    btn.disabled = true;

    try {
        if (isSignUpMode) {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
        document.getElementById('auth-form').reset();
    } catch (error) {
        errorEl.innerText = error.message.replace('Firebase:', '').trim();
        errorEl.classList.remove('hidden');
        btn.innerText = isSignUpMode ? "Sign Up" : "Sign In";
        btn.disabled = false;
    }
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const navAuth = document.getElementById('nav-auth-buttons');
    const navApp = document.getElementById('nav-app-buttons');
    const btn = document.getElementById('auth-submit-btn');
    btn.disabled = false;

    if (user) {
        navAuth.classList.add('hidden');
        navApp.classList.remove('hidden');
        navApp.classList.add('flex');
        setDailyData();
        showPage('dashboard-page');
    } else {
        navAuth.classList.remove('hidden');
        navApp.classList.add('hidden');
        navApp.classList.remove('flex');
        showPage('landing-page');
    }
});

// --- DASHBOARD LOGIC (Verse & Journal) ---
async function setDailyData() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', options);

    try {
        const response = await fetch('https://labs.bible.org/api/?passage=random&type=json');
        const data = await response.json();
        document.getElementById('daily-verse').innerText = `"${data[0].text}"`;
        document.getElementById('daily-verse-ref').innerText = `- ${data[0].bookname} ${data[0].chapter}:${data[0].verse}`;
    } catch (e) {
        document.getElementById('daily-verse').innerText = '"Trust in the LORD with all your heart and lean not on your own understanding."';
        document.getElementById('daily-verse-ref').innerText = '- Proverbs 3:5';
    }
}

document.getElementById('journal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const titleInput = document.getElementById('entry-title');
    const contentInput = document.getElementById('entry-content');
    const btn = document.getElementById('save-entry-btn');
    const status = document.getElementById('save-status');

    btn.innerText = "Saving...";
    btn.disabled = true;

    const entryData = {
        userId: currentUser.uid,
        title: titleInput.value,
        content: contentInput.value,
        date: new Date().toISOString(),
        timestamp: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "entries"), entryData);
        showSaveSuccess("Entry Saved Successfully! ✨", "text-green-600");
        titleInput.value = '';
        contentInput.value = '';
    } catch (error) {
        console.error("Save failed:", error);
        showSaveSuccess("Save failed. Check Firebase rules.", "text-red-600");
    } finally {
        btn.innerText = "Save Entry";
        btn.disabled = false;
    }

    function showSaveSuccess(msg, colorClass) {
        status.innerText = msg;
        status.className = `text-sm font-bold ${colorClass} opacity-100`;
        setTimeout(() => { status.classList.replace('opacity-100', 'opacity-0'); }, 3000);
    }
});

window.loadEntries = async () => {
    showPage('entries-page');
    const list = document.getElementById('entries-list');
    list.innerHTML = '<div class="text-center text-gray-500 py-10">Loading entries...</div>';

    if (!currentUser) return;

    try {
        const q = query(
            collection(db, "entries"), 
            where("userId", "==", currentUser.uid),
            orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);
        const entries = [];
        querySnapshot.forEach((doc) => {
            entries.push({ id: doc.id, ...doc.data() });
        });

        if (entries.length === 0) {
            list.innerHTML = `<div class="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm"><p class="text-gray-500">No entries yet.</p></div>`;
            return;
        }

        list.innerHTML = entries.map(entry => {
            const displayDate = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
            return `
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4" onclick="this.querySelector('.entry-body').classList.toggle('hidden')">
                    <div class="p-6 flex justify-between items-center cursor-pointer">
                        <h3 class="font-bold text-lg text-indigo-900">${escapeHtml(entry.title)}</h3>
                        <span class="text-sm text-gray-500">${displayDate}</span>
                    </div>
                    <div class="entry-body hidden p-6 text-gray-700 whitespace-pre-wrap border-t border-gray-50">${escapeHtml(entry.content)}</div>
                </div>`;
        }).join('');
    } catch (error) {
        list.innerHTML = `<p class="text-red-500 text-center">Error loading entries: ${error.message}</p>`;
    }
};

function escapeHtml(unsafe) {
    return (unsafe || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
                }
