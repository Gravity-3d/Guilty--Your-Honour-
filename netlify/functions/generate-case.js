

import { GoogleGenAI } from "@google/genai";

// Initialize AI client from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const systemInstruction = `You are a creative writer for a noir detective game. Your task is to generate a complete mystery case file as a stream of single-line JSON objects.
Each line MUST be a valid JSON object followed by a newline character.
Generate the case data in this exact order: caseTitle, caseBrief, caseOverview, theCulprit, theAccused, motive, and then EACH character object one by one.
- The crimes must be lighthearted and low-stakes (e.g., stolen pies, sabotaged sculptures).
- The case must be logically solvable by finding contradictions in witness testimonies.
- You must generate EXACTLY TWO characters.
- IMPORTANT: The 'theAccused' and 'theCulprit' fields MUST refer to the same character. The game's premise is that the player prosecutes the correct person.
- The culprit's 'knowledge' brief MUST contain a lie or a flimsy alibi.
- The other character's 'knowledge' MUST directly contradict the culprit's story.
- You must provide a detailed 'caseOverview' and an 'initialStatement' for every character.

The output MUST be a sequence of JSON objects, each on its own line.
Example of a single line:
{"key": "caseTitle", "value": "The Case of the Pilfered Petunias"}
Another example line:
{"key": "character", "value": {"name": "Reginald P. Snodgrass", "role": "Victim", "knowledge": "I saw Beatrice near my prize-winning petunias right before they vanished. She was muttering about 'horticultural justice'.", "initialStatement": "My petunias, my pride and joy, have been purloined!"}}
`;


export default async (req, context) => {
    try {
        const geminiStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: "Generate a new detective case file as a stream of line-delimited JSON objects.",
            config: {
                systemInstruction: systemInstruction,
            },
        });

        // Create a TransformStream to pipe Gemini's output to the client.
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Asynchronously read from Gemini and write to our stream.
        (async () => {
            try {
                for await (const chunk of geminiStream) {
                    // Ensure text exists before writing to avoid sending empty chunks
                    if (chunk.text) {
                        writer.write(encoder.encode(chunk.text));
                    }
                }
            } catch (streamError) {
                console.error("Error during Gemini stream processing:", streamError);
                writer.abort(streamError);
            } finally {
                writer.close();
            }
        })();
        
        // Return our readable stream immediately to the client.
        return new Response(readable, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

    } catch (error) {
        console.error('Error in generate-case function:', error);
        const errorMessage = error.message || "An unknown error occurred.";
        return new Response(JSON.stringify({ error: `Failed to start case generation stream: ${errorMessage}` }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};