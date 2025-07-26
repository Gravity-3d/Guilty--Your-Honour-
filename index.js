

import { getSupabase } from './supabase-client.js';

let supabase;
let currentUser = null;
let pollingInterval = null;

// --- DOM Elements ---
const authNav = document.getElementById('auth-nav');
const mainMenuContent = document.getElementById('main-menu-content');
const subtitleEl = document.querySelector('.subtitle');
const generationContainer = document.getElementById('generation-view-container');
const titleEl = document.getElementById('generated-case-title');
const briefEl = document.getElementById('generated-case-brief');
const charactersContainer = document.getElementById('generated-characters');
const charactersListEl = document.getElementById('generated-characters-list');
const footerEl = document.getElementById('generation-footer');
const statusEl = document.getElementById('generation-status');
const proceedBtn = document.getElementById('proceed-to-courtroom-btn');


/**
 * Updates the header navigation based on user's auth state.
 */
function updateUIForAuthState(user) {
  if (user) {
    authNav.innerHTML = `
      <span>${user.email}</span>
      <span class="separator">/</span>
      <button id="signout-btn">Sign Out</button>
    `;
    document.getElementById('signout-btn').addEventListener('click', handleSignOut);
  } else {
    authNav.innerHTML = `
      <a href="signin.html">Sign In</a>
      <span class="separator">/</span>
      <a href="signup.html">Create Account</a>
    `;
  }
}

async function handleSignOut() {
  await supabase.auth.signOut();
  window.location.reload();
}

/**
 * Renders the final case data to the UI.
 */
function displayCaseData(caseData) {
    titleEl.textContent = caseData.caseTitle;
    briefEl.textContent = caseData.caseBrief;
    charactersListEl.innerHTML = '';
    caseData.characters.forEach(char => {
        const li = document.createElement('li');
        li.className = 'character-dossier';
        li.innerHTML = `<h4>${char.name}</h4><p><strong>Role:</strong> ${char.role}</p><p><strong>Initial Statement:</strong> "${char.initialStatement}"</p>`;
        charactersListEl.appendChild(li);
    });
    charactersContainer.classList.remove('hidden');
    footerEl.classList.remove('hidden');
    proceedBtn.classList.remove('hidden');
}


function pollForCaseStatus(caseId, userType) {
    if (pollingInterval) clearInterval(pollingInterval);

    pollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/poll-case?caseId=${caseId}&userType=${userType}`);
            if (!response.ok) {
                 throw new Error(`Server poll failed with status ${response.status}`);
            }
            const data = await response.json();

            switch (data.status) {
                case 'PENDING':
                    // Still waiting, do nothing.
                    break;
                case 'READY':
                    clearInterval(pollingInterval);
                    titleEl.textContent = 'Case File Received!';
                    briefEl.textContent = 'Review the dossier below and proceed when ready.';
                    displayCaseData(data.case_data);
                    
                    if (userType === 'guest') {
                        statusEl.textContent = 'Case file ready. This is a guest session and will not be saved.';
                        sessionStorage.setItem('guestCase', JSON.stringify(data.case_data));
                        proceedBtn.onclick = () => window.location.href = 'courtroom.html';
                    } else { // auth user
                        statusEl.textContent = 'Case file ready. Your progress is saved automatically.';
                        // No need to save to session, courtroom will fetch from DB.
                        proceedBtn.onclick = () => window.location.href = `courtroom.html?case_id=${caseId}`;
                    }
                    break;
                case 'FAILED':
                    clearInterval(pollingInterval);
                    titleEl.textContent = 'Error Generating Case';
                    briefEl.textContent = 'There was a problem communicating with the AI. Please try again.';
                    footerEl.classList.add('hidden');
                    // Maybe add a 'try again' button that reloads the page.
                    break;
            }
        } catch (error) {
            console.error("Error during polling:", error);
            clearInterval(pollingInterval);
            titleEl.textContent = 'Connection Error';
            briefEl.textContent = `Could not get case status: ${error.message}. Please check your connection and refresh.`;
        }
    }, 3000); // Poll every 3 seconds
}

/**
 * Handles the click event for the "Start New Case" button.
 * Implements an asynchronous polling flow to avoid timeouts.
 */
async function handleStartNewCase() {
    // 1. Update UI to show generation view
    mainMenuContent.classList.add('hidden');
    subtitleEl.classList.add('hidden');
    generationContainer.classList.remove('hidden');
    
    try {
        // 2. Initiate the case generation
        const initResponse = await fetch('/api/initiate-case', { method: 'POST' });

        if (!initResponse.ok) throw new Error(`Failed to initiate case: ${await initResponse.text()}`);
        const { caseId, userType } = await initResponse.json();
        
        // UI update for processing
        titleEl.textContent = 'Generating Case Dossier...';
        briefEl.textContent = 'The AI is on the job, crafting a new mystery. This may take a moment.';

        // 3. Trigger the background processing (fire-and-forget)
        fetch('/api/process-case', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caseId, userType })
        });
        
        // 4. Start polling for the result
        pollForCaseStatus(caseId, userType);

    } catch (error) {
        console.error("Error starting new case:", error);
        titleEl.textContent = 'Error Starting Case';
        briefEl.textContent = `A problem occurred: ${error.message}. Please try refreshing the page.`;
    }
}


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

    document.getElementById('start-new-case-btn').addEventListener('click', handleStartNewCase);

    supabase.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user ?? null;
        updateUIForAuthState(currentUser);
    });

    // Cleanup polling on page leave
    window.addEventListener('beforeunload', () => {
        if (pollingInterval) clearInterval(pollingInterval);
    });
});
