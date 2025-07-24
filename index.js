import { createClient } from '@supabase/supabase-js';

/**
 * Case Closed: The AI Detective
 * Main menu, authentication, and case generation logic.
 */

// --- Supabase Client ---
// These are public-facing keys, safe to be exposed in a browser.
// They should be set as environment variables in your Netlify build settings.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- State ---
let currentUser = null;
let authModalMode = 'signIn'; // 'signIn' or 'signUp'


// --- DOM Elements ---
const authNav = document.getElementById('auth-nav');
const mainMenuContent = document.getElementById('main-menu-content');
const subtitleEl = document.querySelector('.subtitle');

// Auth Modal Elements
const authModalOverlay = document.getElementById('auth-modal-overlay');
const authModalTitle = document.getElementById('auth-modal-title');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authErrorMessage = document.getElementById('auth-error-message');
const cancelAuthBtn = document.getElementById('cancel-auth-btn');
const submitAuthBtn = document.getElementById('submit-auth-btn');


// --- UI Update Functions ---

function updateUIForAuthState(user) {
  if (user) {
    // Logged-in state
    authNav.innerHTML = `
      <span>${user.email}</span>
      <span class="separator">/</span>
      <button id="signout-btn">Sign Out</button>
    `;
    mainMenuContent.innerHTML = `
      <div class="menu-buttons">
        <button id="start-new-case-btn" class="menu-btn">Start New Case</button>
        <button id="case-files-btn" class="menu-btn" disabled>Case Files</button>
      </div>
    `;
    document.getElementById('signout-btn').addEventListener('click', handleSignOut);
    document.getElementById('start-new-case-btn').addEventListener('click', handleStartNewCase);
  } else {
    // Logged-out state
    authNav.innerHTML = `
      <button id="signin-link">Sign In</button>
      <span class="separator">/</span>
      <button id="signup-link">Create Account</button>
    `;
    mainMenuContent.innerHTML = `
        <p class="auth-prompt">Please sign in or create an account to begin your investigation.</p>
    `;
    document.getElementById('signin-link').addEventListener('click', () => showAuthModal('signIn'));
    document.getElementById('signup-link').addEventListener('click', () => showAuthModal('signUp'));
  }
}

function showAuthModal(mode) {
    authModalMode = mode;
    authErrorMessage.classList.add('hidden');
    authForm.reset();

    if (mode === 'signIn') {
        authModalTitle.textContent = 'Sign In';
        submitAuthBtn.textContent = 'Sign In';
    } else {
        authModalTitle.textContent = 'Create Account';
        submitAuthBtn.textContent = 'Sign Up';
    }
    authModalOverlay.classList.remove('hidden');
    authEmailInput.focus();
}

function hideAuthModal() {
    authModalOverlay.classList.add('hidden');
}


// --- Authentication Handlers ---

async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    submitAuthBtn.disabled = true;
    authErrorMessage.classList.add('hidden');

    let response;
    if (authModalMode === 'signUp') {
        response = await supabase.auth.signUp({ email, password });
    } else {
        response = await supabase.auth.signInWithPassword({ email, password });
    }

    if (response.error) {
        authErrorMessage.textContent = response.error.message;
        authErrorMessage.classList.remove('hidden');
    } else {
        // Success, the onAuthStateChange listener will handle the UI update
        hideAuthModal();
    }
    submitAuthBtn.disabled = false;
}

async function handleSignOut() {
    await supabase.auth.signOut();
    // onAuthStateChange listener will update the UI
}

// --- Case Generation ---

/**
 * Renders the case briefing screen.
 * @param {object} caseData - The case data to display.
 */
function showCaseBriefing(caseData) {
  const caseFile = caseData.case_data;
  mainMenuContent.innerHTML = `
    <div class="case-brief-container">
      <h2 class="case-title">${caseFile.caseTitle}</h2>
      <p class="case-brief-text">${caseFile.caseBrief}</p>
      <div class="menu-buttons">
        <button id="proceed-to-courtroom-btn" class="menu-btn">Proceed to Courtroom</button>
      </div>
    </div>
  `;
  document.getElementById('proceed-to-courtroom-btn').addEventListener('click', () => {
    window.location.href = `courtroom.html?case_id=${caseData.id}`;
  });
}

/**
 * Handles the click event for the "Start New Case" button.
 */
async function handleStartNewCase() {
  const startBtn = document.getElementById('start-new-case-btn');
  startBtn.disabled = true;
  startBtn.textContent = 'Generating Case...';
  subtitleEl.textContent = "The AI is writing the case file...";

  try {
    const { data: userSession } = await supabase.auth.getSession();
    if (!userSession.session) {
      throw new Error("You must be logged in to start a case.");
    }
    
    const token = userSession.session.access_token;
    
    const response = await fetch('/api/generate-case', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    const newCase = await response.json();
    showCaseBriefing(newCase);

  } catch (error) {
    console.error("Error starting new case:", error);
    subtitleEl.textContent = `Error: ${error.message}`;
    startBtn.disabled = false;
    startBtn.textContent = 'Start New Case';
  }
}

// --- Event Listeners & Initialization ---

document.addEventListener('DOMContentLoaded', () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    subtitleEl.textContent = "Application is not configured. Missing Supabase details.";
    return;
  }

  // Auth Modal Listeners
  authForm.addEventListener('submit', handleAuthSubmit);
  cancelAuthBtn.addEventListener('click', hideAuthModal);

  // Supabase Auth State Listener
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    updateUIForAuthState(currentUser);
  });
});
