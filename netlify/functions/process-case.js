
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// Initialize clients
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
        caseTitle: { type: Type.STRING, description: "A catchy, noir-style title for the case." },
        caseBrief: { type: Type.STRING, description: "A one-sentence summary of the crime to be displayed to the player." },
        theCulprit: { type: Type.STRING, description: "The name of the character who is guilty." },
        theAccused: { type: Type.STRING, description: "The name of the character being accused. Must be the same as theCulprit." },
        publicDossier: {
            type: Type.OBJECT,
            description: "Information available to all parties at the start of the game.",
            properties: {
                policeReport: { type: Type.STRING, description: "A 2-3 sentence paragraph detailing the crime scene and situation, written like an official police report." },
                initialStatements: {
                    type: Type.ARRAY,
                    description: "An array containing the initial, one-sentence alibi or statement from each character.",
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
            description: "An array of 4 to 5 character objects.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The character's full name. Must match a name in initialStatements." },
                    role: { type: Type.STRING, description: "The character's role in the story (e.g., 'Victim's Rival', 'Nosy Neighbor')." },
                    knowledge: { type: Type.STRING, description: "A secret, detailed brief of what this character knows, to be used by the AI playing this role. This is HIDDEN information." },
                },
                required: ["name", "role", "knowledge"]
            }
        }
    },
    required: ["caseTitle", "caseBrief", "theCulprit", "theAccused", "publicDossier", "characters"]
};


// Helper to update case status in the database
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
    // This is a fire-and-forget function. The client does not wait for the response.
    // We wrap the main logic in a try/catch to ensure we can mark cases as FAILED.
    const { caseId, userType } = await req.json();
    if (!caseId || !userType) {
        // Acknowledge the request even if it's bad, to prevent client-side errors.
        return new Response(JSON.stringify({ error: "Missing caseId or userType" }), { status: 400 });
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
                // Give the creator AI a generous thinking budget for high-quality cases
                maxOutputTokens: 8192,
                thinkingConfig: { thinkingBudget: 2048 },
            },
        });

        const caseData = JSON.parse(response.text);
        
        if (!caseData.caseTitle || !caseData.characters || caseData.characters.length < 4) {
             throw new Error("AI failed to generate a valid case structure with at least four characters.");
        }

        // Update the case record with the data and set status to 'READY'
        await updateCaseStatus(table, caseId, 'READY', caseData);

    } catch (error) {
        console.error(`Error processing case ${caseId}:`, error);
        // If anything fails, update the status to 'FAILED'
        await updateCaseStatus(table, caseId, 'FAILED');
    }

    // Return 200 to acknowledge receipt of the processing request.
    return new Response(JSON.stringify({ message: "Processing acknowledged." }), { status: 200 });
};