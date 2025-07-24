

import { GoogleGenAI, Type } from "@google/genai";

/**
 * Case Closed: The AI Detective
 * Main menu and case generation logic.
 */

// --- Constants ---
const API_KEY = "AIzaSyAUmC9UftOENS_Rl-o9_AqPwHPmTuUb2zE";

// --- State ---
let ai = null;

// --- DOM Elements ---
const mainContent = document.getElementById('main-content');
const startNewCaseBtn = document.getElementById('start-new-case-btn');
const subtitleEl = document.querySelector('.subtitle');

// --- AI Initialization ---

/**
 * Initializes the Gemini API client.
 */
function initializeAi() {
    try {
        if (!API_KEY) {
            throw new Error("API Key is missing.");
        }
        ai = new GoogleGenAI({ apiKey: API_KEY });
        startNewCaseBtn.disabled = false;
        subtitleEl.textContent = "The AI Detective";
    } catch (error) {
        console.error("AI Initialization Error:", error);
        startNewCaseBtn.disabled = true;
        startNewCaseBtn.textContent = 'AI Offline';
        subtitleEl.innerHTML = 'Could not connect to AI services.';
    }
}

// --- Case Generation ---

/**
 * Creates a new case by calling the Gemini API.
 * @returns {Promise<object|null>} The generated case data, or null on failure.
 */
async function generateNewCaseViaAi() {
  if (!ai) {
    console.error("AI not initialized.");
    return null;
  }

  const caseSchema = {
    type: Type.OBJECT,
    properties: {
      caseTitle: { type: Type.STRING, description: "A catchy, noir-style title for the case. e.g., 'The Case of the Contraband Cabbage'." },
      caseBrief: { type: Type.STRING, description: "A 2-3 sentence brief of the crime. Introduce the setting and the core mystery." },
      caseOverview: { type: Type.STRING, description: "A detailed paragraph describing the crime scene, undisputed facts, and context for the player before the trial starts." },
      theCulprit: { type: Type.STRING, description: "The name of the character who is the true culprit. This must be one of the characters generated below." },
      theAccused: { type: Type.STRING, description: "The name of the character accused of the crime. For this game, this MUST be the same person as theCulprit." },
      motive: { type: Type.STRING, description: "A plausible, yet slightly silly, motive for the culprit." },
      characters: {
        type: Type.ARRAY,
        description: "A list of 3-4 characters involved in the case.",
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "The character's full name." },
            role: { type: Type.STRING, description: "The character's role or relationship to the case." },
            knowledge: { type: Type.STRING, description: "A secret brief of what this character knows. This is the most important part. The information for all characters combined must contain clues and at least one key contradiction that allows the player to solve the case. The culprit's knowledge should contain a lie or alibi that a good defense attorney could plausibly defend, but that a good prosecutor could see through. At least one other character's knowledge must contradict that lie/alibi." },
            initialStatement: { type: Type.STRING, description: "A brief, one-sentence initial statement this character gave to investigators, which will be presented at the start of the trial."}
          },
          required: ["name", "role", "knowledge", "initialStatement"]
        }
      }
    },
    required: ["caseTitle", "caseBrief", "caseOverview", "theAccused", "theCulprit", "motive", "characters"]
  };

  const systemInstruction = `You are a creative writer for a noir detective game. Your task is to generate a complete, self-contained, and solvable mystery case file in JSON format. The crimes should be lighthearted and low-stakes (e.g., stolen pies, sabotaged sculptures, etc.). The case must be logically solvable by finding contradictions in witness testimonies.

IMPORTANT: The 'theAccused' and 'theCulprit' fields MUST refer to the same character. The game's premise is that the player prosecutes the correct person, who has an AI defense attorney. Ensure you provide a detailed caseOverview and an initialStatement for every character.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Generate a new detective case file. The accused person must be the actual culprit. Ensure the culprit has a lie or a flimsy alibi in their knowledge brief that could be defended, but make sure at least one other character has knowledge that directly contradicts the culprit's story. The case must be solvable through dialogue. Include a detailed case overview and initial statements for all characters.",
      config: {
        responseMimeType: "application/json",
        responseSchema: caseSchema,
        systemInstruction: systemInstruction,
      },
    });
    
    // The response's text property is a string, which needs to be parsed into a JSON object.
    const caseJson = JSON.parse(response.text);
    return caseJson;
  } catch (error) {
    console.error("Error generating case via AI:", error);
    // Attempt to parse a potentially incomplete JSON from the error message if available
    if (error.message && error.message.includes('response.text')) {
        try {
            const errorJsonMatch = error.message.match(/```json\n(\{[\s\S]*\})\n```/);
            if(errorJsonMatch && errorJsonMatch[1]) {
                return JSON.parse(errorJsonMatch[1]);
            }
        } catch(parseError) {
             console.error("Failed to parse fallback JSON from error message:", parseError);
        }
    }
    return null;
  }
}


/**
 * Renders the case briefing screen.
 * @param {object} caseData - The case data to display.
 */
function showCaseBriefing(caseData) {
  mainContent.innerHTML = `
    <div class="case-brief-container">
      <h2 class="case-title">${caseData.caseTitle}</h2>
      <p class="case-brief-text">${caseData.caseBrief}</p>
      <div class="menu-buttons">
        <button id="proceed-to-courtroom-btn" class="menu-btn">Proceed to Courtroom</button>
      </div>
    </div>
  `;

  document.getElementById('proceed-to-courtroom-btn').addEventListener('click', () => {
    sessionStorage.setItem('currentCase', JSON.stringify(caseData));
    window.location.href = 'courtroom.html';
  });
}

/**
 * Handles the click event for the "Start New Case" button.
 */
async function handleStartNewCase() {
  startNewCaseBtn.disabled = true;
  startNewCaseBtn.textContent = 'Generating Case...';
  subtitleEl.textContent = "The AI is writing the case file...";

  const newCase = await generateNewCaseViaAi();

  if (newCase) {
    showCaseBriefing(newCase);
  } else {
    subtitleEl.textContent = "The trail went cold. Please try again.";
    startNewCaseBtn.disabled = false;
    startNewCaseBtn.textContent = 'Start New Case';
  }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initializeAi);
startNewCaseBtn.addEventListener('click', handleStartNewCase);