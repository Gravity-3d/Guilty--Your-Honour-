import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// Initialize clients
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const systemInstruction = `You are a creative writer for a noir detective game. Your task is to generate a complete mystery case file as a single JSON object that strictly follows the provided schema.
- The crimes must be lighthearted and low-stakes (e.g., stolen pies, sabotaged sculptures).
- The case must be logically solvable by finding contradictions in witness testimonies.
- You must generate EXACTLY TWO characters.
- IMPORTANT: The 'theAccused' and 'theCulprit' fields MUST refer to the same character's name.
- The culprit's 'knowledge' brief MUST contain a lie or a flimsy alibi.
- The other character's 'knowledge' MUST directly contradict the culprit's story.`;

const caseSchema = {
    type: Type.OBJECT,
    properties: {
        caseTitle: { type: Type.STRING, description: "A catchy, noir-style title for the case." },
        caseBrief: { type: Type.STRING, description: "A one-sentence summary of the crime to be displayed to the player." },
        caseOverview: { type: Type.STRING, description: "A longer, 2-3 sentence paragraph detailing the crime scene and situation." },
        theCulprit: { type: Type.STRING, description: "The name of the character who is guilty." },
        theAccused: { type: Type.STRING, description: "The name of the character being accused. Must be the same as theCulprit." },
        motive: { type: Type.STRING, description: "The culprit's reason for committing the crime." },
        characters: {
            type: Type.ARRAY,
            description: "An array of exactly two character objects.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The character's full name." },
                    role: { type: Type.STRING, description: "The character's role in the story (e.g., 'Victim's Rival', 'Nosy Neighbor')." },
                    initialStatement: { type: Type.STRING, description: "A brief, one-sentence statement or alibi given by the character initially." },
                    knowledge: { type: Type.STRING, description: "A secret, detailed brief of what this character knows, to be used by the AI playing this role. For the culprit, this should contain their lie. For the other character, it should contain the information that contradicts the culprit." },
                },
                required: ["name", "role", "initialStatement", "knowledge"]
            }
        }
    },
    required: ["caseTitle", "caseBrief", "caseOverview", "theCulprit", "theAccused", "motive", "characters"]
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
            },
        });

        const caseData = JSON.parse(response.text);
        
        if (!caseData.caseTitle || !caseData.characters || caseData.characters.length !== 2) {
             throw new Error("AI failed to generate a valid case structure with exactly two characters.");
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