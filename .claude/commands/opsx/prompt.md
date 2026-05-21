---
name: "OPSX: Prompt"
description: "Convert a raw natural-language feature idea into a polished, structured prompt ready for /opsx:feature"
category: Workflow
tags: [workflow, prompt-engineering, pre-pipeline]
---

Turn a fuzzy natural-language idea into a professional, structured prompt that BA can consume with minimal clarification.

This runs BEFORE `/opsx:feature`. The output is a polished prompt block that you copy and paste as input to `/opsx:feature`.

**Input**: The text after `/opsx:prompt` — a raw feature idea in any form (Vietnamese, English, bullet points, stream of consciousness). Can also be empty.

**Pipeline**

```
Raw idea (user)
      ↓
  @prompt-engineer (investigate codebase, ask clarifying questions)
      ↓
Polished prompt (output — copyable block)
      ↓
User → /opsx:feature <polished prompt>
```

**Steps**

### 1. Capture the raw idea

If the user provided text after `/opsx:prompt`, that IS the raw idea — pass it directly to `@prompt-engineer`.

If the user ran `/opsx:prompt` with no input, use the **AskUserQuestion tool** (open-ended) to ask:
> "What feature do you want to build? Describe it in any language, any level of detail — the prompt-engineer will refine it."

Do NOT proceed without a raw idea.

### 2. Delegate to prompt-engineer

Invoke the `prompt-engineer` subagent with the raw idea as input.

The subagent will:
- Read `CLAUDE.md` and target-repo context
- Skim related modules to understand what already exists
- Ask 1-3 rounds of clarifying questions via `AskUserQuestion` (max 3-4 questions per round)
- Produce a polished prompt using a flexible template (only sections that add signal)

Wait for it to complete.

### 3. Surface the output

The subagent returns:
- A polished prompt inside a fenced code block
- A short list of assumptions it made
- A short list of things the user should review before running `/opsx:feature`

Display its output verbatim. Do NOT paraphrase or re-structure — the user needs to copy the block cleanly.

### 4. Suggest next step

After showing the output, end with:

```
Next step: run `/opsx:feature` and paste the prompt block above when asked for the feature description.
```

**Output**

The final terminal output should look like:

````
## Polished Prompt Ready

Copy the block below and paste it as the input to `/opsx:feature`:

---
```
## Feature: <title>

### Goal
...

### Context
...

### Scope
...

### Success Criteria
...
```
---

### What I Assumed
- ...

### What You Should Review
- ...

Next step: run `/opsx:feature` and paste the prompt block above when asked for the feature description.
````

**Guardrails**
- This command does NOT create specs, Beads tasks, or branches — only the polished prompt.
- Max 3 rounds of clarifying questions in prompt-engineer.
- If the user's input is already well-structured, prompt-engineer may return it largely unchanged — that's correct, not a failure.
- If the raw idea is off-pipeline (e.g. "explain how X works"), prompt-engineer will say so and NOT produce a fake prompt.
