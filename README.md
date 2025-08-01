# Case Closed: The AI Detective

**A single-player, courtroom debate game where you face off against an AI defense attorney to prove your case before an AI judge. Now featuring a clear authentication flow and a full "play as guest" mode.**

---

![Case Closed Screenshot](https://storage.googleapis.com/static.aiforkids.dev/case_closed_banner.png)

## Table of Contents

1.  [A New Kind of Detective Game](#a-new-kind-of-detective-game)
    *   [What Makes This Game Unique?](#what-makes-this-game-unique)
    *   [Who Is This Game For?](#who-is-this-game-for)
2.  [Core Gameplay Loop: A Battle of Wits](#core-gameplay-loop-a-battle-of-wits)
3.  [Feature Deep Dive](#feature-deep-dive)
    *   [Seamless Guest & Authenticated Experience](#seamless-guest--authenticated-experience)
    *   [Secure, Full-Stack Serverless Architecture](#secure-full-stack-serverless-architecture)
    *   [Dynamic Multi-AI Opponent System](#dynamic-multi-ai-opponent-system)
    *   [Argument-Driven Gameplay](#argument-driven-gameplay)
    *   [Infinite Replayability](#infinite-replayability)
4.  [Meet the AI Cast: The Minds Behind the Case](#meet-the-ai-cast-the-minds-behind-the-case)
    *   [The Creator AI (The Dramatist)](#the-creator-ai-the-dramatist)
    *   [The Witness AI (The Method Actor)](#the-witness-ai-the-method-actor)
    *   [The Defense AI (The Adversary)](#the-defense-ai-the-adversary)
    *   [The Judge AI (The Arbiter)](#the-judge-ai-the-arbiter)
5.  [Technology Stack & Design Philosophy](#technology-stack--design-philosophy)
6.  [Architectural Deep Dive](#architectural-deep-dive)
    *   [Separation of Concerns](#separation-of-concerns)
    *   [Authentication & API Flow](#authentication--api-flow)
    *   [Data Flow: Guest vs. Authenticated](#data-flow-guest-vs-authenticated)
    *   [The Critical Role of Row Level Security (RLS)](#the-critical-role-of-row-level-security-rls)
7.  [Deployment & Self-Hosting Guide](#deployment--self-hosting-guide)
8.  [Future Roadmap](#future-roadmap)
9.  [Contributing](#contributing)
10. [License](#license)

---

## A New Kind of Detective Game

Step into the well-worn shoes of a brilliant prosecutor in **Case Closed: The AI Detective**. Forget everything you know about point-and-click investigation games. This is not a search for clues in a static environment; it is a dynamic, unpredictable, and intellectually demanding courtroom showdown.

In this unique single-player experience, you are pitted against a formidable AI Defense Attorney. This is not a pre-scripted opponent. It is a dynamic adversary, tasked with defending a client who is, in a twist of game design, the true culprit. Your arena is the courtroom, your weapons are your questions, and your final arbiter is an impartial AI Judge. The entire game state—the case, the characters, their knowledge, their lies, and their reactions—is generated procedurally by a powerful language model.

Your singular goal is to build an unassailable case through strategic questioning. You must listen carefully, identify inconsistencies, expose contradictions, and corner the culprit with the sheer force of your logic. But be warned: the AI Defense Attorney is always listening, working against you at every turn. It will question witnesses to build its own narrative, create doubt, and undermine your authority.

Can you navigate the cut and thrust of a real debate, dismantle the defense's arguments, sway the judge, and deliver a closing argument so powerful that justice is not just served, but irrefutably proven? The verdict is in your hands.

### What Makes This Game Unique?

*   **It's a Debate, Not Just an Interrogation:** You're not just asking questions; you're engaged in a turn-based battle of wits with an AI opponent that has its own agency and goals.
*   **The Accused is Always Guilty:** This core design choice shifts the game from a "whodunnit" to a "how-do-you-prove-it." The challenge isn't finding the culprit, but constructing a logically sound argument that can withstand scrutiny from a clever adversary.
*   **Fully Procedural Generation:** Every element—the crime, the characters, their alibis, and the key contradictions—is generated on-the-fly. No two cases will ever be the same.
*   **Argumentation is the Core Mechanic:** Your success is directly tied to your ability to articulate your reasoning. Both accusing a suspect and objecting to the defense require you to submit your arguments in natural language, which are then evaluated by the AI.

### Who Is This Game For?

*   **Detective & Mystery Fans:** Anyone who loves the thrill of solving a complex puzzle and the satisfaction of a "Eureka!" moment.
*   **Logic Puzzle Enthusiasts:** Players who enjoy games that test their reasoning, deduction, and critical thinking skills.
*   **AI Aficionados:** Individuals curious about the capabilities of modern language models in creating dynamic, interactive, and emergent gameplay experiences.
*   **Aspiring Lawyers & Debaters:** A fun, low-stakes environment to practice the art of questioning, argumentation, and persuasion.

---

## Core Gameplay Loop: A Battle of Wits

The journey from a fresh case file to a final verdict is a strategic, turn-based battle that unfolds across several distinct phases:

1.  **Instant Access:** The moment the application loads, the path to the courtroom is clear. You can immediately start a new case as a guest, with no sign-up required. For those who wish to preserve their legacy, a seamless and separate authentication flow allows you to create an account and sign in, ensuring your case files are saved for posterity.

2.  **The Case is Forged:** Upon starting a new game, a secure request is sent to a backend serverless function. Here, the "Creator AI" springs to life, architecting a unique mystery from scratch. It devises a quirky, low-stakes crime, populates a cast of characters with distinct personalities and secrets, and carefully weaves a web of facts, alibis, and a single, critical contradiction. For guests, this freshly minted case file is sent directly to the browser for the session. For authenticated users, it is permanently etched into their personal case history in the database.

3.  **The Courtroom Convenes:** You are transported to the courtroom. The case file is not just a block of text; it's presented as an initial briefing in the dialogue box. You'll learn the title of the case, the overview of the crime, and the initial statements provided by each character, setting the stage for the trial.

4.  **The Turn-Based Debate:** The heart of the game is the intellectual duel between you (the Prosecutor) and the AI Defense Attorney.
    *   **Your Turn (The Prosecutor):** You have a limited number of questions per turn to build your case. You must choose your actions wisely:
        *   **Call Witness:** Select a character from the cast to take the stand. This is your primary means of gathering information.
        *   **Ask Question:** The core of your investigation. Interrogate the current witness with your own custom questions to probe their story and uncover hidden truths.
        *   **Pass Turn:** Confident in your progress or out of questions? End your turn and yield the floor to the defense.
    *   **The AI's Turn (The Defense):** The AI Defense Attorney is not passive. It analyzes the transcript and strategically questions the witness to obscure the truth, create reasonable doubt, and protect its client.

5.  **The Final Accusation:** When you believe you have pieced together the puzzle and can prove your case beyond a shadow of a doubt, you make your move. You "Accuse!" a character.
    *   This action triggers a climactic sequence. First, an AI clerk summarizes the entire debate transcript. This summary, along with the detailed reasoning you provide for the accusation, is presented to the impartial AI Judge.
    *   **The Three-Strikes Rule:** The stakes are high. You have a maximum of **three** accusation attempts per case. If your third attempt fails, the case is dismissed, and you lose. This mechanic forces you to be certain before you point the finger.

6.  **The Verdict:** The AI Judge considers the evidence presented in the summary and the strength of your argument. It then delivers the final, binding verdict. If you have successfully dismantled the lies and presented a coherent, logical case, the judge will declare the accused "Guilty!" You have closed the case and won the game.

---

## Feature Deep Dive

### Seamless Guest & Authenticated Experience

The application is built around the principle of "play first." There are no barriers to entry. A new player can visit the URL and be playing their first case within seconds. The "Start New Case" button is immediately available. For these guest sessions, the generated case is stored temporarily in the browser's `sessionStorage`, lasting until the tab is closed.

For players who want to track their progress, review old cases, and build a career as a prosecutor, a full authentication system is available. By navigating to dedicated "Sign In" or "Sign Up" pages, users can create a secure account. Once logged in, all generated cases and their complete transcripts are saved persistently in the database, linked to their user account.

### Secure, Full-Stack Serverless Architecture

Player trust and data security are paramount. The application employs a modern JAMstack architecture with a clear separation between the frontend client and the backend logic.

*   **No API Key Exposure:** Your sensitive Google Gemini API key is never exposed to the user's browser. It resides securely in the environment variables of the backend serverless functions.
*   **Backend-Driven AI:** All interactions with the Gemini API are handled exclusively by the backend. The frontend sends requests for specific AI actions (e.g., "get a witness response"), and the backend validates the request, constructs the appropriate prompt, communicates with the AI, and returns only the necessary data.
*   **Data Isolation:** For authenticated users, Supabase's powerful Row Level Security (RLS) is enabled on all tables. This is a database-level rule that ensures a user can *only* ever read or write data that belongs to them. There is no possibility of one user accessing another user's case files.

### Dynamic Multi-AI Opponent System

The game's depth comes from a sophisticated system of four distinct, specialized AI agents working in concert on the backend. Each AI has a unique role, personality, and set of instructions, creating a believable and challenging courtroom ecosystem. (See "Meet the AI Cast" for a detailed breakdown).

### Argument-Driven Gameplay

This is not a multiple-choice game. Your intellect is the primary input. When you make a critical move like accusing the culprit, the game prompts you for your reasoning.

*   **Example:** Instead of just clicking "Accuse Beatrice," you must explain *why*. You would type out your argument: *"I accuse Beatrice because she claimed to be at the library all afternoon, but Walter testified he saw her arguing with the victim at the docks during that exact time. Her alibi is broken."* This natural language input is then sent to the AI Judge, who evaluates the logical soundness of your argument as part of its final verdict.

### Infinite Replayability

Leveraging the power of the Gemini API's generative capabilities, the game offers limitless content. Every time you click "Start New Case," you are seeding a completely new and unpredictable mystery. The AI generates everything:
*   The nature of the low-stakes crime.
*   The names, roles, and personalities of the characters.
*   The secret knowledge each character possesses.
*   The crucial lie told by the culprit.
*   The contradictory piece of evidence held by another witness.

This ensures that no two playthroughs are ever identical, providing endless challenges and replay value.

---

## Meet the AI Cast: The Minds Behind the Case

The magic of "Case Closed" comes from a cast of specialized AI agents, each with a specific role and system instruction. They work together to create a cohesive and dynamic experience.

### The Creator AI (The Dramatist)

This is the master storyteller. When a new case begins, The Dramatist receives a prompt to write a complete, self-contained mystery. It operates like a noir detective writer, crafting a lighthearted crime, a cast of memorable characters, and the intricate web of clues, lies, and contradictions. Its single most important task is to ensure the case is logically solvable, planting the seeds of the culprit's downfall within the witness testimonies.

### The Witness AI (The Method Actor)

When you call a witness to the stand, you are interacting with The Method Actor. For each question you ask, this AI is given a strict system instruction: "You are an actor playing the role of [Witness Name]. You must answer questions based *only* on the secret 'knowledge' brief you have been given. Do not invent facts. If you don't know something, say so." This constraint is crucial; it prevents the AI from hallucinating and ensures the logical puzzle created by The Dramatist remains intact. Each witness is, in effect, a separate instance of this AI, fiercely loyal to its character's script.

### The Defense AI (The Adversary)

Your primary opponent. The Defense AI is a sharp, cunning legal mind whose sole purpose is to create reasonable doubt and protect its guilty client. On its turn, it receives the entire debate transcript and is asked, "What is your next move?" It analyzes your line of questioning, identifies weaknesses, and asks its own questions to poke holes in your theories or offer alternative explanations for the evidence. It is designed to be a constant source of pressure, forcing you to tighten your arguments.

### The Judge AI (The Arbiter)

The final authority. The Judge AI is the embodiment of impartiality. It remains silent throughout the trial until you make a final accusation. At that point, it is presented with a neutral summary of the entire transcript and your final, written argument. Its system instruction is to act as an impartial judge and determine if the prosecutor has proven guilt "beyond a reasonable doubt" based *only* on the provided information. It delivers the final verdict and a brief, logical reasoning for its decision.

---

## Technology Stack & Design Philosophy

The choice of every technology in this stack was deliberate, balancing performance, developer experience, security, and the core philosophical goals of the project.

*   **Frontend: Vanilla HTML, CSS, JavaScript (ES6 Modules)**
    *   **What:** The entire user interface is built with fundamental web technologies, without any large JavaScript frameworks like React, Vue, or Angular.
    *   **Why:** This approach prioritizes simplicity, performance, and accessibility. It results in a fast-loading, lightweight application that runs efficiently on a wide range of devices. It also serves as a demonstration of how to build a complex, stateful application using modern, standard browser features like ES6 Modules and `importmap`.

*   **Backend: Netlify Functions (Serverless)**
    *   **What:** All backend logic, including every call to the Gemini API, is encapsulated in serverless functions deployed on Netlify.
    *   **Why:** Serverless architecture is incredibly powerful. It automatically scales to meet demand, requires zero server maintenance, and provides a secure environment to run sensitive code and handle API keys. It's a cost-effective and robust solution for this type of application.

*   **Database & Auth: Supabase**
    *   **What:** Supabase provides a powerful PostgreSQL database, a complete authentication system, and auto-generated APIs.
    *   **Why:** Supabase is an all-in-one backend-as-a-service that dramatically simplifies development. Its built-in authentication is easy to integrate and secure. The real power for this application comes from its PostgreSQL foundation and, most importantly, its fine-grained Row Level Security (RLS), which is the cornerstone of the application's multi-tenant security model.

*   **AI Engine: Google Gemini 2.5 Flash**
    *   **What:** The latest and fastest multimodal model from Google, used for all AI generation tasks.
    *   **Why:** `gemini-2.5-flash` represents the perfect balance of speed, intelligence, and cost-effectiveness for a real-time interactive application. Its excellent ability to follow complex `systemInstruction` prompts is critical for the Multi-AI system, and its reliable JSON output mode (`responseSchema`) is essential for generating structured case data.

*   **Design Philosophy: Low-Stakes Noir & The Guilty Accused**
    *   **Why:** The game intentionally avoids serious or violent crimes. The "noir" aesthetic is applied to lighthearted scenarios (e.g., "The Case of the Pilfered Petunias") to keep the focus on the intellectual puzzle rather than grim subject matter. By making the accused the true culprit, the game's challenge shifts from a simple "whodunnit" to a more nuanced and difficult "how-do-you-prove-it," making it a pure test of logical argumentation.

---

## Architectural Deep Dive

### Separation of Concerns

The application maintains a strict separation between the client (what runs in the browser) and the server (the Netlify Functions).
*   **Client (Frontend):** Responsible for rendering the UI, managing the game state during a session, capturing user input, and making API calls to the backend. It has no direct knowledge of the Gemini API.
*   **Server (Backend):** A stateless collection of functions responsible for handling all AI-related logic, securely communicating with the Gemini API, and interacting with the Supabase database for authenticated users.

### Authentication & API Flow

1.  A user signs in via the Supabase client-side library.
2.  Supabase returns a JSON Web Token (JWT) to the client. This token is a secure credential that proves the user's identity.
3.  When the client makes a request to a backend Netlify Function (e.g., `/api/initiate-case`), it includes this JWT in the `Authorization: Bearer <token>` HTTP header.
4.  The Netlify Function receives the request, automatically validates the JWT, and makes the user's identity available in the `context` object. This allows the function to securely perform actions on behalf of that specific user, like saving a case to the database under their `user_id`.

### Data Flow: Guest vs. Authenticated

**Guest Player Flow:**
1.  `Client` -> `POST /api/initiate-case`
2.  `Backend` -> Creates a 'PENDING' record in the `guest_cases` table and returns a `caseId`.
3.  `Client` -> `POST /api/process-case` (fire-and-forget)
4.  `Backend` Worker -> Calls `Gemini API`, gets `caseData`, updates `guest_cases` record.
5.  `Client` -> polls `GET /api/poll-case` until status is 'READY'.
6.  The gameplay loop continues, with state managed entirely on the client.

**Authenticated Player Flow:**
1.  `Client` (with Auth JWT) -> `POST /api/initiate-case`
2.  `Backend` -> Verifies JWT, creates a 'PENDING' record in the `cases` table with the user's ID, returns `caseId`.
3.  `Client` -> `POST /api/process-case` (fire-and-forget)
4.  `Backend` Worker -> Calls `Gemini API`, gets `caseData`, updates `cases` record.
5.  `Client` -> polls `GET /api/poll-case` until status is 'READY'.
6.  During gameplay, the `Client` saves transcript entries to `Supabase` linked by `case_id`.

### The Critical Role of Row Level Security (RLS)

RLS is the silent guardian of user data in this architecture. It is a set of policies written in SQL that are applied directly to the database tables. For this app, the policies state:

*   **For the `cases` table:** A user can only `SELECT`, `INSERT`, or `UPDATE` rows where the `user_id` column matches their own authenticated ID.
*   **For the `transcripts` table:** A user can only access a transcript row if they are the owner of the case that the transcript belongs to.

This means that even if a malicious actor somehow managed to make an API call attempting to read another user's data, the request would fail at the database level. It is the most robust way to enforce data privacy in a multi-tenant application.

---

## Deployment & Self-Hosting Guide

This project is designed for straightforward deployment on Netlify. Follow these steps to deploy your own instance.

**Prerequisites:**
*   A [Netlify](https://www.netlify.com/) account.
*   A [Supabase](https://supabase.com/) account.
*   A [Google AI Studio](https://aistudio.google.com/) account to get a Gemini API key.
*   [Git](https://git-scm.com/) installed on your local machine.

**Step 1: Clone the Repository**
```bash
git clone <repository_url>
cd case-closed-ai-detective
```

**Step 2: Set up Supabase**
1.  In your Supabase dashboard, create a new project.
2.  Once the project is ready, go to the **SQL Editor**.
3.  Copy the entire content of the `supabase.txt` file from this repository and run it in the SQL Editor. This will create the `cases` and `transcripts` tables and enable Row Level Security.
4.  Go to **Project Settings > API**. Keep this page open. You will need the **Project URL** and the `anon` **public** key. You will also need the `service_role` **secret** key.

**Step 3: Get your Gemini API Key**
1.  Go to Google AI Studio.
2.  Click on "Get API key" and create a new API key in a new project.
3.  Copy the API key and store it securely.

**Step 4: Configure and Deploy on Netlify**
1.  Log in to your Netlify account.
2.  Click "Add new site" -> "Import an existing project".
3.  Connect to your Git provider and select the repository you just cloned.
4.  Ensure you have a `netlify.toml` file in your repository root. Netlify will use this to configure the build settings automatically. The `publish` directory should be `.` and the `functions` directory should be `netlify/functions`.
5.  Before deploying, go to **Site settings > Build & deploy > Environment**.
6.  Click "Edit variables" and add the following environment variables:

    *   **`GEMINI_API_KEY`**: Your secret key from Google AI Studio.
    *   **`SUPABASE_URL`**: Your Project URL from Supabase API settings.
    *   **`SUPABASE_ANON_KEY`**: Your `anon` public key from Supabase API settings.
    *   **`SUPABASE_SERVICE_ROLE_KEY`**: Your `service_role` secret key from Supabase API settings.

    **Important:** The `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are used by the backend functions. The `SUPABASE_URL` and `SUPABASE_ANON_KEY` are used by both the functions and the frontend build process.

**Step 5: Deploy!**
1.  Go back to the deploys section for your new site.
2.  Click "Trigger deploy" -> "Deploy site".
3.  Once the build is complete, your instance of "Case Closed: The AI Detective" will be live!

---

## Future Roadmap

This project has a strong foundation with many exciting possibilities for future expansion.

*   **Case Files & Player Stats:** A dedicated screen for logged-in users to browse their completed and ongoing cases, review transcripts, and see their win/loss statistics.
*   **Advanced Case Logic:** Introducing more complex cases with red herrings, multiple key contradictions, or characters who are uncooperative, requiring different strategies to extract information.
*   **AI Difficulty Levels:** Allowing the player to select a difficulty level for the AI Defense Attorney, ranging from a bumbling public defender to a legendary legal shark.
*   **Enhanced Immersion:** Adding thematic sound effects (courtroom chatter, a gavel sound), ambient noir-style music, and subtle animations to increase player immersion.
*   **Hint System:** An optional system where the player can spend "credibility" points to get a hint from a wise, old mentor character if they get stuck.

---

## Contributing

This is a personal portfolio project, but feedback and suggestions are always welcome. Please feel free to open an issue on the GitHub repository to report a bug or propose a new feature.

---

## License

This project is open-source and available under the MIT License.