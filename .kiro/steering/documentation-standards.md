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
├── DEPLOYMENT-GUIDE.md         # Deployment instructions
├── START_HERE.md               # Entry point for new users
├── docs/                       # All documentation
│   ├── README.md              # Documentation index
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── architecture.md
│   ├── troubleshooting.md
│   └── [feature-specific].md
├── infrastructure/             # AWS setup
│   ├── README.md
│   ├── setup-guide-rds.md
│   └── [deployment-guides].md
└── frontend/                   # Frontend docs
    ├── README.md
    ├── USER_GUIDE.md
    └── SETUP.md
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

Instead, update `docs/IMPLEMENTATION_SUMMARY.md` with new information.

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
