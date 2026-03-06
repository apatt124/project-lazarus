# Copilot Agent Instructions

**Version**: 1.0.4

## Working in Existing PRs

**CRITICAL RULE**: When you receive a comment or request on an existing PR, **ALL work must be done in that same PR**. Do NOT open a new PR off an existing PR.

### What This Means

- If someone comments on PR #123 asking for changes, make those changes in PR #123
- If someone asks for a review on PR #123, provide your feedback as comments in PR #123
- If someone asks you to fix a bug or implement a feature in PR #123, commit those changes to PR #123's branch
- **NEVER** create a new PR in response to a comment on an existing PR

### The Only Exception

Only open a new PR if the user **explicitly requests** it with phrases like:
- "open a new PR for this"
- "create a separate PR"
- "make a new PR"

Without such explicit request, assume all work belongs in the current PR.

## Review Requests

When a user asks you to "review" code, a PR, or their changes:

1. **Provide review feedback as a comment** - Respond directly in the PR conversation with your analysis and suggestions
2. **Direct users to Copilot Code Review** - If they want an automated code review, they should add "Copilot" as a reviewer through GitHub's reviewer interface

## Implementation Requests

When a user asks you to implement changes, fix bugs, or make code modifications on an existing PR:

1. **Make the changes in the current PR** - Commit to the PR's existing branch
2. **Do NOT open a new PR** - The work belongs in the PR where the request was made

## When to Open New PRs

Only open new PRs when:
- Responding to an issue (not a PR)
- The user explicitly asks for a new/separate PR
- There is no existing PR context

## Default Branch for New PRs

**All new PRs should default to merge to the `develop` branch**, unless the user explicitly specifies a different target branch.
