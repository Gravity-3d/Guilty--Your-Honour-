
import { getSupabase } from './supabase-client.js';

const MAX_QUESTIONS_PER_TURN = 10;
const MAX_ACCUSATIONS = 3;

let supabase, caseId = null, currentCase = null, currentTurnNumber = 1, currentWitness = null,
    isAiResponding = false, isGameOver = false, currentTurn = 'PROSECUTOR', questionsThisTurn = 0,
    debateTranscript = [], lastQuestion = { speaker: null, text: null },
    prosecutorAccusationAttempts = 0, reasoningModalContext = {};

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
    addSystemMessage(`A critical error occurred with the AI. ${error.message}`);
    isAiResponding = false;
    updateUI();
    return null;
  }
}

async function loadCaseAndSetup() {
  try {
    supabase = await getSupabase();
  } catch (error) {
    addSystemMessage(`Application is not configured correctly: ${error.message}`);
    isGameOver = true;
    updateUI();
    return;
  }
  
  const params = new URLSearchParams(window.location.search);
  caseId = params.get('case_id');

  if (caseId) {
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
    
    debateTranscript.forEach(entry => renderDialogueEntry(entry, false));
    if (debateTranscript.length === 0) {
      displayInitialBriefing();
    }
    if (isGameOver) {
      endGame(caseResult.player_win, "This case has already been closed.");
    }
  } else {
    const guestCaseJSON = sessionStorage.getItem('guestCase');
    if (guestCaseJSON) {
        currentCase = JSON.parse(guestCaseJSON);
        isGameOver = false;
        debateTranscript = [];
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

function setupCourtroomUI() {
    accusedNameEl.textContent = currentCase.theAccused;
    prosecutorStrikesEl.textContent = MAX_ACCUSATIONS - prosecutorAccusationAttempts;
    dialogueBox.innerHTML = '';
}

function displayInitialBriefing() {
    const { publicDossier, caseTitle } = currentCase;
    let briefingText = `<h3>Case Briefing: ${caseTitle}</h3>`;
    briefingText += `<strong>Police Report:</strong> ${publicDossier.policeReport}\n\n`;
    briefingText += `<strong>Initial Statements:</strong>\n`;
    publicDossier.initialStatements.forEach(stmt => {
        briefingText += `- <strong>${stmt.name}:</strong> "${stmt.statement}"\n`;
    });
    addDialogueEntry({ speaker: 'System', text: briefingText, type: 'briefing' });
    addSystemMessage('The Prosecutor may call the first witness.');
}

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
    if (!caseId) return;
    await supabase.from('transcripts').insert({
        case_id: caseId,
        speaker,
        text,
        type,
        turn_number: currentTurnNumber
    });
}

async function getWitnessResponse(question) {
  const response = await callAiHandler('getWitnessResponse', { currentWitness, question });
  return response;
}

async function getDefenseAction() {
  const response = await callAiHandler('getDefenseAction', {
      currentCase, currentWitness, questionsThisTurn, lastQuestion, debateTranscript
  });
  return response || { action: 'pass' };
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
    
    if (defenseMove.action === 'object' && defenseMove.reason && lastQuestion.speaker === 'PROSECUTOR') {
        addDialogueEntry({ speaker: 'Defense', text: `Objection! ${defenseMove.reason}`, type: 'defense' });
        
        isAiResponding = true;
        updateUI();

        const ruling = await callAiHandler('getJudgeRuling', { question: lastQuestion.text, reason: defenseMove.reason });
        addDialogueEntry({ speaker: 'Judge', text: ruling, type: 'judge' });

        if (ruling.toLowerCase().includes('sustained')) {
            addSystemMessage("The Judge sustains the objection. The defense will proceed.");
            lastQuestion = { speaker: null, text: null };
            setTimeout(runDefenseTurn, 1500);
        } else {
            addSystemMessage("The Judge overrules the objection. The defense forfeits its turn.");
            isAiResponding = false;
            setTimeout(nextTurn, 1500);
        }

    } else if (defenseMove.action === 'ask' && defenseMove.question) {
        isAiResponding = false;
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
    } else {
        isAiResponding = false;
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

    if (caseId) {
        await supabase.from('cases').update({ is_complete: true, player_win: didWin }).eq('id', caseId);
    }
    updateUI();
}

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
  if (!canPlayerAct() || !question) return;

  interrogationInput.value = '';
  addDialogueEntry({ speaker: 'Prosecutor', text: question, type: 'prosecutor' });
  lastQuestion = { speaker: 'PROSECUTOR', text: question };

  isAiResponding = true;
  updateUI();

  const aiResponse = await getWitnessResponse(question);

  if (aiResponse) {
    addDialogueEntry({ speaker: currentWitness.name, text: aiResponse, type: 'witness' });
    questionsThisTurn++; // Only increment the counter on a successful response.

    isAiResponding = false;
    if (questionsThisTurn >= MAX_QUESTIONS_PER_TURN) {
      addSystemMessage("You have reached your question limit.");
      nextTurn();
    } else {
      updateUI();
    }
  } else {
    // AI call failed. callAiHandler already adds a system message.
    // This message clarifies that the question was not counted.
    addSystemMessage("Your question was not counted due to a technical error. Please ask again.");
    // The UI state (isAiResponding=false, UI updated) is handled in callAiHandler's catch block.
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
    addSystemMessage('The case goes to the judge for a final ruling...');
    isAiResponding = true;
    updateUI();

    const result = await callAiHandler('getFinalVerdictWithSummary', {
        debateTranscript,
        accusationReason: reason,
        currentCase
    });
    
    if (!result) {
        isAiResponding = false;
        updateUI();
        return;
    }

    const { summary, verdict, reasoning: judgeReasoning } = result;

    addSystemMessage(`--- Case Summary ---\n${summary}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
  loadCaseAndSetup();
  setupEventListeners();
});
