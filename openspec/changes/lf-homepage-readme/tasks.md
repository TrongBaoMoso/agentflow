# Tasks: lf-homepage-readme

## 1. Documentation

- [ ] 1.1 Write new README.md for lf-homepage
  - **File:** `lf-homepage/README.md`
  - **Action:** Replace the entire file (current content is default create-next-app boilerplate)
  - **Sections to include:** Project title, Product Overview, Key Features, Tech Stack (table), Prerequisites, Getting Started (install + dev/build/start commands), Environment Variables (table from CLAUDE.md section 4), Internationalization (5 locales, prefix strategy), Project Structure (abbreviated tree), Deployment (Docker mention + standalone mode), Branch Workflow
  - **Language:** English
  - **Audience:** Developers and external stakeholders
  - **Constraints:** Under 200 lines, no badges/screenshots/diagrams, no emojis, mention Docker is supported without detailed steps
  - **Acceptance criteria:** README.md contains all listed sections, is in English, accurately reflects the tech stack and env vars from package.json and CLAUDE.md

- [ ] 1.2 Update CLAUDE.md to English with matching structure
  - **File:** `lf-homepage/CLAUDE.md`
  - **Action:** Translate all Vietnamese text to English. Restructure sections to align with the new README where they overlap (product overview, tech stack, getting started, env vars, i18n, deployment, branch workflow). Keep CLAUDE.md-specific sections: provider stack, path aliases, UI system details, state management patterns, linting rules, anti-patterns, important onboarding files.
  - **Language:** English (translate from Vietnamese)
  - **Constraints:** Ensure version numbers and env var tables match README exactly. Do not remove any existing information — only translate and restructure.
  - **Acceptance criteria:** CLAUDE.md is fully in English. Shared sections (tech stack, env vars, commands) are consistent with README.md. Agent-specific sections are preserved. No information is lost from the original Vietnamese version.
