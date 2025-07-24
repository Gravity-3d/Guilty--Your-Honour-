import { GoogleGenAI, Type } from "@google/genai";

// Initialize AI client from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const schema = {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["ask", "pass", "object"] },
            question: { type: Type.STRING },
            reason: { type: Type.STRING }
        },
        required: ["action"]
    };

  return {
    contents: 'What is your next move?',
    config: {
      systemInstruction: `You are a sharp defense attorney AI. Your client, ${currentCase.theAccused}, is the real culprit. Your goal is to defend them by creating reasonable doubt. It is your turn.
The current witness is ${currentWitness?.name || 'none'}. You have asked ${questionsThisTurn} questions this turn (max 10).
The prosecutor's last question was: "${canObject ? lastQuestion.text : 'N/A'}".
Here is the debate transcript so far:
---
${transcriptText}
---
Based on the transcript, decide your next move. Respond in JSON format.`,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };
};

const getJudgeRulingConfig = (payload) => {
    const { question, reason } = payload;
    return {
        contents: 'Your ruling?',
        config: {
            systemInstruction: `You are an impartial Judge. A counsel has objected to the opposing counsel's question.
Question: "${question}"
Reason for objection: "${reason}"
You must decide if the objection is valid. Respond with only one word: "Sustained" (if the question is improper) or "Overruled" (if it is a fair question).`,
        },
    };
};

const getFinalVerdictConfig = (payload) => {
    const { summary, accusationReason, currentCase } = payload;
    return {
        contents: `Based on the summary and argument, is ${currentCase.theAccused} guilty?`,
        config: {
            systemInstruction: `You are an impartial Judge. Based *only* on the following debate summary and the prosecutor's final argument, you must decide if the prosecutor has proven **beyond a reasonable doubt** that ${currentCase.theAccused} is guilty.
DEBATE SUMMARY:
---
${summary}
---
PROSECUTOR'S ARGUMENT:
---
${accusationReason}
---
Your response must be a JSON object with two fields: "verdict" and "reasoning".
- "verdict": Your verdict, either "Guilty" or "Innocent".
- "reasoning": A brief, 1-2 sentence explanation for your verdict.`,
            responseMimeType: 'application/json',
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
  try {
    // This endpoint is public to allow guest play.
    // The AI actions themselves are stateless and do not modify user-specific data directly.

    const payload = await req.json();
    const { action } = payload;

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
      case 'getFinalVerdict':
        aiConfig = getFinalVerdictConfig(payload);
        break;
      case 'getTranscriptSummary':
        aiConfig = getTranscriptSummaryConfig(payload);
        break;
      default:
        throw new Error('Invalid AI action specified.');
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
    console.error(`Error in ai-handler for action:`, error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};