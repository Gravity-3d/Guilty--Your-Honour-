

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
 * Handles the click event for the "Start New Case" button.
 * Switches to a streaming view and processes the case data as it arrives.
 */
async function handleStartNewCase() {
  // 1. Update UI to show generation view
  mainMenuContent.classList.add('hidden');
  subtitleEl.classList.add('hidden');
  const generationContainer = document.getElementById('generation-view-container');
  generationContainer.classList.remove('hidden');
  
  const titleEl = document.getElementById('generated-case-title');
  const briefEl = document.getElementById('generated-case-brief');
  const charactersContainer = document.getElementById('generated-characters');
  const charactersListEl = document.getElementById('generated-characters-list');
  const footerEl = document.getElementById('generation-footer');
  const statusEl = document.getElementById('generation-status');
  const proceedBtn = document.getElementById('proceed-to-courtroom-btn');

  const fullCaseObject = { characters: [] };
  let buffer = '';

  try {
    const response = await fetch('/api/generate-case');
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // 2. Read and process the stream
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last, potentially incomplete line

      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const chunk = JSON.parse(line);
          // 3. Update UI and build case object with each chunk
          switch (chunk.key) {
            case 'caseTitle':
              fullCaseObject.caseTitle = chunk.value;
              titleEl.textContent = chunk.value;
              break;
            case 'caseBrief':
              fullCaseObject.caseBrief = chunk.value;
              briefEl.textContent = chunk.value;
              break;
            case 'caseOverview':
              fullCaseObject.caseOverview = chunk.value;
              break;
            case 'theCulprit':
              fullCaseObject.theCulprit = chunk.value;
              break;
            case 'theAccused':
              fullCaseObject.theAccused = chunk.value;
              break;
            case 'motive':
              fullCaseObject.motive = chunk.value;
              break;
            case 'character':
              fullCaseObject.characters.push(chunk.value);
              charactersContainer.classList.remove('hidden');
              const char = chunk.value;
              const li = document.createElement('li');
              li.className = 'character-dossier';
              li.innerHTML = `<h4>${char.name}</h4><p><strong>Role:</strong> ${char.role}</p><p><strong>Initial Statement:</strong> "${char.initialStatement}"</p>`;
              charactersListEl.appendChild(li);
              break;
          }
        } catch (e) {
          console.warn('Could not parse JSON line:', line, e);
        }
      }
    }

    // 4. Finalize after stream has finished
    footerEl.classList.remove('hidden');

    if (currentUser) {
      statusEl.textContent = 'Case generation complete. Saving to your case files...';
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("User session not found. Cannot save case.");
      
      const saveResponse = await fetch('/api/ai-handler', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
              action: 'saveCase',
              caseData: fullCaseObject
          })
      });

      if (!saveResponse.ok) {
          const err = await saveResponse.json();
          throw new Error(`Failed to save the case file: ${err.error}`);
      }

      const savedCase = await saveResponse.json();
      statusEl.textContent = 'Case saved successfully!';
      proceedBtn.classList.remove('hidden');
      proceedBtn.onclick = () => window.location.href = `courtroom.html?case_id=${savedCase.data.id}`;

    } else {
      statusEl.textContent = 'Case generation complete!';
      sessionStorage.setItem('guestCase', JSON.stringify(fullCaseObject));
      proceedBtn.classList.remove('hidden');
      proceedBtn.onclick = () => window.location.href = 'courtroom.html';
    }

  } catch (error) {
    console.error("Error during case generation stream:", error);
    titleEl.textContent = 'Error Generating Case';
    briefEl.textContent = `A problem occurred: ${error.message}. Please try refreshing the page.`;
    footerEl.classList.add('hidden');
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