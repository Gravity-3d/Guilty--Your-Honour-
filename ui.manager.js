import { NoirProKit } from './noir-pro-kit.js';
import { STATE_KEYS } from './constants.js';

/**
 * UI MANAGER
 * Handles DOM references, screen transitions, and content rendering.
 */
export const UIManager = {
    _screens: {},

    init() {
        Object.values(STATE_KEYS).forEach(key => {
            const el = document.getElementById(`${key}-screen`);
            if (el) this._screens[key] = el;
        });
    },

    async transitionTo(stateKey) {
        const active = document.querySelector('.screen.active');
        if (active) {
            await NoirProKit.Animate.to(active, 300, { opacity: 0 }, 'inQuad');
            active.classList.remove('active');
        }

        const next = this._screens[stateKey];
        if (!next) return;
        
        next.style.opacity = 0;
        next.classList.add('active');
        await NoirProKit.Animate.to(next, 400, { opacity: 1 }, 'outQuad');
    },

    setLoading(show, msg = "WORKING...") {
        const overlay = document.getElementById('loading-overlay');
        const msgEl = document.getElementById('loading-message');
        msgEl.textContent = msg.toUpperCase();
        overlay.style.display = show ? 'flex' : 'none';
    },

    renderDossier(currentCase) {
        const content = document.getElementById('investigation-content');
        const suspects = currentCase.suspects.map(s => `
            <div class="suspect-entry" style="border: 1px solid #ccc; padding: 1rem; margin-bottom: 1rem; background: #fff;">
                <strong>${s.name.toUpperCase()}</strong><br>
                <em>MOTIVE:</em> ${s.motive}<br>
                <em>ALIBI:</em> ${s.alibi}
            </div>
        `).join('');

        content.innerHTML = `
            <h2>${currentCase.caseTitle}</h2>
            <p>${currentCase.scene}</p>
            <hr>
            <h3>PERSONS OF INTEREST</h3>
            ${suspects}
            <hr>
            <h3>EVIDENCE</h3>
            <ul>${currentCase.evidence.map(e => `<li>${e}</li>`).join('')}</ul>
        `;
        document.getElementById('case-id').textContent = `#${currentCase.caseId || '----'}`;
    }
};

