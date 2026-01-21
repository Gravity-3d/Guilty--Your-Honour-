import { GoogleGenAI, Type } from "@google/genai";
import { CONFIG } from './constants.js';

/**
 * API SERVICE
 * Handles communication with the Google Gemini API.
 */
export const APIService = {
    _ai: null,

    getClient() {
        if (!this._ai) {
            // In pure JS modules, process.env.API_KEY is usually replaced by the build tool (e.g. Vite/Esbuild)
            this._ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        }
        return this._ai;
    },

    async generateMystery() {
        const client = this.getClient();
        const response = await client.models.generateContent({
            model: CONFIG.AI_MODEL,
            contents: CONFIG.PROMPTS.MYSTERY_GEN,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        caseTitle: { type: Type.STRING },
                        caseId: { type: Type.STRING },
                        scene: { type: Type.STRING },
                        victim: { type: Type.STRING },
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
                        evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                        guiltyParty: { type: Type.STRING },
                        logic: { type: Type.STRING }
                    },
                    required: ["caseTitle", "caseId", "scene", "victim", "suspects", "evidence", "guiltyParty", "logic"]
                }
            }
        });
        return JSON.parse(response.text);
    },

    async fetchInterrogation(name, alibi) {
        const client = this.getClient();
        const response = await client.models.generateContent({
            model: CONFIG.AI_MODEL,
            contents: CONFIG.PROMPTS.INTERROGATION(name, alibi)
        });
        return response.text;
    },

    async fetchVerdict(accused, killer, logic, isCorrect) {
        const client = this.getClient();
        const prompt = `Noir trial resolution. Accused: ${accused}. Killer: ${killer}. Logic: ${logic}. Outcome: ${isCorrect ? 'Justice' : 'Mistrial'}. Write exactly 3 dramatic sentences in noir style.`;
        const response = await client.models.generateContent({
            model: CONFIG.AI_MODEL,
            contents: prompt
        });
        return response.text;
    }
};
