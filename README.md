# hone

A spec skill that decides from your docs, and makes your docs sharper every time it can't.

hone is a fork of Matt Pocock's [`to-spec`](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-spec) skill with one rule changed: **every decision in the spec must come from the repo's docs.** When the docs can't settle a decision, hone doesn't guess. It logs a blocker. Your answers to those blockers go back into the docs, so the next spec gets it right on its own.

> Status: v1. The skill is in [`skills/hone/SKILL.md`](skills/hone/SKILL.md). See [`examples/WALKTHROUGH.md`](examples/WALKTHROUGH.md) for one full run.

## Install

```bash
npx skills@latest add anupam-io/hone
```

Or copy `skills/hone/` into your repo by hand:

- Claude Code: `.claude/skills/hone/`
- Other agents that read the shared path: `.agents/skills/hone/`

Then run `/hone <feature>` in the repo.

## How it differs from to-spec

| | to-spec | hone |
|---|---|---|
| Decisions come from | The conversation + the agent's judgment | The docs only. Every decision cites a doc. |
| Docs don't cover something | The agent fills the gap quietly | Logged as a blocker, not guessed |
| User corrects something | The spec is fixed | The docs are fixed, then the spec |
| Output | A spec | A spec + docs that improve with every run |

## The loop

```
/hone <feature>
        |
explore repo + read docs     (AGENTS.md, CLAUDE.md, GLOSSARY.md, CONTEXT.md, README.md, docs/)
        |
for each decision the spec needs:
  docs answer it          -> decide, cite the doc
  docs don't answer it    -> append to .hone/blockers.jsonl
        |
ask about all blockers in one batch
        |
hone drafts doc updates      (section, ADR, assertion; lint rules as text)
user approves, hone writes them
        |
write the spec               (to-spec template + source tag per decision + coverage)
publish                      (issue tracker if the docs name one, else .hone/specs/<slug>.md)
```

The blocker log is the record of every decision the docs couldn't make. It doubles as a to-do list for the docs and as the metric for how good they are.

## Blocker log entry

```json
{
  "id": "2026-10-21T10:15:00Z-001",
  "spec": "add-es-timeout-config",
  "decision": "Which env var sets the ES timeout?",
  "docs_checked": ["AGENTS.md", "docs/config.md"],
  "status": "open",
  "answer": null,
  "doc_update": []
}
```

`status`: `open` -> `answered` (user replied) -> `documented` (answer landed in the docs).

## Where answers go

| Kind of answer | Lands as |
|---|---|
| A fact about the repo | A section in the relevant doc |
| A choice that is hard to reverse, would surprise a reader, and had real alternatives | An ADR |
| A rule that can be checked mechanically | A proposed lint rule or test (as text; hone doesn't write tooling), plus an assertion until it exists |
| A rule that can't be checked mechanically | An assertion: one imperative line in `AGENTS.md` |

hone drafts every doc update and writes only what you approve.

## Which files are the docs

`AGENTS.md`, `CLAUDE.md`, `GLOSSARY.md`, `CONTEXT.md`, `README.md` at the root, and everything under `docs/`. To use a different set, list paths or globs (one per line) in `.hone/docs`. Code is evidence of the current state, not a doc: it can suggest an answer, but it can't settle a decision.

## Metric

**Docs coverage:** the share of a spec's decisions the docs could make without asking. Every spec ends with `Docs coverage: n/m`. It should go up over time on the same repo.

## Eval: Backstage ADRs

Does hone make the decisions a real team made? We took 5 ADRs from [backstage/backstage](https://github.com/backstage/backstage) (003 default exports, 007 msw, 008 catalog file name, 012 Luxon presets, 014 native fetch), exported the repo as it was just before each ADR landed, gave the model the ADR's problem as the request, and scored the spec against the ADR's recorded decision (14 decision points in total). Each model ran hone and plain `to-spec` once per ADR. Blockers went unanswered; we scored hone's suggested option instead.

| | Sonnet 5.5 hone | Opus 5.5 hone | Sonnet 5.5 to-spec | Opus 5.5 to-spec |
|---|---|---|---|---|
| Matched the real decision (of 14) | 11 | 13 | 13 | 13 |
| Wrong decision made without asking | **0** | **0** | 1 | 1 |
| Questions asked | 50 | 52 | 0 | 0 |
| Docs coverage | 34% | 36% | n/a | n/a |

What it shows:

- hone never made a wrong call silently. Both `to-spec` runs quietly dropped `cross-fetch` in isomorphic packages, which the real ADR keeps; hone suggested the same thing but asked first.
- The docs at those commits could settle only 2 of the 14 points. ADRs record new decisions, so most gaps are real gaps.
- A stronger model makes hone's suggestions better (11 → 13 of 14), but not its question count.
- hone asks too much: about 50 questions to cover 14 real decisions. Cutting that down is the next thing to fix.

Caveats: one run per cell, 5 ADRs, scored by one reviewer (Claude), and every run also saw the runner's personal agent instructions. Some `to-spec` hits look memorized: `catalog-info.yaml` appears nowhere in the ADR008 snapshot, and one Opus run proposed an ADR title almost word for word the real one. Treat the `to-spec` scores as an upper bound.

## Next

1. Run it on one repo for two weeks of real specs.
2. Review the log: what kept coming up, what got documented, did coverage go up.

## Builds on

- [mattpocock/skills](https://github.com/mattpocock/skills): `to-spec` (base), `grill-with-docs` (the same docs-first spirit).
- AGENTS.md and SKILL.md conventions, so it works across agents, not just Claude Code.

## License

MIT. hone is a fork of `to-spec` from [mattpocock/skills](https://github.com/mattpocock/skills), also MIT; both copyright notices are in [LICENSE](LICENSE).
