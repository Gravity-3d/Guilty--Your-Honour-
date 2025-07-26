

import { getSupabase } from './supabase-client.js';

const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const errorMessageEl = document.getElementById('auth-error-message');
const submitBtn = document.getElementById('submit-auth-btn');

const handleAuth = async (event, supabase, authMethod) => {
    event.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    submitBtn.disabled = true;
    errorMessageEl.classList.add('hidden');
    errorMessageEl.textContent = '';

    // The authMethod will be 'signInWithPassword' or 'signUp'
    const { error } = await supabase.auth[authMethod]({ email, password });

    if (error) {
        errorMessageEl.textContent = error.message;
        errorMessageEl.classList.remove('hidden');
        submitBtn.disabled = false;
    } else {
        // On success, redirect to the main menu
        window.location.href = 'index.html';
    }
};

async function initializePage() {
    try {
        const supabase = await getSupabase();
        if (signinForm) {
            signinForm.addEventListener('submit', (e) => handleAuth(e, supabase, 'signInWithPassword'));
        }

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => handleAuth(e, supabase, 'signUp'));
        }
    } catch (error) {
        const errorMessage = error.message || "An unknown error occurred.";
        errorMessageEl.textContent = `Configuration Error: ${errorMessage}`;
        errorMessageEl.classList.remove('hidden');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Unavailable';
        }
        console.error("Auth page initialization failed:", error);
    }
}

// Run the initialization for the auth page
initializePage();
