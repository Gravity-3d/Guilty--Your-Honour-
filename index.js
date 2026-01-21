/**
 * ENVIRONMENT SHIM
 * Must be at the very top. Defines 'process' so the browser doesn't throw ReferenceError.
 * In a real Netlify deploy with a build command, the text 'process.env.API_KEY' 
 * will be replaced by the actual key string.
 */
if (typeof process === 'undefined') {
    globalThis.process = { env: { API_KEY: '' } };
}

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
            
            // 1. Check if we have an API key available via any method
            const hasInjectedKey = process.env.API_KEY && process.env.API_KEY.length > 5;
            const hasSelectedKey = window.aistudio ? await window.aistudio.hasSelectedApiKey() : false;

            if (!hasInjectedKey && !hasSelectedKey) {
                this.showAuthRequirement();
                return;
            }

            // 2. Resume or Start
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
            alert("The agency is offline. System error.");
        } finally {
            UIManager.setLoading(false);
        }
    },

    showAuthRequirement() {
        UIManager.transitionTo(STATE_KEYS.TITLE);
        const titleScreen = document.getElementById('title-screen');
        const startBtn = document.getElementById('start-btn');
        if (startBtn) startBtn.style.display = 'none';

        // Check if an auth UI already exists
        if (document.getElementById('auth-badge-container')) return;

        const authContainer = document.createElement('div');
        authContainer.id = 'auth-badge-container';
        authContainer.style.cssText = 'margin-top: 2rem; text-align: center; animation: fadeIn 1s ease;';
        authContainer.innerHTML = `
            <div style="border: 1px solid var(--gold); padding: 2rem; background: rgba(0,0,0,0.4);">
                <p style="color: var(--gold); font-size: 0.7rem; letter-spacing: 3px; margin-bottom: 1.5rem;">DETECTIVE BADGE INACTIVE</p>
                <button class="btn" id="activate-badge-btn">Unlock Badge (API Key)</button>
                <p style="font-size: 0.6rem; margin-top: 1.5rem; opacity: 0.5;">
                    Required for the Logic Engine (Gemini API).<br>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" style="color: var(--gold); text-decoration: none; border-bottom: 1px solid;">Billing Info</a>
                </p>
            </div>
        `;
        titleScreen.appendChild(authContainer);

        document.getElementById('activate-badge-btn').onclick = async () => {
            if (window.aistudio) {
                await window.aistudio.openSelectKey();
                // Per guidelines, assume success and proceed to reload/re-init
                window.location.reload();
            } else {
                alert("Environment not recognized. If on Netlify, ensure your Build Command replaces process.env.API_KEY.");
            }
        };
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
            if (e.message.includes("404") || e.message.includes("not found")) {
                alert("The Detective's credentials (API Key) are invalid. Resetting badge...");
                if (window.aistudio) await window.aistudio.openSelectKey();
            } else {
                alert("The informant vanished. Check your connection.");
            }
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