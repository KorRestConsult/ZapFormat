# Review rollout — ZapFormat

This change intentionally lives in a review-only branch. The existing `.github/workflows/deploy.yml` runs on `main` and deploys production. Do not merge to main as a mere setup/test.

## Verified artifacts
- `.code-review/engine`: Node 22+ review engine; see engine README and tests.
- `.github/workflows/code-review-ci.yml`: syntax, test suite, npm audit.
- `.github/workflows/code-review-ai.yml`: AI review and risk approval.
- `.github/workflows/code-review-nightly.yml`: bounded overnight audit.
- `.github/CODEOWNERS`: paths that require owner review.
- `CLAUDE.md`, `REVIEW.md`: project instructions.

## Activation and human controls
1. Confirm the repository Actions secret `TIMEWEB_AI_TOKEN` exists and has budget. The application already references it, but the presence of the secret has not been independently established by this patch. Without it, AI review fails closed.
2. Before merging these policies, set up branch protections or rulesets for `main`: require `Deterministic verification`, `Multi-pass AI review`, `Human sign-off by risk` as successful status checks; require conversations resolved; invalidate human approvals after new commits; prohibit bypass/direct pushes unless explicitly authorized.
3. HIGH changes require two distinct human sign-offs for exact SHA. If only the repository owner exists, get a second GitHub reviewer or adjust policy by an explicit human decision — do not simulate another reviewer or grant AI approval.
4. Test CI and AI review on a benign PR, review cost, false positives and error rates, then turn on scheduled audit.
5. Configure merge queue and staged release/feature-flag strategy separately: this repository currently has direct auto-deploy on main. For rollback, prefer a single Git revert on a verified commit and a reproducible production release target.

## This branch does not activate GitHub branch protection
Connected GitHub integration returned 403 for the `main` protection endpoint. A config file alone cannot enforce required checks; don't claim protection is in effect until Settings/ruleset is configured and confirmed. The PR is not itself a production deployment.
