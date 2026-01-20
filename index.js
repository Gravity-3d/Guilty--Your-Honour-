import { GoogleGenAI, Type } from "@google/genai";

// Game State Management
const STATE = {
    TITLE: 'title',
    INVESTIGATION: 'investigation',
    COURTROOM: 'courtroom'
};

let currentGameState = STATE.TITLE;
let currentCase = null;

// UI Elements
const screens = {
    [STATE.TITLE]: document.getElementById('title-screen'),
    [STATE.INVESTIGATION]: document.getElementById('investigation-screen'),
};

const loadingOverlay = document.getElementById('loading-overlay');
const loadingMessage = document.getElementById('loading-message');
const investigationContent = document.getElementById('investigation-content');
const caseIdDisplay = document.getElementById('case-id');

// Gemini Client Initialization
// (Note: process.env.API_KEY is handled by the environment)
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Update the UI to show the active screen
 */
function transitionTo(state) {
    Object.values(screens).forEach(screen => screen?.classList.remove('active'));
    if (screens[state]) {
        screens[state].classList.add('active');
    }
    currentGameState = state;
}

/**
 * Show or hide loading overlay with a custom message
 */
function setLoading(isLoading, message = "WORKING THE CASE...") {
    loadingMessage.textContent = message;
    loadingOverlay.style.display = isLoading ? 'flex' : 'none';
}

/**
 * Generate a new mystery using Gemini API
 */
async function generateNewMystery() {
    setLoading(true, "GATHERING INITIAL EVIDENCE...");
    
    const ai = getAI();
    const prompt = `
        Generate a high-stakes, noir-style murder mystery case. 
        The case should include:
        1. A compelling case title.
        2. A case ID (e.g., #SF-902).
        3. A detailed scene description of the crime.
        4. Information about the victim.
        5. Three distinct suspects with motives and alibis.
        6. Two key pieces of physical evidence.
        7. A secret 'guilty party' from the suspects and a logic for why they are the killer.
        
        Style: Noir, serious, slightly dramatic.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        caseTitle: { type: Type.STRING },
                        caseId: { type: Type.STRING },
                        sceneDescription: { type: Type.STRING },
                        victim: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                occupation: { type: Type.STRING },
                                notes: { type: Type.STRING }
                            },
                            required: ["name", "occupation", "notes"]
                        },
                        suspects: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    motive: { type: Type.STRING },
                                    alibi: { type: Type.STRING }
                                },
                                required: ["name", "motive", "alibi"]
                            }
                        },
                        evidence: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        guiltyParty: { type: Type.STRING },
                        resolutionLogic: { type: Type.STRING }
                    },
                    required: ["caseTitle", "caseId", "sceneDescription", "victim", "suspects", "evidence", "guiltyParty", "resolutionLogic"]
                }
            }
        });

        const data = JSON.parse(response.text);
        currentCase = data;
        displayCase(data);
        transitionTo(STATE.INVESTIGATION);
    } catch (error) {
        console.error("Failed to generate mystery:", error);
        alert("The District Attorney's office is unreachable. Try again later.");
    } finally {
        setLoading(false);
    }
}

/**
 * Display the generated case in the dossier
 */
function displayCase(data) {
    caseIdDisplay.textContent = `CASE ${data.caseId} | ${data.caseTitle.toUpperCase()}`;
    
    let html = `
### THE INCIDENT
${data.sceneDescription}

### THE VICTIM
Name: **${data.victim.name}**
Occupation: ${data.victim.occupation}
Coroner's Initial Notes: ${data.victim.notes}

### THE SUSPECTS
${data.suspects.map((s, i) => `
**Suspect #${i + 1}: ${s.name}**
*Motive:* ${s.motive}
*Alibi:* ${s.alibi}
`).join('\n')}

### PHYSICAL EVIDENCE COLLECTED
${data.evidence.map(e => `• ${e}`).join('\n')}

---
*Investigator's Note: Review the facts. When you are ready to make an accusation, proceed to the courtroom. There is no turning back.*
    `;
    
    // Simple markdown-ish to HTML conversion
    investigationContent.innerHTML = html
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/### (.*?)(<br>|$)/g, '<h3 style="color: var(--oxblood); border-bottom: 1px solid #ccc; margin-top: 1.5rem;">$1</h3>')
        .replace(/---/g, '<hr style="border: none; border-top: 1px dashed #999; margin: 2rem 0;">');
}

// Event Listeners
document.getElementById('start-btn').addEventListener('click', () => {
    generateNewMystery();
});

document.getElementById('rules-btn').addEventListener('click', () => {
    document.getElementById('rules-modal').style.display = 'flex';
});

const closeRules = () => {
    document.getElementById('rules-modal').style.display = 'none';
};

document.getElementById('close-rules').addEventListener('click', closeRules);
document.getElementById('close-rules-btn').addEventListener('click', closeRules);

document.getElementById('back-to-menu').addEventListener('click', () => {
    if (confirm("Are you sure you want to abandon this case? All progress will be lost.")) {
        transitionTo(STATE.TITLE);
    }
});

document.getElementById('proceed-to-court').addEventListener('click', () => {
    alert(`Courtroom module is under construction. \n\nSpoiler: The killer was ${currentCase.guiltyParty}.\nLogic: ${currentCase.resolutionLogic}`);
});

// Initialization
window.addEventListener('load', () => {
    transitionTo(STATE.TITLE);
});

