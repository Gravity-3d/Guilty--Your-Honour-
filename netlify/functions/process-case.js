
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// Initialize clients
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const systemInstruction = `You are a creative writer for a noir detective game. Your task is to generate a complete mystery case file as a single JSON object.
- The crimes must be lighthearted and low-stakes (e.g., stolen pies, sabotaged sculptures).
- The case must be logically solvable by finding contradictions in witness testimonies.
- You must generate EXACTLY TWO characters.
- IMPORTANT: The 'theAccused' and 'theCulprit' fields MUST refer to the same character.
- The culprit's 'knowledge' brief MUST contain a lie or a flimsy alibi.
- The other character's 'knowledge' MUST directly contradict the culprit's story.
- You must provide a 'caseTitle', 'caseBrief', 'caseOverview', 'theCulprit', 'theAccused', 'motive', and a 'characters' array.

The output MUST be a single, valid JSON object.`;

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
            },
        });

        const caseData = JSON.parse(response.text);
        
        if (!caseData.caseTitle || !caseData.characters || caseData.characters.length < 2) {
             throw new Error("AI failed to generate a valid case structure.");
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
