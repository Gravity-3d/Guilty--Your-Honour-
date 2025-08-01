
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const getWitnessConfig = ({ currentWitness, question }) => ({
    contents: question,
    config: {
      systemInstruction: `You are an actor playing ${currentWitness.name} (${currentWitness.role}) in a detective game.
Strictly adhere to your secret knowledge brief. DO NOT invent information. If asked something not in your brief, respond with "I don't recall" or similar uncertainty.
Your responses should be short and conversational. Stay in character.
SECRET KNOWLEDGE BRIEF: ${currentWitness.knowledge}`,
    },
});

const getDefenseActionConfig = ({ currentCase, currentWitness, questionsThisTurn, lastQuestion, debateTranscript }) => {
  const canObject = lastQuestion.speaker === 'PROSECUTOR';
  const transcriptText = debateTranscript.map(d => `${d.speaker}: ${d.text}`).join('\n');
  const publicInfo = JSON.stringify(currentCase.publicDossier, null, 2);

  return {
    contents: 'What is your next move?',
    config: {
      systemInstruction: `You are a defense attorney AI. Your client, ${currentCase.theAccused}, is guilty, but you don't know this. Your goal is to create reasonable doubt based ONLY on public info and the transcript.
---
PUBLIC DOSSIER:
${publicInfo}
---
The current witness is ${currentWitness?.name || 'none'}. You have asked ${questionsThisTurn} questions this turn (max 10).
The prosecutor's last question was: "${canObject ? lastQuestion.text : 'N/A'}".
Transcript so far:
---
${transcriptText}
---
Decide your move: 'object' (if the last question was improper, provide a 'reason'), 'ask' (ask the witness a 'question'), or 'pass'. Respond in JSON.`,
      responseMimeType: "application/json",
      responseSchema: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ["ask", "pass", "object"] },
                question: { type: Type.STRING },
                reason: { type: Type.STRING }
            },
            required: ["action"]
        },
    },
  };
};

const getJudgeRulingConfig = ({ question, reason }) => ({
    contents: `The defense objects to the question "${question}" for the reason: "${reason}". Your ruling?`,
    config: {
        systemInstruction: `You are a Judge. An objection has been raised. Is it valid? Respond with ONLY "Sustained" or "Overruled".`,
    },
});

const getFinalVerdictConfig = ({ summary, accusationReason, currentCase }) => {
    const publicInfo = JSON.stringify(currentCase.publicDossier, null, 2);
    return {
        contents: `Based on public info, testimony, and the prosecutor's argument, is ${currentCase.theAccused} guilty?`,
        config: {
            systemInstruction: `You are an impartial Judge. Based ONLY on the following, decide if guilt is proven beyond a reasonable doubt. You do not have secret knowledge.
---
PUBLIC DOSSIER:
${publicInfo}
---
DEBATE SUMMARY:
${summary}
---
PROSECUTOR'S FINAL ARGUMENT:
${accusationReason}
---
Respond with a JSON object containing "verdict" ('Guilty' or 'Innocent') and "reasoning" (a brief explanation).`,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    verdict: { type: Type.STRING, enum: ["Guilty", "Innocent"] },
                    reasoning: { type: Type.STRING }
                },
                required: ["verdict", "reasoning"]
            }
        },
    };
};

const getTranscriptSummaryConfig = ({ debateTranscript }) => ({
    contents: debateTranscript.map(d => `${d.speaker}: ${d.text}`).join('\n'),
    config: {
        systemInstruction: `You are a court clerk. Summarize the following transcript into a concise, neutral summary of key evidence and contradictions.`,
    },
});

export default async (req) => {
  let payload;
  try {
    payload = await req.json();
    const { action } = payload;

    if (action === 'getFinalVerdictWithSummary') {
        const summaryConfig = getTranscriptSummaryConfig(payload);
        const summaryResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', ...summaryConfig });
        const summary = summaryResponse.text;

        const verdictPayload = { ...payload, summary };
        const verdictConfig = getFinalVerdictConfig(verdictPayload);
        const verdictResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', ...verdictConfig });
        
        const verdictData = JSON.parse(verdictResponse.text);

        const combinedData = { summary, ...verdictData };

        return new Response(JSON.stringify({ data: combinedData }), { headers: { 'Content-Type': 'application/json' } });
    }

    let aiConfig;
    switch (action) {
      case 'getWitnessResponse': aiConfig = getWitnessConfig(payload); break;
      case 'getDefenseAction': aiConfig = getDefenseActionConfig(payload); break;
      case 'getJudgeRuling': aiConfig = getJudgeRulingConfig(payload); break;
      default: throw new Error(`Invalid action: ${action}`);
    }

    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', ...aiConfig });
    
    const isJson = aiConfig.config.responseMimeType === 'application/json';
    const responseData = isJson ? JSON.parse(response.text) : response.text;

    return new Response(JSON.stringify({ data: responseData }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    const action = payload ? payload.action : 'unknown';
    return new Response(JSON.stringify({ error: `AI handler failed for action "${action}": ${error.message}` }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
