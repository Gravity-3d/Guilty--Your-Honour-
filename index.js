import { DB } from './db.js';
import { STATE_KEYS } from './constants.js';
import { CaseService } from './case.service.js';
import { APIService } from './api.service.js';
import { UIManager } from './ui.manager.js';
import { NoirProKit } from './noir-pro-kit.js';

/**
 * MAIN GAME ORCHESTRATOR
 */
const Game = {
    async start() {
        UIManager.setLoading(true, "POWERING ON...");
        
        try {
            await DB.init();
            UIManager.init();
            NoirProKit.State.init({ currentCase: null });
            
            // Resume or Start logic
            const existing = await CaseService.getActiveCase();
            if (existing) {
                UIManager.renderDossier(existing);
                UIManager.transitionTo(STATE_KEYS.INVESTIGATION);
            } else {
                UIManager.transitionTo(STATE_KEYS.TITLE);
            }

            this.attachEvents();
        } catch (error) {
            console.error("Critical Failure:", error);
            alert("The agency is offline. Check your Netlify environment variables.");
        } finally {
            UIManager.setLoading(false);
        }
    },

    attachEvents() {
        const startBtn = document.getElementById('start-btn');
        const courtBtn = document.getElementById('proceed-to-court-btn');
        const verdictBtn = document.getElementById('deliver-verdict-btn');
        const returnBtn = document.getElementById('return-menu-btn');
        const exitBtn = document.getElementById('exit-case-btn');

        if (startBtn) startBtn.onclick = () => this.handleNewMystery();
        if (courtBtn) courtBtn.onclick = () => this.enterCourtroom();
        if (verdictBtn) verdictBtn.onclick = () => this.handleVerdict();
        if (returnBtn) returnBtn.onclick = () => UIManager.transitionTo(STATE_KEYS.TITLE);
        
        if (exitBtn) {
            exitBtn.onclick = async () => {
                if (confirm("Burn this case file forever?")) {
                    await CaseService.deleteCurrentCase();
                    UIManager.transitionTo(STATE_KEYS.TITLE);
                }
            };
        }
    },

    async handleNewMystery() {
        try {
            UIManager.setLoading(true, "COLLECTING CLUES...");
            const mystery = await CaseService.createNewCase();
            UIManager.renderDossier(mystery);
            UIManager.transitionTo(STATE_KEYS.INVESTIGATION);
        } catch (e) {
            console.error("Mystery Gen Error:", e);
            alert("The informant vanished. Ensure your Netlify API_KEY is set and the function is deployed.");
        } finally {
            UIManager.setLoading(false);
        }
    },

    enterCourtroom() {
        const mystery = NoirProKit.State.get('currentCase');
        const container = document.getElementById('suspect-selection');
        if (!container || !mystery) return;

        container.innerHTML = mystery.suspects.map(s => `
            <div class="suspect-card" data-name="${s.name}">
                <strong style="font-size: 1.1rem;">${s.name.toUpperCase()}</strong><br>
                <button class="btn cross-btn" style="padding: 0.4rem 0.8rem; font-size: 0.5rem; margin-top: 0.8rem; width: 100%;">CROSS-EXAMINE</button>
            </div>
        `).join('');

        let selected = null;
        const cards = container.querySelectorAll('.suspect-card');
        
        cards.forEach(card => {
            card.onclick = async (e) => {
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selected = card.getAttribute('data-name');
                
                const vBtn = document.getElementById('deliver-verdict-btn');
                if (vBtn) vBtn.disabled = false;
                
                if (e.target.classList.contains('cross-btn')) {
                    this.interrogate(selected, mystery);
                }
            };
        });

        this._selectedSuspect = () => selected;
        UIManager.transitionTo(STATE_KEYS.COURTROOM);
    },

    async interrogate(name, mystery) {
        UIManager.setLoading(true, `PRESSURING ${name}...`);
        try {
            const suspect = mystery.suspects.find(s => s.name === name);
            const text = await APIService.fetchInterrogation(name, suspect.alibi);
            const dialogue = document.getElementById('court-dialogue');
            if (dialogue) {
                await NoirProKit.Text.typewrite(dialogue, `"${text}"`);
            }
        } catch (e) {
            console.error(e);
        } finally {
            UIManager.setLoading(false);
        }
    },

    async handleVerdict() {
        const accused = this._selectedSuspect();
        const mystery = NoirProKit.State.get('currentCase');
        if (!mystery) return;

        const isCorrect = accused === mystery.guiltyParty;

        UIManager.setLoading(true, "JURY DELIBERATING...");
        try {
            const resultText = await APIService.fetchVerdict(accused, mystery.guiltyParty, mystery.logic, isCorrect);
            
            const stamp = document.getElementById('verdict-stamp-container');
            if (stamp) {
                stamp.innerHTML = isCorrect ? 
                    `<div class="verdict-stamp stamp-guilty stamp-visible">JUSTICE</div>` : 
                    `<div class="verdict-stamp stamp-mistrial stamp-visible">MISTRIAL</div>`;
                NoirProKit.Synth.playSlam();
            }
            
            const textEl = document.getElementById('verdict-text');
            if (textEl) {
                textEl.textContent = "";
                UIManager.transitionTo(STATE_KEYS.VERDICT);
                await NoirProKit.Text.typewrite(textEl, resultText, { speed: 40 });
            }
        } catch (e) {
            console.error(e);
        } finally {
            UIManager.setLoading(false);
        }
    }
};

// Start application
Game.start();
