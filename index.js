

import { getSupabase } from './supabase-client.js';

let supabase;
let currentUser = null;

// --- DOM Elements ---
const authNav = document.getElementById('auth-nav');
const mainMenuContent = document.getElementById('main-menu-content');
const subtitleEl = document.querySelector('.subtitle');


// --- UI Update Functions ---

/**
 * Updates the header navigation based on user's auth state.
 * @param {object|null} user - The Supabase user object or null.
 */
function updateUIForAuthState(user) {
  if (user) {
    // Logged-in state
    authNav.innerHTML = `
      <span>${user.email}</span>
      <span class="separator">/</span>
      <button id="signout-btn">Sign Out</button>
    `;
    document.getElementById('signout-btn').addEventListener('click', handleSignOut);
  } else {
    // Logged-out ("Guest") state
    authNav.innerHTML = `
      <a href="signin.html">Sign In</a>
      <span class="separator">/</span>
      <a href="signup.html">Create Account</a>
    `;
  }
}

// --- Authentication Handlers ---

async function handleSignOut() {
  await supabase.auth.signOut();
  // onAuthStateChange listener will update the UI, but a reload ensures a clean state.
  window.location.reload();
}

// --- Case Generation ---

/**
 * Handles the click event for the "Start New Case" button for both
 * logged-in users and guests.
 */
async function handleStartNewCase() {
  const startBtn = document.getElementById('start-new-case-btn');
  startBtn.disabled = true;
  startBtn.textContent = 'Generating Case...';
  subtitleEl.textContent = "The AI is writing the case file...";

  try {
    const { data: userSession } = await supabase.auth.getSession();
    const token = userSession.session?.access_token;
    
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch('/api/generate-case', {
      method: 'POST',
      headers: headers
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    const newCase = await response.json();

    if (currentUser && newCase.id) { // Logged-in user: case was saved, has an id
      window.location.href = `courtroom.html?case_id=${newCase.id}`;
    } else { // Guest user: case was not saved, store in session
      sessionStorage.setItem('guestCase', JSON.stringify(newCase));
      window.location.href = 'courtroom.html';
    }

  } catch (error) {
    console.error("Error starting new case:", error);
    subtitleEl.textContent = `Error: ${error.message}`;
    startBtn.disabled = false;
    startBtn.textContent = 'Start New Case';
  }
}

// --- Event Listeners & Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
    try {
        supabase = await getSupabase();
    } catch (error) {
        const errorMessage = error.message || "An unknown error occurred during initialization.";
        subtitleEl.textContent = `Initialization Error`;
        mainMenuContent.innerHTML = `<p class="error-message">Could not start the application: ${errorMessage}. Please try refreshing the page.</p>`;
        console.error("Initialization failed:", error);
        return;
    }

    // Add listener to the static "Start" button
    document.getElementById('start-new-case-btn').addEventListener('click', handleStartNewCase);

    // Supabase Auth State Listener
    supabase.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user ?? null;
        updateUIForAuthState(currentUser);
    });
});
