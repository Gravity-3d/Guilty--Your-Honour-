/**
 * Case Closed: The AI Detective
 * Main menu and case generation logic.
 */

// --- DOM Elements ---
const mainContent = document.getElementById('main-content');
const startNewCaseBtn = document.getElementById('start-new-case-btn');

// --- Mock Case Generation ---

/**
 * Creates a new, randomly selected mock case.
 * @returns {object} The generated case data.
 */
function generateNewCase() {
  // In a real app, this would use the AI Case Writer. For now, we use a mock.
  const mockCase = {
    caseTitle: "The Case of the Pilfered Petunias",
    caseBrief: "The prize-winning petunias at the annual Grand Garden Show have been mysteriously plucked! The head gardener, famed for his floral masterpieces, is distraught. The main suspect is a rival gardener known for his jealousy, but is the case that simple?",
    theAccused: "Florence 'Flo' Green",
    theCulprit: "Gardener Gus",
    motive: "Gus was secretly growing a 'Super Petunia' and wanted to eliminate the competition before revealing his own creation. He stole the petunias to extract their DNA for his hybrid.",
    keyEvidence: {
      name: "Exotic Seed Packet",
      description: "A small, empty seed packet for 'Venus Fly-trap Petunia Hybrid', a variety not sold locally, found near the scene."
    },
    characters: [
      {
        name: "Gardener Gus",
        role: "The head gardener, proud of his petunias.",
        knowledge: "I am devastated! My prized petunias, gone! I was preparing them all morning. I saw our rival, Flo Green, lurking around earlier, looking very envious. I briefly left to get some fertilizer from my shed around noon. When I returned, they were gone! The shed is on the other side of the garden."
      },
      {
        name: "Florence 'Flo' Green",
        role: "A rival gardener known for her competitive spirit.",
        knowledge: "Of course, I admired Gus's petunias, who wouldn't? But I'd never stoop to sabotage. I was at the refreshment tent from 11:30 AM until about 1 PM, chatting with Beatrice. I saw Gus heading towards his shed around lunchtime, but that's it. He seemed agitated."
      },
      {
        name: "Beatrice 'Bea' Keeper",
        role: "The organizer of the garden show.",
        knowledge: "It's a tragedy for the show! I was with Flo Green at the refreshment tent for a good while, so she has an alibi. I did see Gardener Gus near his petunia display earlier, he seemed to be tucking something small into his pocket, but I was too far away to see what it was. It was just before he rushed off towards his shed."
      }
    ],
  };
  return mockCase;
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

  // Add event listener to the new button
  document.getElementById('proceed-to-courtroom-btn').addEventListener('click', () => {
    // Save case data to session storage to pass to the next page
    sessionStorage.setItem('currentCase', JSON.stringify(caseData));
    // Redirect to the courtroom
    window.location.href = 'courtroom.html';
  });
}

/**
 * Handles the click event for the "Start New Case" button.
 */
function handleStartNewCase() {
  startNewCaseBtn.disabled = true;
  startNewCaseBtn.textContent = 'Generating Case...';

  // Simulate AI generation time
  setTimeout(() => {
    const newCase = generateNewCase();
    showCaseBriefing(newCase);
  }, 500); // A short delay for effect
}


// --- Event Listeners ---
startNewCaseBtn.addEventListener('click', handleStartNewCase);
