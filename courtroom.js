import { createClient } from '@supabase/supabase-js';

/**
 * Case Closed: The AI Detective
 * Courtroom scene logic for turn-based debate, supporting both
 * authenticated users (with DB persistence) and guests (with session storage).
 */

// --- Supabase Client ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Constants ---
const MAX_QUESTIONS_PER_TURN = 10;
const MAX_ACCUSATIONS = 3;

// --- State ---
let caseId = null; // Will be set for logged-in users
let currentCase = null; // Will hold just case_data
let currentTurnNumber = 1;
let currentWitness = null;
let isAiResponding = false;
let isGameOver = false;
let currentTurn = 'PROSECUTOR'; // PROSECUTOR or DEFENSE
let questionsThisTurn = 0;
let debateTranscript = [];
let lastQuestion = { speaker: null, text: null };
let prosecutorAccusationAttempts = 0;
let reasoningModalContext = { action: null, target: null, callback: null };

// --- DOM Elements ---
const accusedNameEl = document.getElementById('accused-name');
const defenseAttorneyStatusEl = document.getElementById('defense-attorney-status');
const prosecutorStrikesEl = document.getElementById('prosecutor-strikes');
const witnessStandPrompt = document.getElementById('witness-stand-prompt');
const witnessInfoEl = document.getElementById('witness-info');
const witnessNameEl = document.getElementById('witness-name');
const witnessRoleEl = document.getElementById('witness-role');
const dialogueBox = document.getElementById('dialogue-box');
const interrogationForm = document.getElementById('interrogation-form');
const interrogationInput = document.getElementById('interrogation-input');
const askBtn = document.getElementById('ask-btn');
const passBtn = document.getElementById('pass-btn');
const callWitnessBtn = document.getElementById('call-witness-btn');
const objectionBtn = document.getElementById('objection-btn');
const accuseBtn = document.getElementById('accuse-btn');
const turnIndicatorEl = document.getElementById('turn-indicator');
const gameControls = document.getElementById('game-controls');
const endGameControls = document.getElementById('end-game-controls');
const endGameMessage = document.getElementById('end-game-message');
const playAgainBtn = document.getElementById('play-again-btn');
const witnessModalOverlay = document.getElementById('witness-modal-overlay');
const witnessSelectionList = document.getElementById('witness-selection-list');
const closeWitnessModalBtn = document.getElementById('close-witness-modal-btn');
const accusationModalOverlay = document.getElementById('accusation-modal-overlay');
const accusationSelectionList = document.getElementById('accusation-selection-list');
const closeAccusationModalBtn = document.getElementById('close-accusation-modal-btn');
const reasoningModalOverlay = document.getElementById('reasoning-modal-overlay');
const reasoningModalTitle = document.getElementById('reasoning-modal-title');
const reasoningForm = document.getElementById('reasoning-form');
const reasoningTextarea = document.getElementById('reasoning-textarea');
const cancelReasoningBtn = document.getElementById('cancel-reasoning-btn');


// --- Backend AI Handler ---

/**
 * Generic function to call the backend AI handler. Works for both
 * authenticated and guest users.
 * @param {string} action - The type of AI action to perform.
 * @param {object} payload - The data needed for the AI to perform the action.
 * @returns {Promise<any>} The data from the AI's response.
 */
async function callAiHandler(action, payload) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers = { 'Content-Type': 'application/json' };
    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch('/api/ai-handler', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ action, ...payload }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI handler request failed.');
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error(`Error calling AI Handler for action "${action}":`, error);
    addSystemMessage(`A critical error occurred with the AI. ${error.message}`);
    isAiResponding = false;
    updateUI();
    return null;
  }
}

// --- Game Initialization ---

async function loadCaseAndSetup() {
  const params = new URLSearchParams(window.location.search);
  caseId = params.get('case_id');

  if (caseId) {
    // --- Logged-in User Flow: Load from Supabase ---
    const { data: caseResult, error: caseError } = await supabase
      .from('cases')
      .select('*, transcripts(*)')
      .eq('id', caseId)
      .order('created_at', { referencedTable: 'transcripts', ascending: true })
      .single();

    if (caseError || !caseResult) {
      addSystemMessage(`Error loading case: ${caseError?.message || 'Case not found.'}`);
      isGameOver = true;
      updateUI();
      return;
    }

    currentCase = caseResult.case_data;
    isGameOver = caseResult.is_complete;
    debateTranscript = caseResult.transcripts.map(t => ({speaker: t.speaker, text: t.text, type: t.type}));
    
    setupCourtroomUI();
    
    // Restore state from loaded data
    debateTranscript.forEach(entry => renderDialogueEntry(entry, false));
    if (debateTranscript.length === 0) {
      displayInitialBriefing();
    }
    if (isGameOver) {
      endGame(caseResult.player_win, "This case has already been closed.");
    }
  } else {
    // --- Guest User Flow: Load from Session Storage ---
    const guestCaseJSON = sessionStorage.getItem('guestCase');
    if (guestCaseJSON) {
        currentCase = JSON.parse(guestCaseJSON);
        isGameOver = false;
        debateTranscript = []; // Guest always starts fresh
        setupCourtroomUI();
        displayInitialBriefing();
    } else {
        addSystemMessage('No case data found. Returning to main menu...');
        setTimeout(() => window.location.href = 'index.html', 3000);
        return;
    }
  }

  updateUI();
}

/**
 * Populates the UI with the initial case data.
 */
function setupCourtroomUI() {
    accusedNameEl.textContent = currentCase.theAccused;
    prosecutorStrikesEl.textContent = MAX_ACCUSATIONS - prosecutorAccusationAttempts;
    dialogueBox.innerHTML = '';
}

function displayInitialBriefing() {
    let briefingText = `<h3>Case Briefing: ${currentCase.caseTitle}</h3>`;
    briefingText += `${currentCase.caseOverview}\n\n`;
    briefingText += `<strong>Initial Statements:</strong>\n`;
    currentCase.characters.forEach(char => {
        briefingText += `- <strong>${char.name} (${char.role}):</strong> "${char.initialStatement}"\n`;
    });
    addDialogueEntry({ speaker: 'System', text: briefingText, type: 'briefing' });
    addSystemMessage('The Prosecutor may call the first witness.');
}

// --- Dialogue and Transcript Management ---

function renderDialogueEntry({ speaker, text, type }, saveToDb = true) {
  const entryDiv = document.createElement('div');
  let typeClass;
    switch (type) {
        case 'judge': typeClass = 'judge-line'; break;
        case 'system': typeClass = 'system-message'; break;
        case 'briefing': typeClass = 'briefing-message'; break;
        default: typeClass = `${type}-line`;
    }
  entryDiv.classList.add('dialogue-entry', typeClass);
  
  if(!['judge', 'system', 'briefing'].includes(type)) {
    const speakerSpan = document.createElement('span');
    speakerSpan.classList.add('dialogue-speaker');
    speakerSpan.textContent = `${speaker}:`;
    entryDiv.appendChild(speakerSpan);
  }

  if (type === 'briefing') {
    entryDiv.innerHTML = text;
  } else {
    entryDiv.appendChild(document.createTextNode(text));
  }
  
  dialogueBox.appendChild(entryDiv);
  dialogueBox.scrollTop = dialogueBox.scrollHeight;

  // Save the entry to the database ONLY if logged in and not a re-render
  if (saveToDb && type !== 'briefing') {
    saveTranscriptEntry({ speaker, text, type });
  }
}

async function addDialogueEntry(entry) {
    debateTranscript.push(entry);
    renderDialogueEntry(entry, true);
}

function addSystemMessage(text) {
    addDialogueEntry({ speaker: 'System', text: text, type: 'system' });
}

async function saveTranscriptEntry({ speaker, text, type }) {
    if (!caseId) return; // Do not save for guests
    await supabase.from('transcripts').insert({
        case_id: caseId,
        speaker,
        text,
        type,
        turn_number: currentTurnNumber
    });
}

// --- Core Game Logic ---
// Unchanged - these call the AI handler which now supports guests

async function getWitnessResponse(question) {
  const response = await callAiHandler('getWitnessResponse', { currentWitness, question });
  return response || "I... I can't think right now. There seems to be a technical problem.";
}

async function getDefenseAction() {
  const response = await callAiHandler('getDefenseAction', {
      currentCase, currentWitness, questionsThisTurn, lastQuestion, debateTranscript
  });
  return response || { action: 'pass' };
}

async function getJudgeRuling(question, reason) {
  const response = await callAiHandler('getJudgeRuling', { question, reason });
  return (response || "Overruled").trim().replace(/[^a-zA-Z]/g, '');
}

async function getFinalVerdict(summary, accusationReason) {
    const response = await callAiHandler('getFinalVerdict', { summary, accusationReason, currentCase });
    return response || { verdict: "Innocent", reasoning: "Could not contact the Judge."};
}

async function getTranscriptSummary() {
    const response = await callAiHandler('getTranscriptSummary', { debateTranscript });
    return response || "The transcript is unavailable.";
}

function nextTurn() {
    if (isGameOver) return;
    questionsThisTurn = 0;
    currentTurn = (currentTurn === 'PROSECUTOR') ? 'DEFENSE' : 'PROSECUTOR';
    if(currentTurn === 'PROSECUTOR') currentTurnNumber++;
    addSystemMessage(`The turn passes to the ${currentTurn}.`);
    lastQuestion = { speaker: null, text: null };

    if (currentTurn === 'DEFENSE') {
        runDefenseTurn();
    }
    updateUI();
}

async function runDefenseTurn() {
    if (isGameOver) return;
    isAiResponding = true;
    updateUI();
    defenseAttorneyStatusEl.textContent = "The defense is thinking...";
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!currentWitness) {
        addDialogueEntry({ speaker: 'Defense', text: 'I have no questions without a witness. I pass.', type: 'defense' });
        setTimeout(nextTurn, 1500);
        isAiResponding = false;
        updateUI();
        return;
    }
    
    const defenseMove = await getDefenseAction();
    isAiResponding = false; 

    if (defenseMove.action === 'object' && lastQuestion.speaker === 'PROSECUTOR' && defenseMove.reason) {
        // Objections are not yet fully implemented for AI
        addDialogueEntry({ speaker: 'Defense', text: defenseMove.question || "I pass.", type: 'defense' });
        setTimeout(nextTurn, 1500);
    } else if (defenseMove.action === 'ask' && defenseMove.question) {
        const question = defenseMove.question;
        addDialogueEntry({ speaker: 'Defense', text: question, type: 'defense' });
        lastQuestion = { speaker: 'DEFENSE', text: question };
        questionsThisTurn++;
        
        isAiResponding = true;
        updateUI();
        await new Promise(resolve => setTimeout(resolve, 1000));

        const witnessResponse = await getWitnessResponse(question);
        addDialogueEntry({ speaker: currentWitness.name, text: witnessResponse, type: 'witness' });
        isAiResponding = false;

        if (questionsThisTurn >= MAX_QUESTIONS_PER_TURN) {
            addSystemMessage("The Defense has reached its question limit and passes the turn.");
            setTimeout(nextTurn, 1500);
        } else {
            setTimeout(runDefenseTurn, 1000);
        }
    } else { // Pass
        addDialogueEntry({ speaker: 'Defense', text: "I pass the turn.", type: 'defense' });
        setTimeout(nextTurn, 1500);
    }
    updateUI();
}

async function endGame(didWin, verdictMessage = '') {
    if (isGameOver) return;
    isGameOver = true;
    gameControls.classList.add('hidden');
    endGameControls.classList.remove('hidden');

    if (didWin) {
        endGameMessage.textContent = 'Case Closed! You win!';
        addSystemMessage(verdictMessage || `Correct! The culprit was indeed ${currentCase.theCulprit}.`);
    } else {
        endGameMessage.textContent = 'Case Dismissed! You lose.';
        addSystemMessage(verdictMessage || `You failed to prove your case. The culprit, ${currentCase.theCulprit}, gets away.`);
    }

    // Update case in Supabase only if it's a saved game
    if (caseId) {
        await supabase.from('cases').update({ is_complete: true, player_win: didWin }).eq('id', caseId);
    }
    // For guests, game ends here. Closing the tab will clear the session.
    updateUI();
}

// --- UI Management & Event Handlers ---

function updateUI() {
    const questionsLeft = MAX_QUESTIONS_PER_TURN - questionsThisTurn;
    const isPlayerTurn = !isGameOver && !isAiResponding && currentTurn === 'PROSECUTOR';
    const canPlayerAct = isPlayerTurn && !!currentWitness;

    interrogationInput.disabled = !canPlayerAct;
    askBtn.disabled = !canPlayerAct;
    passBtn.disabled = !isPlayerTurn;
    callWitnessBtn.disabled = isAiResponding || isGameOver || !isPlayerTurn;
    accuseBtn.disabled = isAiResponding || isGameOver || !isPlayerTurn;
    objectionBtn.disabled = !isPlayerTurn || lastQuestion.speaker !== 'DEFENSE';

    prosecutorStrikesEl.textContent = MAX_ACCUSATIONS - prosecutorAccusationAttempts;
    turnIndicatorEl.className = `turn-indicator ${currentTurn === 'PROSECUTOR' ? 'turn-prosecutor' : 'turn-defense'}`;
    turnIndicatorEl.textContent = isGameOver ? "The trial has concluded." : `Turn: ${currentTurn} (${questionsLeft} questions left)`;
    
    witnessStandPrompt.classList.toggle('hidden', !!currentWitness);
    witnessInfoEl.classList.toggle('hidden', !currentWitness);

    if (isAiResponding) {
        interrogationInput.placeholder = 'Waiting for AI response...';
        defenseAttorneyStatusEl.textContent = 'The defense is thinking...';
    } else if (isPlayerTurn) {
        interrogationInput.placeholder = currentWitness ? `Ask ${currentWitness.name}...` : 'Call a witness to begin.';
        defenseAttorneyStatusEl.textContent = 'The defense is observing...';
    } else {
        interrogationInput.placeholder = 'The Defense is questioning...';
        defenseAttorneyStatusEl.textContent = 'The defense is questioning...';
    }
}

async function handlePlayerAsk(event) {
  event.preventDefault();
  const question = interrogationInput.value.trim();
  if (!question || !canPlayerAct()) return;

  interrogationInput.value = '';
  addDialogueEntry({ speaker: 'Prosecutor', text: question, type: 'prosecutor' });
  lastQuestion = { speaker: 'PROSECUTOR', text: question };
  questionsThisTurn++;

  isAiResponding = true;
  updateUI();

  const aiResponse = await getWitnessResponse(question);
  addDialogueEntry({ speaker: currentWitness.name, text: aiResponse, type: 'witness' });

  isAiResponding = false;
  if (questionsThisTurn >= MAX_QUESTIONS_PER_TURN) {
    addSystemMessage("You have reached your question limit.");
    nextTurn();
  } else {
    updateUI();
  }
  interrogationInput.focus();
}

function canPlayerAct() {
    return !isGameOver && !isAiResponding && currentTurn === 'PROSECUTOR' && !!currentWitness;
}

async function handleFinalAccusation(accusedName, reason) {
    prosecutorAccusationAttempts++;
    updateUI();
    addSystemMessage(`You point your finger decisively and accuse ${accusedName} of the crime!`);
    addDialogueEntry({ speaker: 'Prosecutor', text: reason, type: 'prosecutor' });
    addSystemMessage('The case goes to the judge...');
    isAiResponding = true;
    updateUI();

    const summary = await getTranscriptSummary();
    addSystemMessage(`--- Case Summary ---\n${summary}`);
    
    const { verdict, reasoning: judgeReasoning } = await getFinalVerdict(summary, reason);
    addDialogueEntry({ speaker: 'Judge', text: `On the charge against ${accusedName}, I find them... ${verdict}! ${judgeReasoning}`, type: 'judge' });

    const correctAccusation = accusedName === currentCase.theCulprit;
    const guiltyVerdict = verdict.toLowerCase().includes('guilty');
    
    if (correctAccusation && guiltyVerdict) {
        endGame(true, `The Judge finds ${accusedName} GUILTY!`);
    } else {
        if (prosecutorAccusationAttempts >= MAX_ACCUSATIONS) {
            endGame(false, `You have made ${MAX_ACCUSATIONS} unsuccessful accusations. The case is dismissed.`);
        } else {
            addSystemMessage(`Your accusation has failed. The trial continues. You have ${MAX_ACCUSATIONS - prosecutorAccusationAttempts} attempts remaining.`);
            isAiResponding = false;
            nextTurn();
        }
    }
}

function showWitnessModal() {
  if (isGameOver || isAiResponding) return;
  witnessSelectionList.innerHTML = '';
  currentCase.characters.forEach(char => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.classList.add('menu-btn');
    button.textContent = `${char.name} (${char.role})`;
    button.addEventListener('click', () => selectWitness(char.name));
    li.appendChild(button);
    witnessSelectionList.appendChild(li);
  });
  witnessModalOverlay.classList.remove('hidden');
}
function hideWitnessModal() { witnessModalOverlay.classList.add('hidden'); }
function selectWitness(witnessName) {
  currentWitness = currentCase.characters.find(c => c.name === witnessName);
  if (currentWitness) {
    witnessNameEl.textContent = currentWitness.name;
    witnessRoleEl.textContent = currentWitness.role;
    addSystemMessage(`${currentWitness.name} takes the stand.`);
  }
  hideWitnessModal();
  updateUI();
  interrogationInput.focus();
}
function showAccusationModal() {
    if (isGameOver || isAiResponding) return;
    accusationSelectionList.innerHTML = '';
    currentCase.characters.forEach(char => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.classList.add('menu-btn');
        button.textContent = `${char.name}${char.name === currentCase.theAccused ? ' (The Accused)' : ''}`;
        button.addEventListener('click', () => handleAccusation(char.name));
        li.appendChild(button);
        accusationSelectionList.appendChild(li);
    });
    accusationModalOverlay.classList.remove('hidden');
}
function hideAccusationModal() { accusationModalOverlay.classList.add('hidden'); }
function showReasoningModal(action, target, callback) {
    reasoningModalContext = { action, target, callback };
    reasoningModalTitle.textContent = action === 'objection' ? "State Your Reason for Objecting" : `Argument for Accusing ${target}`;
    reasoningTextarea.value = '';
    reasoningModalOverlay.classList.remove('hidden');
    reasoningTextarea.focus();
}
function hideReasoningModal() { reasoningModalOverlay.classList.add('hidden'); }
function handleAccusation(accusedName) {
    hideAccusationModal();
    showReasoningModal('accusation', accusedName, (reason) => {
        handleFinalAccusation(accusedName, reason);
    });
}

function setupEventListeners() {
    callWitnessBtn.addEventListener('click', showWitnessModal);
    closeWitnessModalBtn.addEventListener('click', hideWitnessModal);
    interrogationForm.addEventListener('submit', handlePlayerAsk);
    passBtn.addEventListener('click', nextTurn);
    accuseBtn.addEventListener('click', showAccusationModal);
    closeAccusationModalBtn.addEventListener('click', hideAccusationModal);
    playAgainBtn.addEventListener('click', () => { window.location.href = 'index.html'; });

    reasoningForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const reason = reasoningTextarea.value.trim();
        if (reason && reasoningModalContext.callback) {
            reasoningModalContext.callback(reason);
        }
        hideReasoningModal();
    });
    cancelReasoningBtn.addEventListener('click', hideReasoningModal);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      addSystemMessage("Application is not configured correctly.");
      isGameOver = true;
      updateUI();
      return;
  }
  loadCaseAndSetup();
  setupEventListeners();
});