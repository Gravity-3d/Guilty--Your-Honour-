import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// Initialize clients from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const caseSchema = {
    type: Type.OBJECT,
    properties: {
      caseTitle: { type: Type.STRING, description: "A catchy, noir-style title for the case. e.g., 'The Case of the Contraband Cabbage'." },
      caseBrief: { type: Type.STRING, description: "A 2-3 sentence brief of the crime. Introduce the setting and the core mystery." },
      caseOverview: { type: Type.STRING, description: "A detailed paragraph describing the crime scene, undisputed facts, and context for the player before the trial starts." },
      theCulprit: { type: Type.STRING, description: "The name of the character who is the true culprit. This must be one of the characters generated below." },
      theAccused: { type: Type.STRING, description: "The name of the character accused of the crime. For this game, this MUST be the same person as theCulprit." },
      motive: { type: Type.STRING, description: "A plausible, yet slightly silly, motive for the culprit." },
      characters: {
        type: Type.ARRAY,
        description: "A list of 3-4 characters involved in the case.",
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "The character's full name." },
            role: { type: Type.STRING, description: "The character's role or relationship to the case." },
            knowledge: { type: Type.STRING, description: "A secret brief of what this character knows. This is the most important part. The information for all characters combined must contain clues and at least one key contradiction that allows the player to solve the case. The culprit's knowledge should contain a lie or alibi that a good defense attorney could plausibly defend, but that a good prosecutor could see through. At least one other character's knowledge must contradict that lie/alibi." },
            initialStatement: { type: Type.STRING, description: "A brief, one-sentence initial statement this character gave to investigators, which will be presented at the start of the trial."}
          },
          required: ["name", "role", "knowledge", "initialStatement"]
        }
      }
    },
    required: ["caseTitle", "caseBrief", "caseOverview", "theAccused", "theCulprit", "motive", "characters"]
  };

const systemInstruction = `You are a creative writer for a noir detective game. Your task is to generate a complete, self-contained, and solvable mystery case file in JSON format. The crimes should be lighthearted and low-stakes (e.g., stolen pies, sabotaged sculptures, etc.). The case must be logically solvable by finding contradictions in witness testimonies.

IMPORTANT: The 'theAccused' and 'theCulprit' fields MUST refer to the same character. The game's premise is that the player prosecutes the correct person, who has an AI defense attorney. Ensure you provide a detailed caseOverview and an initialStatement for every character.`;


export default async (req, context) => {
    try {
        // 1. Get user from Supabase auth context
        const { user } = context.identityContext;
        if (!user) {
            return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401 });
        }

        // 2. Generate case file from Gemini AI
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Generate a new detective case file. The accused person must be the actual culprit. Ensure the culprit has a lie or a flimsy alibi in their knowledge brief that could be defended, but make sure at least one other character has knowledge that directly contradicts the culprit's story. The case must be solvable through dialogue. Include a detailed case overview and initial statements for all characters.",
            config: {
                responseMimeType: "application/json",
                responseSchema: caseSchema,
                systemInstruction: systemInstruction,
            },
        });
        const caseData = JSON.parse(response.text);

        // 3. Save the new case to Supabase DB
        const { data: newCase, error } = await supabase
            .from('cases')
            .insert({ user_id: user.sub, case_data: caseData })
            .select()
            .single();

        if (error) {
            throw new Error(`Supabase error: ${error.message}`);
        }

        // 4. Return the new case to the client
        return new Response(JSON.stringify(newCase), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in generate-case function:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
