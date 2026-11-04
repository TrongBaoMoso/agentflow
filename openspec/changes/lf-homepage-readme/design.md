# Design: lf-homepage-readme

## Architecture Decisions

This is a documentation-only change. No code modifications.

### README.md Structure

The new README targets two audiences: stakeholders who want to understand what LoanFactory homepage is, and developers who need to get it running locally.

**Sections (in order):**

1. **Project title + one-line description** — "LoanFactory Homepage: Marketing website for LoanFactory, a US mortgage fintech brand."
2. **Product Overview** — 2-3 sentences explaining what the site does (marketing/public website, quote tool, multilingual, loan officer directory). Aimed at stakeholders.
3. **Key Features** — Bullet list: multilingual (5 locales), mortgage quote tool, Google Maps integration, PayPal integration, reCAPTCHA, GTM analytics.
4. **Tech Stack** — Table format matching CLAUDE.md section 2 (Next.js 14, TypeScript 5, Mantine 7, Tailwind 3.4, next-intl 3, React Query 5, etc.)
5. **Prerequisites** — Node 20.14.0, npm 10.7.0
6. **Getting Started** — npm install, npm run dev, npm run build, npm start
7. **Environment Variables** — Table of key env vars from CLAUDE.md section 4 (reference .env.example)
8. **Internationalization** — Supported locales (en, es, vi, zh, he), locale prefix strategy (never), message files location
9. **Project Structure** — Abbreviated directory tree (src/app, src/apis, src/shared, src/modules, etc.)
10. **Deployment** — Docker supported (two Dockerfiles available), Next.js standalone output mode. Brief mention, no detailed steps.
11. **Branch Workflow** — Branch from `production`, PR into `master`. Branch naming: feature/, fix/, update/

### CLAUDE.md Updates

- Translate all Vietnamese content to English
- Restructure to match README sections where they overlap (sections 1-11 above)
- Keep CLAUDE.md-specific sections that README omits:
  - Provider stack details (section 7)
  - Path aliases (section 6 subsection)
  - UI System details (Mantine + Tailwind conventions, section 8)
  - State management patterns (React Query + Recoil, section 9)
  - Linting/formatting rules (section 10)
  - Anti-patterns table (section 13)
  - Important files for onboarding (section 14)
- Ensure version numbers and env var tables are identical between both files

## File Changes

| File | Action |
|------|--------|
| `lf-homepage/README.md` | Replace entirely (current content is default create-next-app boilerplate) |
| `lf-homepage/CLAUDE.md` | Update in place — translate to English, restructure sections |

## Conventions

- Use standard Markdown (GitHub-flavored)
- Tables for structured data (tech stack, env vars)
- Code blocks with language hints for commands
- No emojis
- Keep README concise (aim for under 200 lines)
- CLAUDE.md can be longer since it serves as comprehensive agent reference
