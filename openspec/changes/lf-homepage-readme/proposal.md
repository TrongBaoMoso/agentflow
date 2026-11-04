# Proposal: lf-homepage-readme

## Problem Statement

The lf-homepage project currently has a default `create-next-app` README that provides no useful information about the project. The existing CLAUDE.md is comprehensive but written in Vietnamese, and there is no English-language documentation suitable for onboarding new developers or presenting the project to external stakeholders.

## Proposed Solution

1. **Write a new `README.md`** in English that serves both developers (getting started, tech stack, environment setup) and stakeholders (product overview, feature highlights).
2. **Update `CLAUDE.md`** to match the same structure and language (English) as the new README, keeping both documents in sync while CLAUDE.md retains its agent-specific details.

## Scope

### In scope
- New README.md covering: product overview, tech stack, getting started, environment variables, i18n, deployment (Docker mention), branch workflow
- Update CLAUDE.md to English with the same section structure as README
- CLAUDE.md keeps its agent-specific sections (anti-patterns, provider stack, path aliases, etc.) that README does not need

### Out of scope
- Badges, screenshots, architecture diagrams
- Contributing guidelines, license section, changelog
- Detailed Docker deployment steps (just a mention that Docker is supported)
- CI/CD pipeline documentation

## Success Criteria

- README.md exists at `lf-homepage/README.md` in English, readable by both developers and stakeholders
- CLAUDE.md is updated to English with a structure that mirrors README sections where applicable
- Both documents are consistent in the information they share (tech stack versions, env vars, commands)
- No code changes required — documentation only

## Feature Branch

`docs/lf-homepage-readme` from `production`

## Target Repository

`/Users/apple/Projects/agentflow/lf-homepage`
