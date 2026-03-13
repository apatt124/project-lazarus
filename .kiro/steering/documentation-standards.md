---
inclusion: auto
---

# Kiro Documentation Standards for Project Lazarus

When creating or updating documentation for this project, follow these standards:

## Document Types

1. **Quick Start Guides** - `QUICK_START.md` - Get users running in < 10 minutes
2. **Deployment Guides** - `DEPLOYMENT-GUIDE.md` - Comprehensive deployment instructions
3. **Implementation Summaries** - `docs/IMPLEMENTATION_SUMMARY.md` - High-level overview of what was built
4. **README Files** - Overview and navigation for directories

## File Organization

```
project-lazarus/
├── README.md                    # Repository overview
├── QUICK_START.md              # 5-minute setup
├── START_HERE.md               # Entry point for new users
├── DEPLOYMENT-GUIDE.md         # Main deployment instructions
├── CONTRIBUTING.md             # Contribution guidelines
├── docs/                       # All documentation
│   ├── README.md              # Documentation index
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── REMAINING_FEATURES_AND_TASKS.md
│   ├── architecture/          # System design
│   │   ├── architecture.md
│   │   ├── data-model.md
│   │   └── [tech-comparisons].md
│   ├── deployment/            # Deployment guides
│   │   ├── DEPLOYMENT_INSTRUCTIONS.md
│   │   ├── deployment-checklist.md
│   │   └── [setup-guides].md
│   ├── features/              # Feature documentation
│   │   ├── [FEATURE]_GUIDE.md
│   │   ├── [FEATURE]_FUTURE_ENHANCEMENTS.md
│   │   └── [investigations].md
│   ├── guides/                # User/dev guides
│   │   ├── quick-start.md
│   │   ├── troubleshooting.md
│   │   └── [how-to-guides].md
│   ├── security/              # Security docs
│   │   ├── CREDENTIALS_GUIDE.md
│   │   └── [security-docs].md
│   ├── testing/               # Testing procedures
│   │   └── [test-guides].md
│   └── history/               # Historical records
│       └── [change-summaries].md
└── infrastructure/             # AWS setup
    ├── README.md
    ├── setup-guide-rds.md
    └── [deployment-guides].md
```

## Formatting Rules

- Use `#` for document title (only one per document)
- Use `##` for major sections
- Use `###` for subsections
- Always specify language for code blocks: ```bash, ```python, ```javascript
- Include inline comments in code examples
- Use `-` for unordered lists
- Use `1.` for ordered lists
- Use `- [ ]` for checklists
- Use `**bold**` for important terms
- Use `` `code` `` for inline code, commands, file names

## What to Document

- What was built (components, files, resources)
- Why decisions were made (rationale, alternatives)
- How to deploy/use/maintain it
- Where files are located
- When to use it (use cases)

## What NOT to Document

- Obvious code comments (code should be self-documenting)
- Temporary workarounds (fix the issue instead)
- Internal implementation details (unless architecturally significant)
- Duplicate information (link to existing docs instead)

## Status Files

DO NOT create files like:
- `TASK-COMPLETE-*.md`
- `*-STATUS.md`
- `*-READY.md`
- `*-SUCCESS.md`
- `PHASE-*-COMPLETE.md`
- `*-COMPLETE.md`
- `*-DEPLOYMENT-COMPLETE.md`
- `*-MIGRATION-COMPLETE.md`

Instead, update `docs/IMPLEMENTATION_SUMMARY.md` with new information.

## File Placement Rules

### Root Directory (ONLY these files allowed)
- `README.md` - Repository overview
- `CONTRIBUTING.md` - Contribution guidelines
- `QUICK_START.md` - 5-minute setup guide
- `START_HERE.md` - Entry point for new users
- `DEPLOYMENT-GUIDE.md` - Main deployment instructions
- `LICENSE` - License file
- `.gitignore`, `.env.example` - Configuration files

### docs/ Directory Structure

Documentation is organized into category folders:

#### docs/architecture/ - System design and data models
- Architecture overviews: `docs/architecture/architecture.md`
- Data models: `docs/architecture/data-model.md`
- Technology comparisons: `docs/architecture/TECH_A_VS_TECH_B.md`

#### docs/deployment/ - Deployment and infrastructure
- Deployment guides: `docs/deployment/DEPLOYMENT_INSTRUCTIONS.md`
- Build verification: `docs/deployment/BUILD_VERIFICATION.md`
- Infrastructure setup: `docs/deployment/SERVICE_SETUP.md`
- Deployment checklists: `docs/deployment/deployment-checklist.md`

#### docs/features/ - Feature-specific documentation
- Feature guides: `docs/features/FEATURE_NAME_GUIDE.md`
- Future enhancements: `docs/features/FEATURE_NAME_FUTURE_ENHANCEMENTS.md`
- Feature investigations: `docs/features/TOPIC_INVESTIGATION.md`
- Feature strategies: `docs/features/STRATEGY_NAME.md`

#### docs/guides/ - User and developer guides
- Quick start: `docs/guides/quick-start.md`
- Troubleshooting: `docs/guides/troubleshooting.md`
- How-to guides: `docs/guides/TASK_NAME_GUIDE.md`
- Best practices: `docs/guides/TOPIC-best-practices.md`

#### docs/security/ - Security documentation
- Security guides: `docs/security/CREDENTIALS_GUIDE.md`
- Security audits: `docs/security/AUDIT_SUMMARY.md`
- Security action plans: `docs/security/ACTION_PLAN.md`
- Security fixes: `docs/security/FIXES_SUMMARY.md`

#### docs/testing/ - Testing procedures
- Test guides: `docs/testing/QUICK_TEST_GUIDE.md`
- Testing procedures: `docs/testing/TEST_FEATURE_NAME.md`
- Phase testing: `docs/testing/PHASE_N_TESTING_GUIDE.md`

#### docs/history/ - Historical documentation
- Change summaries: `docs/history/CHANGE_SUMMARY.md`
- Migration records: `docs/history/MIGRATION_NAME.md`
- Reorganization notes: `docs/history/DOCUMENTATION_CLEANUP_DATE.md`

#### docs/ root level - Only these files
- `docs/README.md` - Documentation index
- `docs/IMPLEMENTATION_SUMMARY.md` - Main implementation summary
- `docs/REMAINING_FEATURES_AND_TASKS.md` - Roadmap

### infrastructure/ Directory (Infrastructure documentation)
- Setup guides: `infrastructure/setup-guide-*.md`
- Deployment scripts: `infrastructure/*.sh`
- IAM policies: `infrastructure/*.json`
- Infrastructure configs: `infrastructure/*.yaml`

## Naming Conventions

- Use UPPERCASE with underscores: `FEATURE_NAME_GUIDE.md`
- Be descriptive but concise
- Avoid redundant words (e.g., "DOCUMENT" in filename)
- Use consistent suffixes:
  - `_GUIDE.md` for how-to guides
  - `_SUMMARY.md` for summaries
  - `_INVESTIGATION.md` for research/investigation
  - `_FUTURE_ENHANCEMENTS.md` for roadmap items

## Documentation Checklist

Before considering documentation complete:

- [ ] Document has a clear purpose
- [ ] Target audience is identified
- [ ] Prerequisites are listed with checkboxes
- [ ] Steps are actionable and tested
- [ ] Code examples are correct and runnable
- [ ] Links work and point to correct locations
- [ ] Formatting follows standards
- [ ] Related documents are linked

## Version History

Include version history for major documents:
```markdown
## Version History

- **v1.1** (2026-03-06): Added troubleshooting section
- **v1.0** (2026-03-01): Initial version
```

## Reference

Full standards: `.github/kiro-documentation-standards.md`
