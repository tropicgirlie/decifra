# ADR 0001: Summary model pipeline (Sonnet for reasoning, Sabiá-3 for translation)

- **Status**: Accepted
- **Date**: 2026-05-12
- **Decision owners**: Luana Micheau
- **Scope**: `api/summary.js`

## Context

`api/summary.js` produces the personalised clinical interpretation a Brazilian woman sees on the Results page after her labs are extracted. Output is a JSON object with `full_summary` and `women_focus_summary`, each holding `headline`, `key_points`, `discuss_with_gp`, `next_steps`, `reassurance`.

The interpretation must do two jobs at once:

1. **Clinical reasoning**: weigh the marker pattern against the patient's life-stage context (cycle day, postpartum weeks, climatério, gestação). The same ferritina value means different things at 3 weeks postpartum, in PCOS, or in climatério. This requires up-to-date frontier reasoning on women's-health physiology, not boilerplate per-marker explanations.
2. **Native Brazilian voice**: write in the register a Brazilian GP would use. Brazilian Portuguese phrasing, Brazilian medical conventions ("converse com sua ginecologista", "convênio ou SUS", "endocrinologista do CRM"), Brazilian units (mUI/L, vírgula decimal), no translated-English feel.

A single model has to be excellent at both. The candidates we considered:

| Option | Clinical reasoning | pt-BR voice | Cost / call | Latency |
|---|---|---|---|---|
| Claude Sonnet 4.5 only | Strong | Translated. Reads slightly foreign, occasional anglicisms. | ~$0.015 | ~3 s |
| Sabiá-3 only | Weaker. Smaller model, less coverage of frontier women's-health literature. | Native, excellent. | ~$0.004 | ~2 s |
| Sonnet 4.5 → Sabiá-3 | Sonnet reasons (English). Sabiá-3 translates to pt-BR. | Both jobs done by the right tool. | ~$0.019 | ~5 s |

Sabiá-3 alone is appealing on cost and voice but the product is a women's-health clinical interpreter. Wrong reasoning in this domain has high downside (patient anxiety, missed flags, false reassurance). Voice quality matters; clinical accuracy matters more. We do not accept worse reasoning to win on tone.

Sonnet 4.5 alone produces correct clinical reasoning but the pt-BR output reads translated. In a market where trust signals come from sounding like a native clinician, "translated English" undermines credibility in a way that's hard to measure but real.

## Decision

`api/summary.js` runs a two-step pipeline:

1. **Reasoning (Anthropic Claude Sonnet 4.5)**: receives the markers, the patient context, and an English-language clinical system prompt. Produces the full JSON output with all values written in English. This is the clinical brain of the response.
2. **Translation and tone (Maritaca Sabiá-3)**: receives the English JSON from step 1 and a translation-and-localisation system prompt. Returns the same JSON shape with every string value rewritten in natural Brazilian Portuguese, with Brazilian medical conventions and a warm, clear, non-alarmist voice. Keys are not translated.

Fallbacks are bounded so the user never sees an outright failure:

- If Sonnet 4.5 fails (Anthropic 5xx, key missing, parse error), return 502. The interpretation is the product; there is no degraded version of "no reasoning."
- If Sabiá-3 fails (Maritaca 5xx, key missing, parse error, structure broken), fall back to asking Claude Sonnet 4.5 to translate its own English output in a follow-up call. If that also fails, return the English output as a last resort with `_translation_status: "failed_en"` flag for client-side handling.

`MARITACA_API_KEY` is optional. `ANTHROPIC_API_KEY` is required.

## Consequences

**Positive**

- Best clinical reasoning available (Sonnet 4.5) for a women's-health product.
- Best pt-BR voice available (Sabiá-3) for a Brazilian audience.
- Each model is doing the job it's best at, no compromises.
- Falls back to Claude-only pt-BR if Maritaca is down: the product never breaks.
- Architecture is honest: the ADR documents which model is responsible for which quality dimension.

**Negative**

- Two API calls per summary. Latency goes from ~3 s to ~5 s. Acceptable for a "wait while we interpret" UX, where the Scanning screen already runs animated step labels for 4-6 s. Within budget.
- Cost goes from ~$0.015 to ~$0.019 per summary (~25 percent increase). Negligible in absolute terms at expected beta volume (R$ 50 of credit covers thousands of summaries).
- Two prompts to maintain. The English reasoning prompt and the pt-BR translation prompt evolve independently. Worth it for the clarity of separation.
- Risk that Sabiá-3 returns malformed JSON (rare but possible with translation tasks). Mitigated by JSON validation + Claude-pt-BR fallback path.

**Operational notes**

- Logs distinguish three states: `[Decifra summary] ok via sabia-3` (happy path), `[Decifra summary] ok via claude-pt-br-fallback` (Sabiá failed, Claude translated), `[Decifra summary] ok via claude-en-only` (both translation paths failed, returned English).
- Monitor the proportion of fallback states in the first week of pt-BR traffic. If Sabiá-3 success rate is below 95 percent, revisit the prompt or temperature.
- Faturamento sits in two currencies: USD for Anthropic and BRL for Maritaca. Track separately.

## Alternatives rejected

**Sabiá-3 alone**. Sabiá-3 has not been benchmarked on women's-health clinical reasoning at the level Sonnet 4.5 has on the MedQA, USMLE, and clinical-vignette suites. For a non-diagnostic interpretation tool the bar is lower than for diagnosis, but it's still higher than "fluent pt-BR." We prioritise clinical accuracy over single-model simplicity.

**Sonnet 4.5 alone**. Functional, but the polish pass already showed that bulk-translated copy reads foreign to Brazilian users. The same problem would surface at runtime in the most user-visible content of the entire app. Not acceptable.

**Hybrid (Sonnet writes pt-BR draft, Sabiá-3 polishes)**. Considered but rejected as over-engineered. Sonnet's pt-BR is not so bad that polishing yields a clean win; reasoning + translation as a clean handoff is easier to debug and explain.

**Open-weights pt-BR model (Bode, MariTalk-Sabia 7B, etc.) self-hosted**. Out of scope for an early-beta MVP. Infrastructure cost and ops burden don't fit a one-founder shop. Revisit at scale (>10k summaries/month).
