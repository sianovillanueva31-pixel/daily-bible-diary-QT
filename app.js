// --- FIREBASE CONFIGURATION INSTRUCTIONS ---
// 1. Go to console.firebase.google.com and create a project.
// 2. Enable "Authentication" (Email/Password provider).
// 3. Enable "Firestore Database" (Start in Test Mode or set rules allowing authenticated user access:
//    match /entries/{docId} { allow read, write: if request.auth != null && request.auth.uid == resource.data.userId; } )
// 4. Register a web app and replace the firebaseConfig object below with your keys.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
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
        date: new Date().toISOString(), // Standardized string format for sorting/display
        timestamp: serverTimestamp() // Firestore native sorting
    };

    try {
        // 1. Try Firebase Save
        await addDoc(collection(db, "entries"), entryData);
        showSaveSuccess("Entry Saved to Cloud! ✨", "text-green-600");
        titleInput.value = '';
        contentInput.value = '';
    } catch (error) {
        console.error("Firebase save failed, falling back to LocalStorage:", error);
        // 2. Fallback to LocalStorage
        let localEntries = JSON.parse(localStorage.getItem(`entries_${currentUser.uid}`)) || [];
        localEntries.push({...entryData, timestamp: Date.now()}); 
        localStorage.setItem(`entries_${currentUser.uid}`, JSON.stringify(localEntries));
        showSaveSuccess("Saved offline (Local Storage).", "text-yellow-600");
        titleInput.value = '';
        contentInput.value = '';
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

// --- VIEW ENTRIES LOGIC ---
window.loadEntries = async () => {
    showPage('entries-page');
    const list = document.getElementById('entries-list');
    list.innerHTML = '<div class="text-center text-gray-500 py-10">Loading entries...</div>';

    if (!currentUser) return;

    let entries = [];

    // 1. Fetch from Firebase
    try {
        const q = query(
            collection(db, "entries"), 
            where("userId", "==", currentUser.uid),
            orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            entries.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error("Firebase fetch error:", error);
    }

    // 2. Fetch from LocalStorage (Fallback logic)
    const localEntries = JSON.parse(localStorage.getItem(`entries_${currentUser.uid}`)) || [];
    entries = [...entries, ...localEntries];

    // Sort combined entries by date descending
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Render
    if (entries.length === 0) {
        list.innerHTML = `
            <div class="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm">
                <p class="text-gray-500 mb-4">You haven't written any entries yet.</p>
                <button onclick="showPage('dashboard-page')" class="text-indigo-600 font-bold hover:underline">Write your first entry</button>
            </div>`;
        return;
    }

    list.innerHTML = entries.map(entry => {
        const displayDate = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition" onclick="this.querySelector('.entry-body').classList.toggle('hidden')">
                <div class="p-6 flex justify-between items-center border-b border-gray-50 bg-gray-50/50">
                    <h3 class="font-bold text-lg text-indigo-900">${escapeHtml(entry.title)}</h3>
                    <span class="text-sm text-gray-500">${displayDate}</span>
                </div>
                <div class="entry-body hidden p-6 text-gray-700 whitespace-pre-wrap leading-relaxed">${escapeHtml(entry.content)}</div>
            </div>
        `;
    }).join('');
};

// Utility to prevent XSS
function escapeHtml(unsafe) {
    return (unsafe || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}