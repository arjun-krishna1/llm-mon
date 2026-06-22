# LLM-mon

[![CI/CD](https://github.com/arjun-krishna1/llm-mon/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/arjun-krishna1/llm-mon/actions/workflows/ci-cd.yml)

Play online: https://arjun-krishna1.github.io/llm-mon/

A standalone React + TypeScript vertical slice inspired by Sapphire-era handheld RPG presentation, using original CSS pixel art and LLM-themed mechanics.

## Playable slice

- Intro sequence with Professor Vector
- Starter choice: OpenAI, Anthropic, or Z AI/GLM
- Route 01 map with lab, sign, tall benchmark grass, rare closed-source encounters, and a locked gym teaser
- Turn-based battle system driven by strength, latency, output speed, and cost
- Benchmark Scout Mira trainer battle
- In-game codex with citations for model stats

## Stats and citations

The game normalizes real model metrics into RPG stats. Primary sources are Artificial Analysis pages:

- https://artificialanalysis.ai/leaderboards/models
- https://artificialanalysis.ai/articles/glm-5-2-is-the-new-leading-open-weights-model-on-the-artificial-analysis-intelligence-index
- https://artificialanalysis.ai/models/gpt-5-5
- https://artificialanalysis.ai/models/deepseek-v4-pro
- https://artificialanalysis.ai/models/kimi-k2-6/
- https://artificialanalysis.ai/models/mistral-medium-3-5/providers
- https://artificialanalysis.ai/articles/cohere-launches-open-weights-model-command-a-more-than-a-year-since-the-command-a-release
- https://artificialanalysis.ai/models/gemini-3-5-flash-medium/providers

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run build
```


## Graphics upgrade

The current version uses real image assets instead of CSS-only placeholders:

- CC0 Kenney Tiny Town tiles for Route 01 terrain and buildings
- CC0 Kenney Roguelike Characters for map trainer/player sprites
- CC0 Kenney UI Pack font and button art
- Original generated creature sprite PNGs for every real model in battles and model cards

See `ATTRIBUTION.md` for license details.

All battle/UI model labels now use the real model names instead of fictional nicknames.

## Deployment

Pushes to `main` run lint/build in GitHub Actions and deploy the production build to GitHub Pages. The Vite base path is set automatically when `GITHUB_PAGES=true`.
