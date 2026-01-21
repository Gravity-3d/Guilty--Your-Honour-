/**
 * API SERVICE
 * Communicates with the Netlify Serverless Backend.
 */
export const APIService = {
    async _callFunction(action, payload = {}) {
        // We use /api/gemini which is proxied to /.netlify/functions/gemini in netlify.toml
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
        });

        if (!response.ok) {
            let errorMsg = 'Serverless Function Error';
            try {
                const err = await response.json();
                errorMsg = err.error || errorMsg;
            } catch (e) {
                errorMsg = `HTTP Error: ${response.status}`;
            }
            throw new Error(errorMsg);
        }

        return await response.json();
    },

    async generateMystery() {
        return await this._callFunction('generateMystery');
    },

    async fetchInterrogation(name, alibi) {
        const result = await this._callFunction('interrogate', { name, alibi });
        return result.text;
    },

    async fetchVerdict(accused, killer, logic, isCorrect) {
        const result = await this._callFunction('verdict', { accused, killer, logic, isCorrect });
        return result.text;
    }
};