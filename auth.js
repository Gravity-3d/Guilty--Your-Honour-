import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL and Anon Key must be provided.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const errorMessageEl = document.getElementById('auth-error-message');
const submitBtn = document.getElementById('submit-auth-btn');

const handleAuth = async (event, authFunction) => {
    event.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    submitBtn.disabled = true;
    errorMessageEl.classList.add('hidden');
    errorMessageEl.textContent = '';

    const { error } = await authFunction({ email, password });

    if (error) {
        errorMessageEl.textContent = error.message;
        errorMessageEl.classList.remove('hidden');
        submitBtn.disabled = false;
    } else {
        window.location.href = 'index.html';
    }
};

if (signinForm) {
    signinForm.addEventListener('submit', (e) => handleAuth(e, supabase.auth.signInWithPassword));
}

if (signupForm) {
    signupForm.addEventListener('submit', (e) => handleAuth(e, supabase.auth.signUp));
}
