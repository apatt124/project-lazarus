# Copilot Agent Instructions

**Version**: 1.1.0

---

## 🚨 CRITICAL RULE: DO NOT CREATE NEW PRs FROM EXISTING PRs 🚨

**READ THIS FIRST - THIS IS THE MOST IMPORTANT RULE:**

When you receive ANY comment, request, or instruction on an existing Pull Request, you must **ALWAYS** work within that same PR. **NEVER, EVER create a new PR in response to a comment on an existing PR.**

### This Means:

✅ **DO THIS:**
- Someone comments on PR #123 → Make changes in PR #123
- Someone asks for review on PR #123 → Comment your review in PR #123
- Someone asks to fix a bug in PR #123 → Commit the fix to PR #123's branch
- Someone asks to add a feature in PR #123 → Add it to PR #123's branch
- Someone asks to address feedback in PR #123 → Address it in PR #123

❌ **NEVER DO THIS:**
- Someone comments on PR #123 → ~~Create PR #124~~
- Someone asks for changes in PR #123 → ~~Open a new PR~~
- Someone asks to fix something in PR #123 → ~~Make a separate PR~~

### Why This Rule Exists

Creating new PRs from existing PRs:
1. Creates confusion and fragmentation
2. Loses the context and discussion history
3. Makes code review harder
4. Clutters the repository with unnecessary PRs
5. **ANNOYS THE HELL OUT OF DEVELOPERS**

### The ONLY Exception

Only create a new PR if the user uses these EXACT phrases:
- "open a new PR for this"
- "create a separate PR"
- "make a new PR"
- "this needs its own PR"

**If you see ANY of these phrases, you may create a new PR. Otherwise, work in the existing PR.**

---

## Working in Existing PRs

### When You Receive a Comment on a PR

1. **Read the PR context** - Understand what the PR is about
2. **Make the requested changes** - Commit to the PR's existing branch
3. **Respond in the PR** - Comment to confirm what you did
4. **DO NOT create a new PR** - Seriously, don't do it

### How to Identify You're in a PR Context

You're in a PR context if:
- The URL contains `/pull/` or `/pr/`
- Someone mentions a PR number (e.g., "in PR #123")
- You see PR-related UI elements
- The conversation is happening in a PR thread

**If you're in a PR context, ALL work stays in that PR.**

---

## Review Requests

When a user asks you to "review" code, a PR, or their changes:

1. **Provide review feedback as a comment** - Respond directly in the PR conversation with your analysis and suggestions
2. **Direct users to Copilot Code Review** - If they want an automated code review, they should add "Copilot" as a reviewer through GitHub's reviewer interface
3. **DO NOT create a new PR** - Reviews happen in comments, not new PRs

---

## Implementation Requests

When a user asks you to implement changes, fix bugs, or make code modifications on an existing PR:

1. **Make the changes in the current PR** - Commit to the PR's existing branch
2. **Push to the same branch** - Don't create new branches
3. **Comment to confirm** - Let the user know what you did
4. **DO NOT open a new PR** - The work belongs in the PR where the request was made

---

## When to Open New PRs

Only open new PRs when:
- ✅ Responding to an issue (not a PR)
- ✅ The user explicitly asks for a new/separate PR using the exact phrases above
- ✅ There is no existing PR context
- ✅ Starting completely new work unrelated to any existing PR

**If in doubt, ask the user: "Should I make these changes in this PR or create a new one?"**

---

## Default Branch for New PRs

**All new PRs should default to merge to the `develop` branch**, unless the user explicitly specifies a different target branch.

---

## Self-Check Before Creating a PR

Before creating any PR, ask yourself:

1. ❓ Am I currently in a PR context? → **If YES, work in that PR**
2. ❓ Did someone comment on an existing PR? → **If YES, work in that PR**
3. ❓ Did the user explicitly ask for a new PR? → **If NO, work in existing PR**
4. ❓ Is this completely new work? → **If NO, work in existing PR**

**Only create a new PR if you answered NO to questions 1-3 and YES to question 4.**

---

## Examples

### ✅ CORRECT Behavior

**Scenario:** User comments on PR #123: "Can you add error handling?"
**Action:** Commit error handling changes to PR #123's branch

**Scenario:** User comments on PR #123: "Please fix the typo in line 45"
**Action:** Fix the typo and commit to PR #123's branch

**Scenario:** User comments on PR #123: "This needs tests"
**Action:** Add tests and commit to PR #123's branch

### ❌ INCORRECT Behavior

**Scenario:** User comments on PR #123: "Can you add error handling?"
**Action:** ~~Create PR #124 with error handling~~ **WRONG!**

**Scenario:** User comments on PR #123: "Please fix the typo"
**Action:** ~~Open a new PR with the fix~~ **WRONG!**

**Scenario:** User comments on PR #123: "This needs tests"
**Action:** ~~Make a separate PR for tests~~ **WRONG!**

---

## Summary

**ONE SIMPLE RULE:** If you're working on an existing PR, stay in that PR. Don't create new PRs unless explicitly asked.

**If you violate this rule, you will annoy developers and create unnecessary work.**
