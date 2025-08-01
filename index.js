
import { getSupabase } from './supabase-client.js';

let supabase;
let currentUser = null;
let pollingInterval = null;

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
                    } else {
                        statusEl.textContent = 'Case file ready. Your progress is saved automatically.';
                        proceedBtn.onclick = () => window.location.href = `courtroom.html?case_id=${caseId}`;
                    }
                    break;
                case 'FAILED':
                    clearInterval(pollingInterval);
                    titleEl.textContent = 'Error Generating Case';
                    briefEl.textContent = 'There was a problem communicating with the AI. Please try again.';
                    footerEl.classList.add('hidden');
                    break;
            }
        } catch (error) {
            clearInterval(pollingInterval);
            titleEl.textContent = 'Connection Error';
            briefEl.textContent = `Could not get case status: ${error.message}. Please check your connection and refresh.`;
        }
    }, 3000);
}

async function handleStartNewCase() {
    mainMenuContent.classList.add('hidden');
    subtitleEl.classList.add('hidden');
    generationContainer.classList.remove('hidden');
    
    try {
        const headers = { 'Content-Type': 'application/json' };
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const initResponse = await fetch('/api/initiate-case', { 
            method: 'POST',
            headers: headers
        });

        if (!initResponse.ok) throw new Error(`Failed to initiate case: ${await initResponse.text()}`);
        const { caseId, userType } = await initResponse.json();
        
        titleEl.textContent = 'Generating Case Dossier...';
        briefEl.textContent = 'The AI is on the job, crafting a new mystery. This may take a moment.';

        fetch('/api/process-case', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caseId, userType })
        });
        
        pollForCaseStatus(caseId, userType);

    } catch (error) {
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
        return;
    }

    document.getElementById('start-new-case-btn').addEventListener('click', handleStartNewCase);

    supabase.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user ?? null;
        updateUIForAuthState(currentUser);
    });

    window.addEventListener('beforeunload', () => {
        if (pollingInterval) clearInterval(pollingInterval);
    });
});
