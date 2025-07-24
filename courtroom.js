
import { GoogleGenAI, Type } from '@google/genai';

/**
 * Case Closed: The AI Detective
 * Courtroom scene logic for turn-based debate.
 */

// --- Constants ---
const API_KEY = "AIzaSyAUmC9UftOENS_Rl-o9_AqPwHPmTuUb2zE";
const MAX_QUESTIONS_PER_TURN = 10;

// --- State ---
let currentCase = null;
let currentWitness = null;
let isAiResponding = false;
let isGameOver = false;
let ai = null;
let currentTurn = 'PROSECUTOR'; // PROSECUTOR or DEFENSE
let questionsThisTurn = 0;
let debateTranscript = [];
let lastQuestion = { speaker: null, text: null };


// --- DOM Elements ---
const accusedNameEl = document.getElementById('accused-name');
const defenseAttorneyStatusEl = document.getElementById('defense-attorney-status');
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

// Modals
const witnessModalOverlay = document.getElementById('witness-modal-overlay');
const witnessSelectionList = document.getElementById('witness-selection-list');
const closeWitnessModalBtn = document.getElementById('close-witness-modal-btn');
const accusationModalOverlay = document.getElementById('accusation-modal-overlay');
const accusationSelectionList = document.getElementById('accusation-selection-list');
const closeAccusationModalBtn = document.getElementById('close-accusation-modal-btn');


// --- AI Persona Functions ---

/**
 * Initializes the Gemini API client.
 */
function initializeAi() {
  try {
    if (!API_KEY) throw new Error("API Key is missing.");
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } catch (error) {
    console.error("AI Initialization Error:", error);
    addSystemMessage("Error: AI services are unavailable. API key is not configured.");
    isGameOver = true;
  }
}

async function getWitnessResponse(question) {
  if (!ai) return "I... I can't think right now. There seems to be a technical problem.";
  const systemInstruction = `You are an actor playing a character in a detective game.
Your character's name is ${currentWitness.name}.
Your role is: ${currentWitness.role}.
You have been given a secret 'knowledge' brief. You MUST adhere strictly to it.
DO NOT invent any information not present in your secret brief.
If a question you cannot answer from your brief is asked, you MUST respond with 'I don't recall,' 'I'm not sure,' or a similar phrase of uncertainty.
Your responses should be short and conversational (1-3 sentences). Stay in character at all times.
---
SECRET KNOWLEDGE BRIEF:
${currentWitness.knowledge}
---`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', contents: question, config: { systemInstruction }
    });
    return response.text;
  } catch (error) {
    console.error("Witness AI Error:", error);
    return "I'm sorry, my mind just went blank. Could you repeat that?";
  }
}

async function getDefenseAction() {
    if (!ai) return { action: 'pass' };
    const systemInstruction = `You are a sharp defense attorney AI. Your client, ${currentCase.theAccused}, is the real culprit. Your goal is to defend them by creating reasonable doubt. It is your turn. The current witness is ${currentWitness.name}. You have asked ${questionsThisTurn} questions this turn (max ${MAX_QUESTIONS_PER_TURN}).
Here is the debate transcript so far:
---
${debateTranscript.map(d => `${d.speaker}: ${d.text}`).join('\n')}
---
Based on the transcript, decide your next move. You can 'ask' the witness a question to create doubt, or 'pass' your turn. Respond in JSON format.
Example for asking: { "action": "ask", "question": "You said you saw my client by the window, but what was the lighting like?" }
Example for passing: { "action": "pass" }`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'What is your next move?',
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        action: { type: Type.STRING },
                        question: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Defense AI Error:", error);
        return { action: 'pass' }; // Default to passing on error
    }
}

async function getJudgeRuling(statement) {
    if (!ai) return "Overruled";
    const systemInstruction = `You are an impartial Judge. A counsel has objected to the opposing counsel's last question. You must decide if the objection is valid. The question is: "${statement}". Respond with only one word: "Sustained" (if the question is improper, leading, or repetitive) or "Overruled" (if it is a fair question).`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: 'Your ruling?', config: { systemInstruction }
        });
        return response.text.trim().replace(/[^a-zA-Z]/g, ''); // Clean up response
    } catch (error) {
        console.error("Judge AI (Ruling) Error:", error);
        return "Overruled";
    }
}

async function getFinalVerdict(summary) {
    if (!ai) return "Innocent";
    const systemInstruction = `You are an impartial Judge. Based *only* on the following debate summary, you must decide if the prosecutor has proven beyond a reasonable doubt that ${currentCase.theAccused} is guilty. Respond with only one word: "Guilty" if the case is proven, or "Innocent" if there is reasonable doubt.
---
DEBATE SUMMARY:
${summary}
---`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: `Based on the summary, is ${currentCase.theAccused} guilty?`, config: { systemInstruction }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Judge AI (Verdict) Error:", error);
        return "Innocent";
    }
}

async function getTranscriptSummary() {
    if (!ai) return "The transcript is unavailable.";
    const systemInstruction = `You are a court clerk. Summarize the following debate transcript into a concise, neutral summary of the key evidence and arguments. Focus on the facts presented.`;
    const fullTranscript = debateTranscript.map(d => `${d.speaker}: ${d.text}`).join('\n');
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: fullTranscript, config: { systemInstruction }
        });
        return response.text;
    } catch (error) {
        console.error("Summarizer AI Error:", error);
        return fullTranscript; // Return full transcript on error
    }
}


// --- Game Flow & Turn Management ---

function loadCaseAndSetup() {
  const caseDataString = sessionStorage.getItem('currentCase');
  if (!caseDataString) {
    window.location.href = 'index.html';
    return;
  }
  currentCase = JSON.parse(caseDataString);
  accusedNameEl.textContent = currentCase.theAccused;

  addSystemMessage(`Case loaded: ${currentCase.caseTitle}. The trial begins.`);
  addSystemMessage(`The Prosecutor may call the first witness.`);
  updateUI();
}

function nextTurn() {
    if (isGameOver) return;
    questionsThisTurn = 0;
    currentTurn = (currentTurn === 'PROSECUTOR') ? 'DEFENSE' : 'PROSECUTOR';
    addSystemMessage(`The turn passes to the ${currentTurn}.`);

    if (currentTurn === 'DEFENSE') {
        runDefenseTurn();
    }
    updateUI();
}

async function runDefenseTurn() {
    if (!currentWitness) {
        addDialogueEntry({ speaker: 'Defense', text: 'I pass the turn until a witness is on the stand.', type: 'defense' });
        setTimeout(nextTurn, 1500);
        return;
    }
    isAiResponding = true;
    updateUI();
    defenseAttorneyStatusEl.textContent = "The defense is thinking...";

    const defenseMove = await getDefenseAction();

    if (defenseMove.action === 'ask' && defenseMove.question) {
        const question = defenseMove.question;
        addDialogueEntry({ speaker: 'Defense', text: question, type: 'defense' });
        lastQuestion = { speaker: 'DEFENSE', text: question };
        questionsThisTurn++;
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Dramatic pause

        const witnessResponse = await getWitnessResponse(question);
        addDialogueEntry({ speaker: currentWitness.name, text: witnessResponse, type: 'witness' });

        if (questionsThisTurn >= MAX_QUESTIONS_PER_TURN) {
            addSystemMessage("The Defense has reached its question limit and passes the turn.");
            setTimeout(nextTurn, 1500);
        } else {
            // Potentially make another move
            setTimeout(runDefenseTurn, 1000);
        }
    } else {
        addDialogueEntry({ speaker: 'Defense', text: "I pass the turn.", type: 'defense' });
        setTimeout(nextTurn, 1500);
    }
    isAiResponding = false;
    updateUI();
}


function endGame(didWin, verdictMessage = '') {
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
    updateUI();
}

// --- UI & Dialogue Management ---

function updateUI() {
    const questionsLeft = MAX_QUESTIONS_PER_TURN - questionsThisTurn;
    const isPlayerTurn = !isGameOver && !isAiResponding && currentTurn === 'PROSECUTOR';
    const canPlayerAct = isPlayerTurn && !!currentWitness;

    interrogationInput.disabled = !canPlayerAct;
    askBtn.disabled = !canPlayerAct;
    passBtn.disabled = !isPlayerTurn;
    callWitnessBtn.disabled = isAiResponding || isGameOver;
    accuseBtn.disabled = isAiResponding || isGameOver;
    objectionBtn.disabled = !isPlayerTurn || lastQuestion.speaker !== 'DEFENSE';

    turnIndicatorEl.textContent = isGameOver ? "The trial has concluded." : `Turn: ${currentTurn} (${questionsLeft} questions left)`;
    turnIndicatorEl.className = `turn-indicator ${currentTurn === 'PROSECUTOR' ? 'turn-prosecutor' : 'turn-defense'}`;

    if (isAiResponding) {
        interrogationInput.placeholder = 'Waiting for response...';
        defenseAttorneyStatusEl.textContent = 'The defense is thinking...';
    } else if (!currentWitness) {
        interrogationInput.placeholder = 'Call a witness to begin.';
    } else if (isPlayerTurn) {
        interrogationInput.placeholder = `Ask ${currentWitness.name} a question...`;
        defenseAttorneyStatusEl.textContent = 'The defense is observing...';
    } else { // Defense turn
        interrogationInput.placeholder = 'The Defense is questioning the witness...';
        defenseAttorneyStatusEl.textContent = 'The defense is questioning...';
    }

    witnessStandPrompt.classList.toggle('hidden', !!currentWitness);
    witnessInfoEl.classList.toggle('hidden', !currentWitness);
}

function addDialogueEntry({ speaker, text, type }) {
  const entry = { speaker, text, type };
  debateTranscript.push(entry);

  const entryDiv = document.createElement('div');
  const typeClass = type === 'judge' ? 'judge-line' : `${type}-line`;
  entryDiv.classList.add('dialogue-entry', typeClass);
  
  if(type !== 'judge') {
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

function addSystemMessage(text) {
    addDialogueEntry({ speaker: 'System', text: text, type: 'system' });
}


// --- Modal Functions ---

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

function hideWitnessModal() {
  witnessModalOverlay.classList.add('hidden');
}

function selectWitness(witnessName) {
  currentWitness = currentCase.characters.find(c => c.name === witnessName);
  if (currentWitness) {
    witnessNameEl.textContent = currentWitness.name;
    witnessRoleEl.textContent = currentWitness.role;
    addSystemMessage(`${currentWitness.name} takes the stand.`);
  }
  hideWitnessModal();
  if (currentTurn === 'DEFENSE') {
      runDefenseTurn();
  }
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
        const isAccused = char.name === currentCase.theAccused ? ' (The Accused)' : '';
        button.textContent = `${char.name}${isAccused}`;
        button.addEventListener('click', () => handleAccusation(char.name));
        li.appendChild(button);
        accusationSelectionList.appendChild(li);
    });
    accusationModalOverlay.classList.remove('hidden');
}

function hideAccusationModal() {
    accusationModalOverlay.classList.add('hidden');
}


// --- Action Handlers ---

async function handlePlayerAsk(event) {
  event.preventDefault();
  const question = interrogationInput.value.trim();
  if (!question || !canPlayerAct()) return;

  addDialogueEntry({ speaker: 'Prosecutor', text: question, type: 'prosecutor' });
  lastQuestion = { speaker: 'PROSECUTOR', text: question };
  interrogationInput.value = '';
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

async function handleObjection() {
    addSystemMessage(`The Prosecutor objects to the Defense's last question: "${lastQuestion.text}"`);
    isAiResponding = true;
    updateUI();

    const ruling = await getJudgeRuling(lastQuestion.text);
    addDialogueEntry({ speaker: 'Judge', text: `Objection ${ruling}!`, type: 'judge' });

    if (ruling.toLowerCase() === 'overruled') {
        const witnessResponse = await getWitnessResponse(lastQuestion.text);
        addDialogueEntry({ speaker: currentWitness.name, text: witnessResponse, type: 'witness' });
    } else {
        addSystemMessage("The witness will not answer the question.");
    }
    lastQuestion = { speaker: null, text: null }; // Reset last question after objection
    isAiResponding = false;
    updateUI();
}

async function handleAccusation(accusedName) {
    hideAccusationModal();
    addSystemMessage(`You point your finger decisively and accuse ${accusedName} of the crime! The case goes to the judge...`);
    isAiResponding = true;
    updateUI();

    const summary = await getTranscriptSummary();
    addSystemMessage(`--- Case Summary ---\n${summary}`);
    
    const verdict = await getFinalVerdict(summary);
    addDialogueEntry({ speaker: 'Judge', text: `On the charge against ${accusedName}, I find them... ${verdict}!`, type: 'judge' });

    const correctAccusation = accusedName === currentCase.theCulprit;
    const guiltyVerdict = verdict.toLowerCase().includes('guilty');
    
    endGame(correctAccusation && guiltyVerdict, `The Judge finds ${accusedName} ${verdict}!`);
}


// --- Event Listeners & Initialization ---

function setupEventListeners() {
    callWitnessBtn.addEventListener('click', showWitnessModal);
    closeWitnessModalBtn.addEventListener('click', hideWitnessModal);
    interrogationForm.addEventListener('submit', handlePlayerAsk);
    passBtn.addEventListener('click', nextTurn);
    objectionBtn.addEventListener('click', handleObjection);
    accuseBtn.addEventListener('click', showAccusationModal);
    closeAccusationModalBtn.addEventListener('click', hideAccusationModal);
    playAgainBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeAi();
  loadCaseAndSetup();
  setupEventListeners();
});