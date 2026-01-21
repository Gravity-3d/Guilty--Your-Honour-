import { DB } from './db.js';
import { STATE_KEYS } from './constants.js';
import { CaseService } from './case.service.js';
import { APIService } from './api.service.js';
import { UIManager } from './ui.manager.js';
import { NoirProKit } from './noir-pro-kit.js';

/**
 * MAIN GAME LOOP ORCHESTRATOR
 */
const Game = {
    async start() {
        UIManager.setLoading(true, "POWERING ON...");
        
        // 1. Initialize modular subsystems
        await DB.init();
        UIManager.init();
        NoirProKit.State.init({ currentCase: null });
        
        // 2. Check for existing session/case
        const existing = await CaseService.getActiveCase();
        if (existing) {
            UIManager.renderDossier(existing);
            UIManager.transitionTo(STATE_KEYS.INVESTIGATION);
        } else {
            UIManager.transitionTo(STATE_KEYS.TITLE);
        }

        this.attachEvents();
        UIManager.setLoading(false);
    },

    attachEvents() {
        document.getElementById('start-btn').onclick = () => this.handleNewMystery();
        document.getElementById('proceed-to-court-btn').onclick = () => this.enterCourtroom();
        document.getElementById('deliver-verdict-btn').onclick = () => this.handleVerdict();
        document.getElementById('return-menu-btn').onclick = () => UIManager.transitionTo(STATE_KEYS.TITLE);
        document.getElementById('exit-case-btn').onclick = async () => {
            if (confirm("Burn the file?")) {
                await CaseService.deleteCurrentCase();
                UIManager.transitionTo(STATE_KEYS.TITLE);
            }
        };
    },

    async handleNewMystery() {
        try {
            UIManager.setLoading(true, "COLLECTING CLUES...");
            const mystery = await CaseService.createNewCase();
            UIManager.renderDossier(mystery);
            UIManager.transitionTo(STATE_KEYS.INVESTIGATION);
        } catch (e) {
            console.error(e);
            alert("Connection lost.");
        } finally {
            UIManager.setLoading(false);
        }
    },

    enterCourtroom() {
        const mystery = NoirProKit.State.get('currentCase');
        const container = document.getElementById('suspect-selection');
        container.innerHTML = mystery.suspects.map(s => `
            <div class="suspect-card" data-name="${s.name}">
                <strong>${s.name}</strong><br>
                <button class="btn cross-btn" style="padding: 0.5rem; font-size: 0.6rem; margin-top: 0.5rem;">INTERROGATE</button>
            </div>
        `).join('');

        // Selection logic
        let selected = null;
        container.querySelectorAll('.suspect-card').forEach(card => {
            card.onclick = async (e) => {
                container.querySelectorAll('.suspect-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selected = card.dataset.name;
                document.getElementById('deliver-verdict-btn').disabled = false;
                
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
        const suspect = mystery.suspects.find(s => s.name === name);
        const text = await APIService.fetchInterrogation(name, suspect.alibi);
        const dialogue = document.getElementById('court-dialogue');
        await NoirProKit.Text.typewrite(dialogue, `"${text}"`);
        UIManager.setLoading(false);
    },

    async handleVerdict() {
        const accused = this._selectedSuspect();
        const mystery = NoirProKit.State.get('currentCase');
        const isCorrect = accused === mystery.guiltyParty;

        UIManager.setLoading(true, "JURY DELIBERATING...");
        const resultText = await APIService.fetchVerdict(accused, mystery.guiltyParty, mystery.logic, isCorrect);
        
        const stamp = document.getElementById('verdict-stamp-container');
        stamp.innerHTML = isCorrect ? 
            `<div class="verdict-stamp stamp-guilty stamp-visible">JUSTICE</div>` : 
            `<div class="verdict-stamp stamp-mistrial stamp-visible">MISTRIAL</div>`;
        
        const textEl = document.getElementById('verdict-text');
        textEl.textContent = "";
        
        UIManager.transitionTo(STATE_KEYS.VERDICT);
        await NoirProKit.Text.typewrite(textEl, resultText, { speed: 40 });
        UIManager.setLoading(false);
    }
};

// Fire it up
Game.start();

