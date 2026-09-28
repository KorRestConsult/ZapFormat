# ZapFormat autodeploy

Production deploy is triggered automatically by pushes to `main`.

Flow:
1. GitHub Actions obtains a short-lived OIDC token.
2. The ZapFormat API validates the token and queues the exact commit SHA.
3. systemd watches the deploy trigger and runs the safe release script.
4. The release runs tests, migrations, health checks, catalog smoke checks, and cart revalidation.
5. On failure, the release script attempts rollback to the previous live commit.

The deploy endpoint never stores a GitHub deploy secret in the repository.

The installed runner is refreshed from the repository during every successful release.
The runner pins each release to the exact OIDC-requested commit SHA, so a queued deploy cannot jump ahead to a newer commit.
