

import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// Initialize AI and Supabase clients from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// --- AI Persona Functions ---
// These functions construct the system instructions and configurations for the AI

const getWitnessConfig = (payload) => {
  const { currentWitness, question } = payload;
  return {
    contents: question,
    config: {
      systemInstruction: `You are an actor playing a character in a detective game.
Your character's name is ${currentWitness.name}.
Your role is: ${currentWitness.role}.
You have been given a secret 'knowledge' brief. You MUST adhere strictly to it.
DO NOT invent any information not present in your secret brief.
If a question you cannot answer from your brief is asked, you MUST respond with 'I don't recall,' 'I'm not sure,' or a similar phrase of uncertainty.
Your responses should be short and conversational (1-3 sentences). Stay in character at all times.
---
SECRET KNOWLEDGE BRIEF:
${currentWitness.knowledge}
---`,
    },
  };
};

const getDefenseActionConfig = (payload) => {
  const { currentCase, currentWitness, questionsThisTurn, lastQuestion, debateTranscript } = payload;
  const canObject = lastQuestion.speaker === 'PROSECUTOR';
  const transcriptText = debateTranscript.map(d => `${d.speaker}: ${d.text}`).join('\n');
  const publicInfo = JSON.stringify(currentCase.publicDossier, null, 2);

  const schema = {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["ask", "pass", "object"] },
            question: { type: Type.STRING, description: "Your question, if action is 'ask'." },
            reason: { type: Type.STRING, description: "Your reason, if action is 'object'." }
        },
        required: ["action"]
    };

  return {
    contents: 'What is your next move?',
    config: {
      systemInstruction: `You are a sharp defense attorney AI. Your client, ${currentCase.theAccused}, is the real culprit, but you do NOT know this for a fact. You only know what is in the public dossier and what has been said in court. Your goal is to defend your client by creating reasonable doubt.
---
PUBLIC DOSSIER (Facts known by all):
${publicInfo}
---
The current witness is ${currentWitness?.name || 'none'}. You have asked ${questionsThisTurn} questions this turn (max 10).
The prosecutor's last question was: "${canObject ? lastQuestion.text : 'N/A'}".
Here is the debate transcript so far:
---
${transcriptText}
---
Based ONLY on the public dossier and the transcript, decide your next move. Your options are:
1.  **object**: If the prosecutor's last question was improper (e.g., leading, speculative, irrelevant), you can object. This is a high-risk move. If the judge overrules, you lose your turn. You MUST provide a 'reason'.
2.  **ask**: Ask the current witness a question to build your case or poke holes in the prosecutor's.
3.  **pass**: Pass the turn if you have no effective questions.

Respond in JSON format.`,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };
};

const getJudgeRulingConfig = (payload) => {
    const { question, reason } = payload;
    return {
        contents: `The defense objects to the question "${question}" for the reason: "${reason}". Your ruling?`,
        config: {
            systemInstruction: `You are an impartial Judge. A counsel has objected to the opposing counsel's question.
You must decide if the objection is valid. Respond with only one word: "Sustained" (if the question is improper) or "Overruled" (if it is a fair question).`,
        },
    };
};

const getFinalVerdictConfig = (payload) => {
    const { summary, accusationReason, currentCase } = payload;
    const publicInfo = JSON.stringify(currentCase.publicDossier, null, 2);
    const schema = {
        type: Type.OBJECT,
        properties: {
            verdict: { type: Type.STRING, enum: ["Guilty", "Innocent"] },
            reasoning: { type: Type.STRING }
        },
        required: ["verdict", "reasoning"]
    };
    return {
        contents: `Based on the public info, the summary of testimony, and the prosecutor's final argument, is ${currentCase.theAccused} guilty?`,
        config: {
            systemInstruction: `You are an impartial Judge. Based *only* on the following information, you must decide if the prosecutor has proven **beyond a reasonable doubt** that ${currentCase.theAccused} is guilty. You do not have access to any secret knowledge.
---
PUBLIC DOSSIER (Initial Facts):
${publicInfo}
---
DEBATE SUMMARY (Testimony in court):
${summary}
---
PROSECUTOR'S FINAL ARGUMENT:
${accusationReason}
---
Your response must be a JSON object with two fields: "verdict" and "reasoning".
- "verdict": Your verdict, either "Guilty" or "Innocent".
- "reasoning": A brief, 1-2 sentence explanation for your verdict.`,
            responseMimeType: 'application/json',
            responseSchema: schema
        },
    };
};

const getTranscriptSummaryConfig = (payload) => {
    const { debateTranscript } = payload;
    const fullTranscript = debateTranscript.map(d => `${d.speaker}: ${d.text}`).join('\n');
    return {
        contents: fullTranscript,
        config: {
            systemInstruction: `You are a court clerk. Summarize the following debate transcript into a concise, neutral summary of the key evidence and arguments. Focus on the facts presented and any contradictions that arose.`,
        },
    };
};


// Main handler function
export default async (req, context) => {
  let payload;
  try {
    payload = await req.json();
    const { action } = payload;

    // Special handling for combined action to prevent timeouts
    if (action === 'getFinalVerdictWithSummary') {
        // Step 1: Generate Transcript Summary
        const summaryConfig = getTranscriptSummaryConfig(payload);
        const summaryResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            ...summaryConfig
        });
        const summary = summaryResponse.text;

        // Step 2: Generate Final Verdict using the summary
        const verdictPayload = { ...payload, summary };
        const verdictConfig = getFinalVerdictConfig(verdictPayload);
        const verdictResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            ...verdictConfig
        });
        
        const verdictData = JSON.parse(verdictResponse.text);

        // Return the summary along with the verdict data
        const combinedData = {
            summary,
            ...verdictData
        };

        return new Response(JSON.stringify({ data: combinedData }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let aiConfig;
    switch (action) {
      case 'getWitnessResponse':
        aiConfig = getWitnessConfig(payload);
        break;
      case 'getDefenseAction':
        aiConfig = getDefenseActionConfig(payload);
        break;
      case 'getJudgeRuling':
        aiConfig = getJudgeRulingConfig(payload);
        break;
      default:
        throw new Error(`Invalid or unsupported AI action specified: ${action}`);
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        ...aiConfig
    });
    
    const isJson = aiConfig.config.responseMimeType === 'application/json';
    const responseData = isJson ? JSON.parse(response.text) : response.text;

    return new Response(JSON.stringify({ data: responseData }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const action = payload ? payload.action : 'unknown';
    console.error(`Error in ai-handler for action "${action}":`, error);
    const errorMessage = error.message || "An unknown error occurred.";
    return new Response(JSON.stringify({ error: `AI handler failed for action "${action}": ${errorMessage}` }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};