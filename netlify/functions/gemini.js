import { GoogleGenAI, Type } from "@google/genai";

/**
 * Netlify Function: Gemini Proxy
 * Accesses process.env.API_KEY securely on the server side.
 */
export const handler = async (event) => {
  // CORS Headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTION",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    const { action, payload } = JSON.parse(event.body);
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return { 
        statusCode: 500, 
        headers,
        body: JSON.stringify({ error: "API_KEY is missing in Netlify Environment Variables. Go to Site Settings > Build & Deploy > Environment Variables to set it." }) 
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelName = 'gemini-3-flash-preview';

    switch (action) {
      case 'generateMystery':
        const mysteryResponse = await ai.models.generateContent({
          model: modelName,
          contents: `Generate a gritty 1940s noir murder mystery. Return JSON. 
                     Include: caseTitle, scene description, victim details, 
                     3 suspects (name, motive, alibi), 4 pieces of evidence, secret guiltyParty name (must be one of the suspects), and logic explanation.`,
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
        return { statusCode: 200, headers, body: mysteryResponse.text };

      case 'interrogate':
        const interrogationResponse = await ai.models.generateContent({
          model: modelName,
          contents: `You are ${payload.name}, a suspect in a noir trial. Your alibi is: ${payload.alibi}. A detective is pressuring you. Deliver a short, nervous, high-pressure testimony (max 3 sentences).`
        });
        return { statusCode: 200, headers, body: JSON.stringify({ text: interrogationResponse.text }) };

      case 'verdict':
        const verdictPrompt = `Noir trial resolution. Accused: ${payload.accused}. Killer: ${payload.killer}. Logic: ${payload.logic}. Outcome: ${payload.isCorrect ? 'Justice' : 'Mistrial'}. Write exactly 3 dramatic sentences in noir style summarizing the final scene.`;
        const verdictResponse = await ai.models.generateContent({
          model: modelName,
          contents: verdictPrompt
        });
        return { statusCode: 200, headers, body: JSON.stringify({ text: verdictResponse.text }) };

      default:
        return { statusCode: 400, headers, body: "Invalid Action" };
    }
  } catch (error) {
    console.error("Gemini Function Error:", error);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: `Internal Server Error: ${error.message}` }) 
    };
  }
};