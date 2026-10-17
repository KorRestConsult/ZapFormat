# Code Review engine (Node 22+, no external packages)

The default provider is Timeweb AI Gateway, using a **GitHub Actions secret** named `TIMEWEB_AI_TOKEN`. This matches the existing ZapFormat project secret if it is present. No key is bundled. Each PR is scanned by four independent prompt passes, then each candidate gets three separate skeptical validation passes. At least two validators must agree. The returned source path and line number must match an added line in the actual GitHub patch; unsupported claims are discarded. This is multi-pass review, **not** an independent ensemble of different models.

- `.github/workflows/code-review-ci.yml`: tests, syntax, npm audit.
- `.github/workflows/code-review-ai.yml`: read-only PR code review and risk approval check.
- `.github/workflows/code-review-nightly.yml`: daily review of existing sensitive modules, artifact on completion.
- `node --test .code-review/engine/test/review.test.mjs`: engine tests.

For local run: set `GITHUB_EVENT_PATH` to an actual GitHub PR webhook JSON file, `GITHUB_REPOSITORY` to `owner/repo`, `GITHUB_TOKEN` with read access and `TIMEWEB_AI_TOKEN` to a real token, and run `node .code-review/engine/run.mjs`.

Limitations: GitHub branch protection / required status checks cannot be activated just by committing YAML. Enable the `Deterministic verification`, `Multi-pass AI review`, and `Human sign-off by risk` checks with up-to-date branch rules. Require conversation resolution and dismiss approvals on new commits. High-risk changes require two **different real GitHub users**; a solo repo owner cannot satisfy this without another reviewer. Automated fixes and deployment remain opt-in, never modify live data automatically. Merge queue, feature flags and rollback require production infrastructure work.

Known constraints: the daily task scans a bounded source sample to control API cost. Calls cost money. Fork PRs deliberately do not access AI secrets; an authorized maintainer must review them manually. Review of 500+ changed files fails closed. Check results aren't guarantees of safety.
