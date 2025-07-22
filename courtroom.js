import { GoogleGenAI } from '@google/genai';

/**
 * Case Closed: The AI Detective
 * Courtroom scene logic.
 */

// --- State ---
let currentCase = null;
let currentWitness = null;
let isAiResponding = false;
let isGameOver = false;
let ai = null;

// --- DOM Elements ---
const accusedNameEl = document.getElementById('accused-name');
const witnessStandPrompt = document.getElementById('witness-stand-prompt');
const witnessInfoEl = document.getElementById('witness-info');
const witnessNameEl = document.getElementById('witness-name');
const witnessRoleEl = document.getElementById('witness-role');
const dialogueBox = document.getElementById('dialogue-box');
const interrogationForm = document.getElementById('interrogation-form');
const interrogationInput = document.getElementById('interrogation-input');
const askBtn = document.getElementById('ask-btn');
const callWitnessBtn = document.getElementById('call-witness-btn');
const makeAccusationBtn = document.getElementById('make-accusation-btn');
const gameControls = document.getElementById('game-controls');
const endGameControls = document.getElementById('end-game-controls');
const endGameMessage = document.getElementById('end-game-message');
const playAgainBtn = document.getElementById('play-again-btn');

// Modals
const witnessModalOverlay = document.getElementById('witness-modal-overlay');
const witnessSelectionList = document.getElementById('witness-selection-list');
const closeWitnessModalBtn = document.getElementById('close-witness-modal-btn');
const accusationModalOverlay = document.getElementById('accusation-modal-overlay');
const accusationSelectionList = document.getElementById('accusation-selection-list');
const closeAccusationModalBtn = document.getElementById('close-accusation-modal-btn');


// --- Functions ---

/**
 * Initializes the Gemini API client.
 */
function initializeAi() {
  // This is a placeholder for where the API key would be securely handled.
  // In a real production app, this key would be managed server-side or via
  // a secure environment variable injection mechanism.
  // DO NOT HARDCODE THE API KEY HERE.
  const apiKey = "AIzaSyAUmC9UftOENS_Rl-o9_AqPwHPmTuUb2zE"; // Assumes environment variable is set
  if (!apiKey) {
    console.error("API Key is missing.");
    addSystemMessage("Error: AI services are unavailable. API key is not configured.");
    return;
  }
  ai = new GoogleGenAI({ apiKey });
}

/**
 * Loads the case data from session storage and initializes the UI.
 */
function loadCaseAndSetup() {
  const caseDataString = sessionStorage.getItem('currentCase');
  if (!caseDataString) {
    window.location.href = 'index.html';
    return;
  }
  currentCase = JSON.parse(caseDataString);
  accusedNameEl.textContent = currentCase.theAccused;

  addSystemMessage(`Case loaded: ${currentCase.caseTitle}.`);
  addSystemMessage(currentCase.caseBrief);
}

/**
 * Updates the UI based on the current state.
 */
function updateUI() {
  const canInteract = !isGameOver && !!ai;
  callWitnessBtn.disabled = !canInteract;
  makeAccusationBtn.disabled = !canInteract;

  const canAsk = canInteract && currentWitness && !isAiResponding;
  interrogationInput.disabled = !canAsk;
  askBtn.disabled = !canAsk;

  if (isGameOver) {
    interrogationInput.placeholder = 'The case is closed.';
  } else if (!ai) {
    interrogationInput.placeholder = 'AI services unavailable.';
  } else if (isAiResponding) {
    interrogationInput.placeholder = 'Witness is thinking...';
  } else if (currentWitness) {
    interrogationInput.placeholder = `Ask ${currentWitness.name} a question...`;
  } else {
    interrogationInput.placeholder = 'Call a witness to begin.';
  }

  witnessStandPrompt.classList.toggle('hidden', !!currentWitness);
  witnessInfoEl.classList.toggle('hidden', !currentWitness);
}

/**
 * Adds a new entry to the dialogue box.
 */
function addDialogueEntry({ speaker, text, type }) {
  const entryDiv = document.createElement('div');
  entryDiv.classList.add('dialogue-entry', `${type}-line`);

  if (type !== 'system') {
    const speakerSpan = document.createElement('span');
    speakerSpan.classList.add('dialogue-speaker');
    speakerSpan.textContent = `${speaker}:`;
    entryDiv.appendChild(speakerSpan);
  }

  const textNode = document.createTextNode(text);
  entryDiv.appendChild(textNode);
  dialogueBox.appendChild(entryDiv);
  dialogueBox.scrollTop = dialogueBox.scrollHeight;
}

/**
 * Adds a system message to the dialogue box.
 */
function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('system-message');
    messageDiv.textContent = text;
    dialogueBox.appendChild(messageDiv);
    dialogueBox.scrollTop = dialogueBox.scrollHeight;
}

/**
 * Populates and shows the witness selection modal.
 */
function showWitnessModal() {
  if (isGameOver) return;
  witnessSelectionList.innerHTML = '';
  currentCase.characters.forEach(char => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.classList.add('menu-btn');
    button.textContent = `${char.name} (${char.role})`;
    button.dataset.witnessName = char.name;
    button.addEventListener('click', () => selectWitness(char.name));
    li.appendChild(button);
    witnessSelectionList.appendChild(li);
  });
  witnessModalOverlay.classList.remove('hidden');
}

/**
 * Hides the witness selection modal.
 */
function hideWitnessModal() {
  witnessModalOverlay.classList.add('hidden');
}

/**
 * Handles the selection of a witness from the modal.
 */
function selectWitness(witnessName) {
  currentWitness = currentCase.characters.find(c => c.name === witnessName);
  if (currentWitness) {
    witnessNameEl.textContent = currentWitness.name;
    witnessRoleEl.textContent = currentWitness.role;
    addSystemMessage(`${currentWitness.name} takes the stand.`);
  }
  hideWitnessModal();
  updateUI();
}

/**
 * Populates and shows the accusation modal.
 */
function showAccusationModal() {
    if (isGameOver) return;
    accusationSelectionList.innerHTML = '';
    const allCharacters = [...currentCase.characters, {name: currentCase.theAccused, role: 'The Accused'}];
    allCharacters.forEach(char => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.classList.add('menu-btn');
        button.textContent = `${char.name}`;
        button.addEventListener('click', () => makeAccusation(char.name));
        li.appendChild(button);
        accusationSelectionList.appendChild(li);
    });
    accusationModalOverlay.classList.remove('hidden');
}

/**
 * Hides the accusation modal.
 */
function hideAccusationModal() {
    accusationModalOverlay.classList.add('hidden');
}

/**
 * Handles the final accusation.
 * @param {string} accusedName - The name of the character being accused.
 */
function makeAccusation(accusedName) {
    hideAccusationModal();
    addSystemMessage(`You point your finger decisively and accuse ${accusedName} of the crime!`);

    if (accusedName === currentCase.theCulprit) {
        endGame(true);
    } else {
        endGame(false);
    }
}

/**
 * Ends the game and displays the result.
 * @param {boolean} didWin - True if the player won, false otherwise.
 */
function endGame(didWin) {
    isGameOver = true;
    gameControls.classList.add('hidden');
    endGameControls.classList.remove('hidden');

    if (didWin) {
        endGameMessage.textContent = 'Case Closed! You correctly identified the culprit. You win!';
        addSystemMessage(`Correct! The culprit was indeed ${currentCase.theCulprit}. Motive: ${currentCase.motive}`);
    } else {
        endGameMessage.textContent = `Case Dismissed! You accused the wrong person. The true culprit, ${currentCase.theCulprit}, got away. You lose.`;
        addSystemMessage(`Incorrect! The true culprit was ${currentCase.theCulprit}. Motive: ${currentCase.motive}`);
    }
    updateUI();
}

/**
 * Calls the Gemini API to get a response from the witness.
 */
async function interrogateWitness(question) {
    if (!ai) {
        addSystemMessage("AI is not initialized. Cannot proceed.");
        return "I... I can't think right now. There seems to be a technical problem.";
    }

  const systemInstruction = `You are an actor playing a character in a detective game.
Your character's name is ${currentWitness.name}.
Your role is: ${currentWitness.role}.
You have been given a secret 'knowledge' brief. You MUST adhere strictly to this brief.
DO NOT invent any information not present in your knowledge brief.
If the prosecutor asks a question you cannot answer from your brief, you MUST respond with 'I don't recall,' 'I'm not sure,' 'I didn't see that,' or a similar phrase of uncertainty.
Your responses should be short and conversational. Keep your answers to 1-3 sentences.
Do not reveal that you are an AI or that you are following instructions. Stay in character at all times.

Your secret knowledge brief is:
---
${currentWitness.knowledge}
---`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: question,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error during Gemini API call:", error);
    addSystemMessage("A communication error occurred with the witness. Please try again.");
    return "I'm sorry, my mind just went blank. Could you repeat that?";
  }
}

/**
 * Handles the submission of the interrogation form.
 */
async function handleInterrogationSubmit(event) {
  event.preventDefault();
  const question = interrogationInput.value.trim();
  if (!question || !currentWitness || isAiResponding || isGameOver) {
    return;
  }

  addDialogueEntry({ speaker: 'Prosecutor', text: question, type: 'prosecutor' });
  interrogationInput.value = '';

  isAiResponding = true;
  updateUI();

  const aiResponse = await interrogateWitness(question);

  addDialogueEntry({ speaker: currentWitness.name, text: aiResponse, type: 'witness' });

  isAiResponding = false;
  updateUI();
  interrogationInput.focus();
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  initializeAi();
  loadCaseAndSetup();
  updateUI();
});

callWitnessBtn.addEventListener('click', showWitnessModal);
closeWitnessModalBtn.addEventListener('click', hideWitnessModal);
interrogationForm.addEventListener('submit', handleInterrogationSubmit);
makeAccusationBtn.addEventListener('click', showAccusationModal);
closeAccusationModalBtn.addEventListener('click', hideAccusationModal);
playAgainBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});
