# Project Lazarus Documentation

Complete documentation for the Project Lazarus medical records management system.

## Quick Navigation

- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Overview of what has been built
- [Remaining Features & Tasks](REMAINING_FEATURES_AND_TASKS.md) - Roadmap and future work

## Documentation Categories

### Architecture
System design, data models, and technical decisions.

- [architecture.md](architecture/architecture.md) - System architecture overview
- [data-model.md](architecture/data-model.md) - Database schema and data structures
- [rds-vs-opensearch.md](architecture/rds-vs-opensearch.md) - Database technology comparison

### Deployment
Deployment guides, infrastructure setup, and build processes.

- [DEPLOYMENT_INSTRUCTIONS.md](deployment/DEPLOYMENT_INSTRUCTIONS.md) - Main deployment guide
- [deployment-checklist.md](deployment/deployment-checklist.md) - Pre-deployment checklist
- [LAMBDA_DEPLOYMENT_GUIDE.md](deployment/LAMBDA_DEPLOYMENT_GUIDE.md) - Lambda function deployment
- [AMPLIFY_MULTI_BRANCH_SETUP.md](deployment/AMPLIFY_MULTI_BRANCH_SETUP.md) - Multi-branch deployment
- [QUICK_MULTI_BRANCH_STEPS.md](deployment/QUICK_MULTI_BRANCH_STEPS.md) - Quick branch setup
- [BUILD_VERIFICATION.md](deployment/BUILD_VERIFICATION.md) - Build validation steps
- [AMPLIFY_ENV_VARS_FIXED.md](deployment/AMPLIFY_ENV_VARS_FIXED.md) - Environment variable setup

### Features
Feature-specific documentation and implementation guides.

- [FACT_EXTRACTION_GUIDE.md](features/FACT_EXTRACTION_GUIDE.md) - Medical fact extraction
- [KNOWLEDGE_GRAPH_FUTURE_ENHANCEMENTS.md](features/KNOWLEDGE_GRAPH_FUTURE_ENHANCEMENTS.md) - Knowledge graph roadmap
- [LOGIN_SYSTEM.md](features/LOGIN_SYSTEM.md) - Authentication system
- [SEARCH_IMPROVEMENTS.md](features/SEARCH_IMPROVEMENTS.md) - Search functionality
- [VECTOR_SEARCH_INVESTIGATION.md](features/VECTOR_SEARCH_INVESTIGATION.md) - Vector search research
- [ZIP_UPLOAD_FEATURE.md](features/ZIP_UPLOAD_FEATURE.md) - Bulk document upload
- [CHUNKING_STRATEGY.md](features/CHUNKING_STRATEGY.md) - Document chunking approach
- [google-calendar-integration.md](features/google-calendar-integration.md) - Calendar integration
- [future-enhancements.md](features/future-enhancements.md) - Planned features

### Guides
User and developer guides for common tasks.

- [quick-start.md](guides/quick-start.md) - Get started quickly
- [troubleshooting.md](guides/troubleshooting.md) - Common issues and solutions
- [CREDENTIAL_STORAGE_GUIDE.md](guides/CREDENTIAL_STORAGE_GUIDE.md) - Managing credentials
- [ENABLE_CLAUDE_ACCESS.md](guides/ENABLE_CLAUDE_ACCESS.md) - Claude API setup
- [security-best-practices.md](guides/security-best-practices.md) - Security guidelines

### Security
Security documentation, audits, and credentials management.

- [CREDENTIALS_GUIDE.md](security/CREDENTIALS_GUIDE.md) - Credential management
- [ACTION_PLAN.md](security/ACTION_PLAN.md) - Security action plan
- [AUDIT_SUMMARY.md](security/AUDIT_SUMMARY.md) - Security audit results
- [FIXES_SUMMARY.md](security/FIXES_SUMMARY.md) - Security fixes applied

### Testing
Testing guides and procedures.

- [QUICK_TEST_GUIDE.md](testing/QUICK_TEST_GUIDE.md) - Quick testing guide
- [TEST_CONVERSATIONAL_AI.md](testing/TEST_CONVERSATIONAL_AI.md) - AI testing procedures
- [PHASE_2_TESTING_GUIDE.md](testing/PHASE_2_TESTING_GUIDE.md) - Phase 2 testing

### History
Historical documentation and change summaries.

- [DOCUMENTATION_CLEANUP_2026_03_13.md](history/DOCUMENTATION_CLEANUP_2026_03_13.md) - Latest cleanup
- [DOCUMENTATION_REORGANIZATION.md](history/DOCUMENTATION_REORGANIZATION.md) - Previous reorganization
- [DOCUMENTATION_CLEANUP_SUMMARY.md](history/DOCUMENTATION_CLEANUP_SUMMARY.md) - Cleanup summary
- [PHASE_2_SUMMARY.md](history/PHASE_2_SUMMARY.md) - Phase 2 implementation
- [FRONTEND_MOVED_TO_ROOT.md](history/FRONTEND_MOVED_TO_ROOT.md) - Frontend restructure
- [CLI_TOOLS_UPGRADED.md](history/CLI_TOOLS_UPGRADED.md) - CLI tool updates

## Documentation Standards

All documentation follows the standards defined in `.kiro/steering/documentation-standards.md`.

### File Naming Conventions

- Use UPPERCASE with underscores: `FEATURE_NAME_GUIDE.md`
- Consistent suffixes:
  - `_GUIDE.md` - How-to guides
  - `_SUMMARY.md` - Summaries
  - `_INVESTIGATION.md` - Research/investigation
  - `_FUTURE_ENHANCEMENTS.md` - Roadmap items

### Where to Add New Documentation

- **Architecture docs** → `docs/architecture/`
- **Deployment guides** → `docs/deployment/`
- **Feature documentation** → `docs/features/`
- **User/developer guides** → `docs/guides/`
- **Security documentation** → `docs/security/`
- **Testing procedures** → `docs/testing/`
- **Historical records** → `docs/history/`

## Contributing

When adding new documentation:

1. Place in the appropriate category folder
2. Follow naming conventions
3. Update this README with a link
4. Use proper markdown formatting
5. Include code examples where relevant

---

**Last Updated**: March 13, 2026  
**Documentation Structure**: v2.0
