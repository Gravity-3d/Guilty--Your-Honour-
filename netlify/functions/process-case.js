
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const systemInstruction = `You are a creative writer for a noir detective game. Your task is to generate a complete mystery case file as a single JSON object that strictly follows the provided schema.
- The crimes must be lighthearted and low-stakes (e.g., stolen pies, sabotaged sculptures).
- The case must be logically solvable by finding contradictions in testimonies.
- You must generate EXACTLY 4 to 5 characters.
- One character must be 'theCulprit'. Their 'knowledge' brief MUST contain a lie or a flimsy alibi.
- At least one other character must be a key witness whose 'knowledge' directly contradicts the culprit's lie.
- Other characters can be 'Red Herrings'—their knowledge might seem suspicious but is ultimately a dead end for the main crime.
- The 'theAccused' and 'theCulprit' fields MUST refer to the same character's name.
- The 'publicDossier' contains information available to everyone at the start.
- The 'characters.knowledge' field contains secrets only revealed through questioning.`;

const caseSchema = {
    type: Type.OBJECT,
    properties: {
        caseTitle: { type: Type.STRING },
        caseBrief: { type: Type.STRING },
        theCulprit: { type: Type.STRING },
        theAccused: { type: Type.STRING },
        publicDossier: {
            type: Type.OBJECT,
            properties: {
                policeReport: { type: Type.STRING },
                initialStatements: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            statement: { type: Type.STRING }
                        },
                        required: ["name", "statement"]
                    }
                }
            },
            required: ["policeReport", "initialStatements"]
        },
        characters: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    knowledge: { type: Type.STRING },
                },
                required: ["name", "role", "knowledge"]
            }
        }
    },
    required: ["caseTitle", "caseBrief", "theCulprit", "theAccused", "publicDossier", "characters"]
};

const updateCaseStatus = async (table, caseId, status, caseData = null) => {
    const updatePayload = { status };
    if (caseData) {
        updatePayload.case_data = caseData;
    }
    const { error } = await supabase
        .from(table)
        .update(updatePayload)
        .eq('id', caseId);

    if (error) {
        console.error(`Failed to update ${table} for case ${caseId} to status ${status}:`, error.message);
    }
};

export default async (req) => {
    const { caseId, userType } = await req.json();
    if (!caseId || !userType) {
        return new Response(null, { status: 400 });
    }

    const table = userType === 'auth' ? 'cases' : 'guest_cases';

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Generate a new detective case file as a single JSON object.",
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: caseSchema,
                maxOutputTokens: 8192,
                thinkingConfig: { thinkingBudget: 2048 },
            },
        });

        const caseData = JSON.parse(response.text);
        
        if (!caseData.caseTitle || !caseData.characters || caseData.characters.length < 4) {
             throw new Error("AI failed to generate a valid case structure.");
        }

        await updateCaseStatus(table, caseId, 'READY', caseData);

    } catch (error) {
        await updateCaseStatus(table, caseId, 'FAILED');
    }

    return new Response(null, { status: 202 });
};
