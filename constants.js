/**
 * GAME CONSTANTS & CONFIGURATION
 */
export const CONFIG = {
    DB_NAME: 'NoirJusticeDB',
    DB_VERSION: 1,
    STORES: {
        USERS: 'users',
        CASES: 'cases',
        SETTINGS: 'settings'
    },
    AI_MODEL: 'gemini-3-flash-preview',
    PROMPTS: {
        MYSTERY_GEN: `Generate a gritty 1940s noir murder mystery. Return JSON. 
                      Include: caseTitle, scene description, victim details, 
                      3 suspects (name, motive, alibi), 4 pieces of evidence, secret logic explanation.`,
        INTERROGATION: (name, alibi) => `You are ${name}, a suspect in a noir trial. Alibi: ${alibi}. Deliver a short, nervous, high-pressure final testimony.`
    }
};

export const STATE_KEYS = {
    TITLE: 'title',
    INVESTIGATION: 'investigation',
    COURTROOM: 'courtroom',
    VERDICT: 'verdict',
    AUTH: 'auth'
};

