
# Case Closed: The AI Detective

**A single-player, courtroom debate game where you face off against an AI defense attorney to prove your case before an AI judge.**

---

![Case Closed Screenshot](https://storage.googleapis.com/static.aiforkids.dev/case_closed_banner.png)

## Table of Contents

1.  [Introduction](#introduction)
2.  [Core Gameplay Loop](#core-gameplay-loop)
3.  [Key Features](#key-features)
4.  [Technology Stack](#technology-stack)
5.  [Architectural Overview](#architectural-overview)
6.  [Getting Started](#getting-started)

---

## Introduction

Step into the shoes of a brilliant prosecutor in **Case Closed: The AI Detective**. This is not a simple interrogation simulator; it's a full-fledged courtroom showdown. In this unique single-player experience, you are pitted against a dynamic AI Defense Attorney, tasked with defending a client who is, in fact, the true culprit. Your arena is the courtroom, your weapons are your questions, and your final arbiter is an impartial AI Judge.

Every case is a unique, AI-generated mystery. You will be presented with a crime and a cast of AI-powered witnesses, each holding a piece of the puzzle. Your goal is to build a case through strategic questioning, expose contradictions, and corner the culprit. But be warned: the AI Defense Attorney will be working against you every step of the way, questioning witnesses to create doubt and objecting to your methods.

Can you navigate the cut and thrust of a real debate, sway the judge, and deliver a closing argument so powerful that justice is served? The verdict is in your hands.

---

## Core Gameplay Loop

The journey from a fresh case file to a final verdict is a strategic, turn-based battle of wits:

1.  **AI Case Generation:** When you begin, a "Creator AI" generates a unique, solvable, low-stakes mystery. It establishes the crime, the characters, and the culprit, who is also assigned as the "accused" that the Defense Attorney must represent.

2.  **The Courtroom Opens:** You enter the courtroom. The stage is set with the Witness Stand, the Defense Attorney's desk, and the Judge's bench (implicitly). A transcript will log every action of the debate.

3.  **Turn-Based Debate:** The game proceeds in turns between you (the Prosecutor) and the AI Defense Attorney.
    *   **Your Turn (Prosecutor):** You have a maximum of 10 questions per turn. You can:
        *   **Call Witness:** Select a character to take the stand.
        *   **Ask:** Type your own questions to interrogate the witness, building your case and exposing lies.
        *   **Pass:** End your turn and hand the floor to the defense.
    *   **AI's Turn (Defense Attorney):** The Defense AI takes its turn, asking questions of the witness to poke holes in their testimony and create reasonable doubt about its client's guilt.
    *   **The Transcript:** Every question, answer, objection, and ruling is recorded in the dialogue log, forming the official record of the trial.

4.  **The Objection Mechanic:** At any point, if the opposing counsel has just asked a question, you can "Object!".
    *   The question is sent to the impartial AI Judge.
    *   The Judge rules to **Sustain** the objection (the question is improper, and the witness will not answer) or **Overrule** it (the question is fair, and the witness must answer).
    *   This adds a layer of tactical interruption to the debate.

5.  **The Final Accusation:** When you believe you have built an unbreakable case, you "Accuse!" the culprit.
    *   An AI first summarizes the entire debate transcript to capture the key points of your argument.
    *   This summary is presented to the AI Judge for the final verdict.
    *   The Judge analyzes the evidence presented and decides if you have proven your case "beyond a reasonable doubt."

6.  **The Verdict:** The Judge delivers the final word: "Guilty" or "Innocent." If you succeed, the case is closed. If you fail, the culprit walks free, and you have lost the debate.

---

## Key Features

*   **Multi-AI System:** The game is powered by four distinct AI roles:
    *   **The Creator:** Writes a unique and solvable mystery for every playthrough.
    *   **The Witness:** Flawlessly role-plays characters, adhering to a secret knowledge brief.
    *   **The Defense Attorney:** Your opponent, a strategic AI that actively works to discredit your case.
    *   **The Judge:** An impartial arbiter that rules on objections and delivers the final verdict.

*   **Turn-Based Strategic Gameplay:** This is a game of strategy, not just questions. You must manage your turn, decide when to press an advantage, and when to pass and see what the defense will do.

*   **Dynamic Objection System:** The ability to object to the defense's questions adds a reactive, tactical layer, making the debate feel more authentic and interactive.

*   **AI-Judged Verdicts:** Your success is not based on a simple right/wrong answer. It's determined by an AI Judge that analyzes the quality of your arguments as presented in the debate transcript.

*   **Endless Replayability:** With AI generating every case and every response, no two games will ever be the same.

---

## Technology Stack

*   **Frontend:** `HTML5`, `CSS3`, `JavaScript (ES6 Modules)`
*   **AI Engine:** `Google Gemini API` (specifically the `gemini-2.5-flash` model)
*   **AI SDK:** `@google/genai`
*   **Styling:** Pure CSS with CSS Variables and `Google Fonts`.
*   **Module Handling:** `importmap` for native, in-browser module resolution.

---

## Architectural Overview

The application's architecture is designed to support a complex, multi-agent AI system within a simple, client-side structure.

*   **`index.js`:** Manages the main menu. Its key role is to call the **Creator AI** to generate a case JSON object, which includes the story, characters, and the identity of the culprit.

*   **`courtroom.js`:** The brain of the application. It manages the entire game state: the current turn, the witness on the stand, the debate transcript, and the state of all AI agents.
    *   **AI Personas:** The script contains specific functions to interact with each AI role. For example, `getDefenseAction()` sends the current transcript to an AI with the system instruction to act as a defense attorney, while `getJudgeRuling()` sends a statement to an AI instructed to be an impartial judge.
    *   **Game Loop:** A central `nextTurn()` function orchestrates the flow of the game, activating either the player's controls or the `runDefenseTurn()` function, which prompts the Defense Attorney AI for its move.
    *   **State Management:** The `debateTranscript` array is the most critical piece of state. It is the single source of truth for the entire trial and is used by the AI agents to make their decisions.

---

## Getting Started

The application is designed to run directly in a modern web browser. As it relies on the Google Gemini API, a valid API key is required.

In the intended execution environment, the API key is expected to be securely pre-configured as an environment variable (`process.env.API_KEY`). No setup is required from the user's end to provide the key.

To run the project:
1.  Ensure you have all the project files (`index.html`, `courtroom.html`, `style.css`, `index.js`, `courtroom.js`).
2.  Serve the files using a local web server (e.g., Python's `http.server` or VS Code's "Live Server" extension).
3.  Open your web browser and navigate to the local server's address.
