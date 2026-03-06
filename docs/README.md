# Project Lazarus Documentation

## Overview

Complete documentation for Project Lazarus, a conversational AI assistant for managing personal medical records.

## Contents

### Getting Started
- [Quick Start Guide](../QUICK_START.md) - Get up and running in 5 minutes
- [User Guide](../old-frontend-docs/USER_GUIDE.md) - How to use the interface
- [Deployment Guide](../DEPLOYMENT-GUIDE.md) - Deploy to AWS Amplify
- [Frontend Moved to Root](FRONTEND_MOVED_TO_ROOT.md) - Repository restructure notes

### Architecture & Design
- [Architecture](architecture.md) - System design and components
- [Data Model](data-model.md) - Database schema and relationships
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - What was built and why

### Features & Capabilities
- [Search Improvements](SEARCH_IMPROVEMENTS.md) - Semantic search enhancements
- [Chunking Strategy](CHUNKING_STRATEGY.md) - Document processing approach
- [ZIP Upload Feature](ZIP_UPLOAD_FEATURE.md) - Bulk document upload
- [Enable Claude Access](ENABLE_CLAUDE_ACCESS.md) - AWS Bedrock setup

### Testing & Validation
- [Quick Test Guide](QUICK_TEST_GUIDE.md) - Verify functionality
- [Phase 2 Testing Guide](PHASE_2_TESTING_GUIDE.md) - Comprehensive testing
- [Test Conversational AI](TEST_CONVERSATIONAL_AI.md) - AI chat testing

### Operations & Maintenance
- [Troubleshooting](troubleshooting.md) - Common issues and solutions
- [Security Best Practices](security-best-practices.md) - Security guidelines
- [CLI Tools Upgraded](CLI_TOOLS_UPGRADED.md) - Command-line utilities
- [Build Verification](BUILD_VERIFICATION.md) - Build system validation
- [Login System](LOGIN_SYSTEM.md) - Authentication documentation

### Planning & Roadmap
- [Future Enhancements](future-enhancements.md) - Planned features
- [Phase 2 Summary](PHASE_2_SUMMARY.md) - Development phases
- [Google Calendar Integration](google-calendar-integration.md) - Planned integration
- [Documentation Cleanup Summary](DOCUMENTATION_CLEANUP_SUMMARY.md) - Recent reorganization

### Infrastructure
- [Infrastructure Setup](../infrastructure/setup-guide-rds.md) - AWS deployment
- [Cost Estimates](../infrastructure/cost-estimates.md) - Monthly costs
- [GitHub Setup](../infrastructure/GITHUB_SETUP.md) - Repository configuration
- [Amplify Setup](../infrastructure/AMPLIFY_SETUP_STEPS.md) - Hosting deployment
- [Amplify Multi-Branch Setup](AMPLIFY_MULTI_BRANCH_SETUP.md) - Branch deployments
- [Amplify Environment Variables](AMPLIFY_ENV_VARS_FIXED.md) - Configuration notes

## Quick Links

### I want to...

**Get started quickly**
→ [Quick Start Guide](../QUICK_START.md)

**Deploy to production**
→ [Deployment Guide](../DEPLOYMENT-GUIDE.md)

**Understand the architecture**
→ [Architecture](architecture.md)

**Fix a problem**
→ [Troubleshooting](troubleshooting.md)

**Learn what was built**
→ [Implementation Summary](IMPLEMENTATION_SUMMARY.md)

**Set up AWS Bedrock**
→ [Enable Claude Access](ENABLE_CLAUDE_ACCESS.md)

**Test the system**
→ [Quick Test Guide](QUICK_TEST_GUIDE.md)

## Common Tasks

### Upload a Document
```bash
# Start the app
cd frontend && npm run dev

# Open browser to http://localhost:3737
# Click Upload tab, drag and drop file
```

### Test Search Functionality
```bash
# Test vector search
./scripts/test-search.sh "blood pressure"

# Test full chat
./scripts/test-chat.sh "What's in my records?"
```

### Check System Status
```bash
# Test AWS Bedrock access
./scripts/test-bedrock.sh

# View Lambda logs
./scripts/logs.sh

# Check costs
./scripts/check-costs.sh
```

### Database Operations
```bash
# Query database
./scripts/db-query.sh count
./scripts/db-query.sh list

# Clean test data
./scripts/clean-test-data.sh
```

## Support

### Documentation Issues
If you find errors or missing information in the documentation:
1. Check the [Implementation Summary](IMPLEMENTATION_SUMMARY.md) for context
2. Review the [Architecture](architecture.md) for technical details
3. Consult the [Troubleshooting Guide](troubleshooting.md)

### Technical Issues
For technical problems:
1. Check [Troubleshooting](troubleshooting.md) first
2. Review CloudWatch logs: `./scripts/logs.sh`
3. Verify AWS credentials: `aws sts get-caller-identity`
4. Test components individually using scripts in `/scripts`

## Contributing

This is a personal project, but improvements to documentation are welcome:
1. Follow the [Kiro Documentation Standards](../.github/kiro-documentation-standards.md)
2. Keep documentation up-to-date with code changes
3. Use clear, actionable language
4. Include code examples where helpful

## Version History

- **v1.0** (2026-03-06): Initial documentation organization
  - Consolidated status files into Implementation Summary
  - Organized docs by category
  - Created comprehensive README
  - Followed Kiro documentation standards
