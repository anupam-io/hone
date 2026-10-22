---
name: hone
description: "Write a checkable spec where every decision comes from the repo's docs. When the docs can't settle a hard-to-reverse decision, log a blocker, ask the user, and fold the answer back into the docs; propose a visible default for the rest."
disable-model-invocation: true
---

This skill turns the current conversation and the repo's docs into a spec. It is a fork of `to-spec` with one rule changed:

**Every decision in the spec must come from the docs.** Not from your judgment, not from what seems conventional, not from the conversation alone. If the docs don't settle a decision, either ask (a blocker) or propose a default the user sees before the spec is written. Never fill the gap quietly.

The conversation tells you *what* the user wants built. The docs decide *how*. If the user stated a decision in the conversation but no doc records it, treat it as an answered blocker: it still goes through the doc-update step.

## The docs

Read these, if they exist, before anything else:

- `AGENTS.md`, `CLAUDE.md`, `GLOSSARY.md`, `CONTEXT.md`, `README.md` at the repo root
- everything under `docs/` (ADRs usually live in `docs/adr/`)

If `.hone/docs` exists, it replaces that list: one path or glob per line, `#` for comments.

Code is evidence of the current state, not a doc. You may read code to understand what exists, but "the code happens to do X" does not decide what the spec should do. If the docs are silent and the code suggests an answer, use the code's answer as the suggested option or the default. If the code contradicts the docs, record a conflict (see Conflicts).

## Process

1. **Read the docs**, then explore the codebase enough to know the current state. Use the glossary's vocabulary throughout. Note every conflict you see along the way.

2. **List the decisions** the spec needs: modules touched, interfaces, schema, API contracts, config, error behavior, test seams, scope edges. Be thorough. A decision you don't list is a decision you made silently.

3. **Settle each decision from the docs.** For each one:
   - The docs answer it: record the decision and the doc path (and heading) that settles it.
   - The docs don't answer it, and it **blocks**: append a blocker to `.hone/blockers.jsonl` (format below). Don't stop yet; keep going through the list.
   - The docs don't answer it, and it doesn't block: pick a default, and append it to the log with `status` `defaulted` and the default as `answer`.

   A decision blocks if any of these hold:
   - **Hard to reverse:** a public API or response contract, a schema or stored-data format, names of env vars, config keys or user-facing files, adding or removing a dependency other code relies on, security behavior, or behavior on failure.
   - **It contradicts or reinterprets a doc**, or depends on a conflict.
   - **The request is ambiguous** and no default is defensible.

   Everything else gets a default. If more than about seven decisions block, re-check each one against the list above.

4. **Ask once.** Show the user all open blockers from this run in one numbered list. For each: the decision, which docs you checked, and up to three options with your suggested one first. Then show the defaults as a second numbered list, one line each, and say they stand unless the user overrides them by number. If an answer opens new blockers, ask a second, short round. Set each answered blocker's `status` to `answered` and fill in `answer`. An overridden default becomes an answered blocker.

5. **Fold answers into the docs.** For each answer, pick where it lands:

   | Kind of answer | Lands as |
   |---|---|
   | A fact about the repo (a name, a value, a convention) | A section in the most relevant existing doc |
   | A choice that is hard to reverse, would surprise a reader, and had real alternatives | An ADR in `docs/adr/` (next number, short: context, decision, consequences) |
   | A rule a linter or test could check | A proposed lint rule or test, shown as text only. Don't write tooling. Also add the rule as an assertion so it holds until the check exists. |
   | A rule that can't be checked mechanically | An assertion: one imperative line in `AGENTS.md` (or the doc the repo uses for agent rules) |

   Show the user the exact text of every doc change together. Write only what they approve. For each written change, set the blocker's `status` to `documented` and add the path to its `doc_update` list (an answer can land in more than one doc). If they reject a change, leave the blocker `answered`. Defaults the user let stand don't change the docs.

6. **Write the spec** using the template below. Number every implementation and testing decision `D1`, `D2`, … in order; never renumber within a spec. Tag each with its source: `[docs: path#heading]`, `[blocker: id]` or `[default: id]`. End each with `Check:` and what a reviewer can observe in a change to tell whether the decision holds (a behavior, a test, a config entry, a dependency); write `Check: manual` only when nothing is observable. Don't include source file paths or code snippets in the decisions themselves; they go stale. Literal names and values that *are* the decision (env var names, key schemes, error codes, defaults) belong in the decision.

7. **Publish.** If the repo's docs name an issue tracker for specs (for example, set up by `setup-matt-pocock-skills`), publish there with the `ready-for-agent` label. Otherwise write it to `.hone/specs/<slug>.md`. Tell the user where it went, the coverage line, and how many conflicts it lists.

## Blocker log

`.hone/blockers.jsonl`, one JSON object per line, append-only except for status updates. Create `.hone/` if needed.

```json
{"id":"2026-10-21T10:15:00Z-001","spec":"add-es-timeout-config","decision":"Which env var sets the ES timeout?","docs_checked":["AGENTS.md","docs/config.md"],"status":"open","answer":null,"doc_update":[]}
```

| Field | Meaning |
|---|---|
| `id` | UTC timestamp of the run + 3-digit counter within the run |
| `spec` | Slug of the spec being written |
| `decision` | The question, phrased so the answer is a decision |
| `docs_checked` | Doc paths you read looking for the answer |
| `status` | `open` → `answered` (user replied) → `documented` (answer landed in the docs); or `defaulted` (a default the user let stand) |
| `answer` | The user's answer in their words, the default, or `null` |
| `doc_update` | Paths of the docs that now hold the answer; empty until documented |

Before logging, check the log for an existing entry with the same decision. If it's `documented`, the doc should answer it now; re-read that doc. If it's `defaulted`, reuse its default so specs stay consistent. If it's still `open` or `answered`, reuse it instead of adding a duplicate.

## Conflicts

A conflict is two sources that disagree: two docs, or a doc and the code (for example, the docs show `export default` while the code uses named exports). List every one you find in the spec's Conflicts section, even when it doesn't touch this spec: it is debt in the docs. Any decision that depends on a conflict is a blocker. Conflicts don't go in the blocker log.

## Docs coverage

The spec's metric: decisions settled by docs alone ÷ all decisions. Count at step 3, before any answers. It belongs in the spec so it can be compared run to run.

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories, each in the format:

1. As an <actor>, I want a <feature>, so that <benefit>

This list should be extensive and cover all aspects of the feature.

## Implementation Decisions

One line per decision: `- **D<n>** <decision> [source] Check: <what a reviewer observes>`. Can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

## Testing Decisions

Same format, numbering continues from the implementation decisions. Include:

- What makes a good test here (test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests in the codebase

## Out of Scope

What this spec does not cover.

## Conflicts

`C<n>`: what each source says (path#heading for docs; file paths are fine here), which one the spec follows, and why. Write "None found." if there are none.

## Docs Coverage

`Docs coverage: n/m (docs n · defaults d · blockers b)`, then each blocker and default id this run logged and where each answer landed (defaults: "not documented").

## Review

To review a change against this spec, return one line per decision:

`D<n>: implemented | violated | missing | unknown | out of scope — <evidence>`

`out of scope` means the change doesn't touch that decision. `unknown` means its check couldn't be run.

## Further Notes

Any further notes about the feature.

</spec-template>
