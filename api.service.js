/**
 * API SERVICE
 * Communicates with the Netlify Serverless Backend.
 */
export const APIService = {
    async _callFunction(action, payload = {}) {
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Serverless Function Error');
        }

        return await response.json();
    },

    async generateMystery() {
        // Returns the full JSON object directly from the function
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
