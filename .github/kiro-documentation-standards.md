# Kiro Documentation Standards

## Purpose

This document establishes standards for all Kiro-generated documentation across BridgeFirst repositories to ensure consistency, maintainability, and clarity.

---

## Core Principles

1. **User-Centric**: Write for the person who will use the documentation, not the person who wrote the code
2. **Actionable**: Every document should enable someone to accomplish a specific task
3. **Maintainable**: Structure documents so they're easy to update as code changes
4. **Discoverable**: Use consistent naming and organization so documents are easy to find
5. **Minimal**: Include only what's necessary; avoid redundancy

---

## Document Types

### 1. Quick Start Guides
**Purpose**: Get someone up and running in < 10 minutes

**Naming**: `QUICK_START.md`

**Structure**:
```markdown
# Quick Start - [Feature Name]

## What You're Building
[1-2 sentence description + key benefit]

## Prerequisites
- Requirement 1
- Requirement 2

## 5-Minute Setup

### Step 1: [Action] (X minutes)
```bash
# Commands with inline comments
```

### Step 2: [Action] (X minutes)
[More steps...]

## Testing
[Simple verification steps]

## What's Deployed
[Bullet list of what was created]

## Next Steps
[Links to detailed guides]
```

**Example**: `Terraform/lambda/QUICK_START.md`

---

### 2. Deployment Guides
**Purpose**: Comprehensive step-by-step deployment instructions

**Naming**: `DEPLOYMENT_GUIDE.md` or `[FEATURE]_DEPLOYMENT.md`

**Structure**:
```markdown
# [Feature] Deployment Guide

## Overview
[What this deploys and why]

## Prerequisites
- [ ] Checklist item 1
- [ ] Checklist item 2

## Architecture
[Optional diagram or description]

## Step 1: [Phase Name]
[Detailed instructions with commands]

```bash
# Well-commented commands
```

[Expected output or verification]

## Step 2: [Next Phase]
[Continue...]

## Verification
[How to verify deployment succeeded]

## Troubleshooting
### Issue: [Common Problem]
**Solution**: [How to fix]

## Rollback
[How to undo if needed]

## Monitoring
[How to monitor after deployment]

## Cost Estimates
[Expected monthly costs]

## Security Considerations
[Security best practices]
```

**Example**: `Terraform/lambda/DEPLOYMENT_GUIDE.md`

---

### 3. Integration Guides
**Purpose**: How to integrate a feature with existing systems

**Naming**: `[FEATURE]_INTEGRATION.md`

**Structure**:
```markdown
# [Feature] Integration Guide

## Overview
[What's being integrated and why]

## Architecture
```
[ASCII diagram showing integration points]
```

## Benefits
- Benefit 1
- Benefit 2

## Step 1: Backend Setup
[Backend changes needed]

## Step 2: Frontend Integration
[Frontend changes needed]

## Step 3: Configuration
[Environment variables, settings]

## Testing
[How to test the integration]

## User Experience
### Before
[How it worked before]

### After
[How it works now]

## Monitoring
[How to monitor the integration]

## Troubleshooting
[Common issues and solutions]
```

**Example**: `Monitoring Dashboard/docs/RESOURCE_CONTROL_INTEGRATION.md`

---

### 4. Implementation Summaries
**Purpose**: High-level overview of what was implemented

**Naming**: `IMPLEMENTATION_SUMMARY.md`

**Structure**:
```markdown
# [Feature] Implementation Summary

## What Was Built
[Brief description]

## Components Created
### Backend
- Component 1: [Description]
- Component 2: [Description]

### Frontend
- Component 1: [Description]

### Infrastructure
- Resource 1: [Description]

## Key Features
1. Feature 1
2. Feature 2

## Technical Decisions
### Decision 1
**Why**: [Rationale]
**Alternative Considered**: [What else was considered]

## Files Changed
- `path/to/file.js` - [What changed]
- `path/to/other.py` - [What changed]

## Testing
[How it was tested]

## Deployment Status
- [x] Dev environment
- [x] Staging environment
- [ ] Production environment

## Known Limitations
- Limitation 1
- Limitation 2

## Future Enhancements
- Enhancement 1
- Enhancement 2

## Related Documentation
- [Link to deployment guide]
- [Link to integration guide]
```

**Example**: `Terraform/lambda/IMPLEMENTATION_SUMMARY.md`

---

### 5. Automation Guides
**Purpose**: Step-by-step guides for implementing automation

**Naming**: `[NUMBER]-[feature-name].md` (for series) or `[FEATURE]_AUTOMATION.md`

**Structure**:
```markdown
# [Feature] Automation Guide

## Overview
[What this automates]

## Impact
- **Cost Savings**: $X/year
- **Time Savings**: X hours/week
- **Risk Reduction**: [Description]

## Effort
**Estimated Time**: X hours

## Prerequisites
- [ ] Requirement 1
- [ ] Requirement 2

## Implementation

### Phase 1: [Setup]
[Detailed steps]

### Phase 2: [Configuration]
[Detailed steps]

### Phase 3: [Testing]
[Detailed steps]

## Verification
[How to verify it works]

## Monitoring
[How to monitor ongoing]

## Maintenance
### Daily
- Task 1

### Weekly
- Task 2

### Monthly
- Task 3

## Troubleshooting
[Common issues]

## Rollback Plan
[How to undo if needed]

## Success Metrics
[How to measure success]
```

**Example**: `Terraform/automation-guides/1-auto-shutdown-lambda.md`

---

### 6. README Files
**Purpose**: Overview and navigation for a directory or feature

**Naming**: `README.md`

**Structure**:
```markdown
# [Directory/Feature Name]

## Overview
[1-2 paragraph description]

## Contents
- [File 1](file1.md) - Description
- [File 2](file2.md) - Description

## Quick Links
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Support](#support)

## Getting Started
[Minimal steps to get started]

## Documentation
[Links to detailed docs]

## Common Tasks
### Task 1
```bash
# Command
```

### Task 2
```bash
# Command
```

## Support
[How to get help]

## Contributing
[How to contribute]
```

**Example**: `Terraform/automation-guides/README.md`

---

## Formatting Standards

### Headers
- Use `#` for document title (only one per document)
- Use `##` for major sections
- Use `###` for subsections
- Use `####` sparingly for sub-subsections

### Code Blocks
Always specify language for syntax highlighting:

```markdown
```bash
# Bash commands
```

```python
# Python code
```

```javascript
// JavaScript code
```
```

### Commands
- Include inline comments explaining what each command does
- Show expected output when helpful
- Use `$` prefix for shell prompts only when showing output

**Good**:
```bash
# Create S3 bucket
aws s3 mb s3://my-bucket

# Expected output:
# make_bucket: my-bucket
```

**Bad**:
```bash
$ aws s3 mb s3://my-bucket
```

### Lists
- Use `-` for unordered lists
- Use `1.` for ordered lists (auto-numbering)
- Use `- [ ]` for checklists

### Emphasis
- Use `**bold**` for important terms or actions
- Use `*italic*` for emphasis
- Use `` `code` `` for inline code, commands, file names, variables

### Links
- Use descriptive link text: `[deployment guide](DEPLOYMENT_GUIDE.md)`
- Not: `[click here](DEPLOYMENT_GUIDE.md)`

### Tables
Use tables for structured comparisons:

```markdown
| Feature | Dev | Staging | Production |
|---------|-----|---------|------------|
| Backups | Weekly | Weekly | Daily |
| Monitoring | Basic | Standard | Enhanced |
```

---

## File Organization

### 🚨 CRITICAL RULE: Documentation Location

**ALL documentation files (`.md` files) MUST be placed in the `docs/` folder, NOT in the root directory.**

### Correct Repository Structure

```
repo/
├── README.md                    # ✅ ONLY exception - repository overview
├── CONTRIBUTING.md              # ✅ ONLY exception - contribution guidelines  
├── CHANGELOG.md                 # ✅ ONLY exception - version history
├── LICENSE.md                   # ✅ ONLY exception - license information
├── docs/                        # ✅ ALL other documentation goes here
│   ├── README.md                # Documentation index
│   ├── guides/                  # How-to guides and tutorials
│   │   ├── QUICK_START.md
│   │   ├── DEPLOYMENT_GUIDE.md
│   │   └── INTEGRATION_GUIDE.md
│   ├── technical/               # Technical specifications
│   │   ├── ARCHITECTURE.md
│   │   └── API_REFERENCE.md
│   ├── analysis/                # Analysis and audit documents
│   │   └── SECURITY_AUDIT.md
│   └── implementation-history/  # Implementation notes
│       └── FEATURE_IMPLEMENTATION.md
├── .github/
│   ├── copilot-instructions.md
│   └── kiro-documentation-standards.md
└── src/                         # Source code
```

### ❌ NEVER Place Documentation Here

```
repo/
├── SOME_FEATURE_GUIDE.md        # ❌ WRONG - Goes in docs/guides/
├── DEPLOYMENT_NOTES.md          # ❌ WRONG - Goes in docs/guides/
├── IMPLEMENTATION_SUMMARY.md    # ❌ WRONG - Goes in docs/implementation-history/
├── DEBUG_GUIDE.md               # ❌ WRONG - Goes in docs/guides/
├── TROUBLESHOOTING.md           # ❌ WRONG - Goes in docs/guides/
└── AUDIT_REPORT.md              # ❌ WRONG - Goes in docs/analysis/
```

### Documentation Folder Structure

```
docs/
├── README.md                    # Index of all documentation
├── guides/                      # User-facing guides
│   ├── QUICK_START.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── INTEGRATION_GUIDE.md
│   ├── TROUBLESHOOTING.md
│   └── USER_MANUAL.md
├── technical/                   # Technical documentation
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   ├── DATABASE_SCHEMA.md
│   └── SECURITY.md
├── analysis/                    # Analysis and audits
│   ├── PERFORMANCE_AUDIT.md
│   ├── SECURITY_AUDIT.md
│   └── CODE_REVIEW.md
└── implementation-history/      # Historical records
    ├── 2026-03-FEATURE_X.md
    └── 2026-02-MIGRATION.md
```

### Repository Root
```
repo/
├── README.md                    # Repository overview
├── docs/                        # All documentation
│   ├── guides/                  # How-to guides
│   ├── architecture/            # Architecture docs
│   └── api/                     # API documentation
└── .github/
    ├── copilot-instructions.md
    └── kiro-documentation-standards.md
```

### Feature Documentation
```
feature/
├── README.md                    # Feature overview
├── QUICK_START.md              # Quick start guide
├── DEPLOYMENT_GUIDE.md         # Detailed deployment
├── IMPLEMENTATION_SUMMARY.md   # What was built
└── docs/                       # Additional docs
    ├── INTEGRATION.md
    └── TROUBLESHOOTING.md
```

### Multi-Guide Series
```
guides/
├── README.md                    # Series overview
├── 1-first-guide.md
├── 2-second-guide.md
├── 3-third-guide.md
└── assets/                      # Shared images/files
```

---

## Writing Style

### Voice
- Use second person ("you") for instructions
- Use first person plural ("we") for explanations
- Use active voice: "Deploy the Lambda" not "The Lambda should be deployed"

### Tone
- Professional but friendly
- Clear and direct
- Avoid jargon unless necessary (define when used)

### Sentence Structure
- Keep sentences short and focused
- One idea per sentence
- Use bullet points for lists of items

### Examples
**Good**:
> Deploy the Lambda function using the AWS CLI. This creates the function and configures its permissions.

**Bad**:
> The Lambda function deployment process, which can be accomplished through the utilization of the AWS CLI, will result in the creation of the function as well as the configuration of its associated permissions.

---

## Special Sections

### Prerequisites
Always include a prerequisites section with checkboxes:
```markdown
## Prerequisites

- [ ] AWS CLI configured with credentials
- [ ] Node.js 18+ installed
- [ ] Access to production AWS account
```

### Cost Information
Include cost estimates when relevant:
```markdown
## Cost Estimates

- Lambda invocations: ~$0.20/month
- API Gateway: ~$3.50/month
- **Total**: ~$3.70/month
```

### Security Considerations
Include security notes when relevant:
```markdown
## Security Considerations

1. Use least-privilege IAM policies
2. Enable CloudWatch Logs for auditing
3. Rotate credentials regularly
```

### Troubleshooting
Use consistent format:
```markdown
## Troubleshooting

### Issue: [Problem Description]
**Symptoms**: [What you see]
**Cause**: [Why it happens]
**Solution**: [How to fix]

```bash
# Commands to fix
```
```

---

## Maintenance

### When to Update Documentation

Update documentation when:
- Code changes affect documented behavior
- New features are added
- Bugs are fixed that were documented as limitations
- User feedback indicates confusion
- Dependencies or prerequisites change

### Version History

Include version history for major documents:
```markdown
## Version History

- **v1.1** (2026-03-05): Added troubleshooting section
- **v1.0** (2026-03-01): Initial version
```

### Deprecation Notices

When deprecating features:
```markdown
> **⚠️ DEPRECATED**: This feature is deprecated as of v2.0. Use [new feature](link) instead.
> This will be removed in v3.0 (estimated June 2026).
```

---

## Kiro-Specific Guidelines

### When Kiro Creates Documentation

Kiro should create documentation when:
- Implementing a new feature
- Making significant architectural changes
- Creating automation or infrastructure
- Integrating systems
- Deploying to new environments

### What Kiro Should Document

- **What** was built (components, files, resources)
- **Why** decisions were made (rationale, alternatives)
- **How** to deploy/use/maintain it
- **Where** files are located
- **When** to use it (use cases)

### What Kiro Should NOT Document

- Obvious code comments (code should be self-documenting)
- Temporary workarounds (fix the issue instead)
- Internal implementation details (unless architecturally significant)
- Duplicate information (link to existing docs instead)

### Documentation Checklist

Before considering documentation complete, verify:

- [ ] Document has a clear purpose
- [ ] Target audience is identified
- [ ] Prerequisites are listed
- [ ] Steps are actionable and tested
- [ ] Code examples are correct and runnable
- [ ] Links work and point to correct locations
- [ ] Formatting follows standards
- [ ] Spelling and grammar are correct
- [ ] Related documents are linked

---

## Examples by Repository Type

### Frontend (React/Next.js)
Focus on:
- Component usage
- State management
- API integration
- Build and deployment
- Environment configuration

### Backend (Python/Flask, Node.js)
Focus on:
- API endpoints
- Database schemas
- Authentication/authorization
- Deployment procedures
- Environment variables

### Infrastructure (Terraform, CloudFormation)
Focus on:
- Resource architecture
- Deployment steps
- Cost estimates
- Security configurations
- Disaster recovery

### Monitoring/Observability
Focus on:
- Dashboard setup
- Alert configuration
- Metric definitions
- Integration guides
- Troubleshooting

---

## Review Process

### Self-Review Checklist

Before submitting documentation:

1. **Accuracy**: Did you test all commands?
2. **Completeness**: Can someone follow this without asking questions?
3. **Clarity**: Is it easy to understand?
4. **Consistency**: Does it follow these standards?
5. **Maintenance**: Will this be easy to update?

### Peer Review

When reviewing documentation:

- Check for technical accuracy
- Verify commands work as written
- Ensure prerequisites are complete
- Test links and references
- Suggest improvements for clarity

---

## Tools and Automation

### Markdown Linting

Use markdownlint to enforce consistency:
```bash
# Install
npm install -g markdownlint-cli

# Run
markdownlint '**/*.md'
```

### Link Checking

Verify all links work:
```bash
# Install
npm install -g markdown-link-check

# Run
markdown-link-check README.md
```

### Spell Checking

Use a spell checker:
```bash
# Install
npm install -g cspell

# Run
cspell '**/*.md'
```

---

## Questions?

If you're unsure about documentation standards:

1. Look at existing examples in this repository
2. Refer to this guide
3. Ask the team for feedback
4. Iterate and improve

---

## Version History

- **v1.0** (2026-03-05): Initial documentation standards
  - Established document types
  - Defined formatting standards
  - Created examples and templates

---

**Remember**: Good documentation is a gift to your future self and your teammates. Take the time to do it right!
