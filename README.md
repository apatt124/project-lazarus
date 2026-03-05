# Project Lazarus

Personal medical record management system. Building an AI assistant to help organize, search, and understand my own medical documents (lab results, visit notes, prescriptions, imaging reports). The system stores documents securely in my private AWS account and uses AI to provide conversational access to my health information. This is for personal use only to better manage my own healthcare data.

## Overview

Project Lazarus is a conversational AI assistant for managing personal medical records. Upload any medical document (PDFs, images, screenshots) and chat with an AI that understands your health history.

### Key Features

- 🤖 **Conversational AI** - Natural language chat powered by Claude (Anthropic)
- 📄 **Universal File Support** - Upload PDFs, images, screenshots with automatic OCR
- 🔍 **Semantic Search** - Find information by meaning, not just keywords
- 🔒 **Private & Secure** - Your data stays in your own AWS account
- 💰 **Cost-Effective** - ~$15-20/month for complete infrastructure
- 🎨 **Modern UI** - Clean, Gemini-inspired interface with dark mode

## Architecture

```
┌─────────────────┐
│   Next.js UI    │  React frontend with Tailwind CSS
└────────┬────────┘
         │
┌────────▼────────┐
│  AWS Lambda     │  Vector search & document storage
│  + PostgreSQL   │  RDS with pgvector extension
└────────┬────────┘
         │
┌────────▼────────┐
│  AWS Bedrock    │  Claude AI + Titan embeddings
│  + S3 Storage   │  Encrypted document storage
└─────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- TypeScript

**Backend:**
- AWS Lambda (Python 3.12)
- PostgreSQL 15 with pgvector
- AWS S3 (encrypted storage)

**AI/ML:**
- Claude 3 Haiku (Anthropic via AWS Bedrock)
- Amazon Bedrock Titan (embeddings)
- AWS Textract (OCR)

## Features

### 1. Conversational AI Chat

Ask questions in natural language:
- "What's my blood pressure?"
- "Summarize my medical history"
- "What were my MRI results?"
- "How do you work?" (self-aware!)

### 2. Universal File Upload

Supports any medical document format:
- PDFs (machine-readable and scanned)
- Images (PNG, JPG, screenshots)
- Automatic text extraction with OCR
- AI-powered metadata detection

### 3. Semantic Search

Find information by meaning:
- Vector embeddings (1024 dimensions)
- Similarity-based retrieval
- Context-aware results

### 4. Smart Features

- **Duplicate Detection** - SHA-256 content hashing
- **Auto-metadata Extraction** - AI detects provider, date, type
- **Multi-theme Support** - 8 color themes including dark mode
- **Mobile-Friendly** - Responsive design

## Getting Started

### Prerequisites

- AWS Account
- Node.js 18+
- Python 3.11+
- PostgreSQL client
- AWS CLI v2

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/project-lazarus.git
   cd project-lazarus
   ```

2. **Set up AWS infrastructure**
   ```bash
   # Follow the setup guide
   cat infrastructure/setup-guide-rds.md
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your AWS settings
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3737
   ```

### AWS Setup

See detailed guides in `/infrastructure`:
- `setup-guide-rds.md` - Complete infrastructure setup
- `cost-separation-guide.md` - Cost tracking setup
- `deployment-checklist.md` - Deployment steps

## Usage

### Upload Documents

1. Click "Upload Document" button
2. Drag and drop or select file
3. AI automatically detects metadata
4. Review and upload

### Chat with Your Records

1. Type a question in the chat
2. AI searches your documents
3. Get conversational, context-aware answers
4. See source documents with similarity scores

### Helper Scripts

```bash
# Test AI access
./scripts/test-bedrock.sh

# Test vector search
./scripts/test-search.sh "blood pressure"

# Test chat
./scripts/test-chat.sh "What's in my records?"

# Database queries
./scripts/db-query.sh count

# View logs
./scripts/logs.sh

# Check costs
./scripts/check-costs.sh
```

## Cost Breakdown

**Monthly Infrastructure:**
- RDS PostgreSQL: ~$13
- Lambda: ~$0.50
- S3 Storage: ~$0.50
- Bedrock AI: ~$1-5 (usage-based)

**Total: $15-20/month**

Per-document costs:
- Upload with AI analysis: ~$0.002
- Chat query: ~$0.01
- OCR (if needed): ~$0.0015

## Security

- ✅ All data encrypted at rest (S3, RDS)
- ✅ Encrypted in transit (TLS)
- ✅ Private VPC for database
- ✅ IAM role-based access
- ✅ No data leaves your AWS account
- ✅ Secrets stored in AWS Secrets Manager

## Documentation

- `/docs` - Architecture, data models, guides
- `/infrastructure` - AWS setup and deployment
- `/scripts` - Helper scripts and tools
- `ENABLE-CLAUDE-ACCESS.md` - AWS Bedrock setup
- `CONVERSATIONAL-AI-COMPLETE.md` - AI implementation details

## Development

### Project Structure

```
project-lazarus/
├── frontend/              # Next.js application
│   ├── app/              # App router pages
│   ├── components/       # React components
│   └── lib/              # Utilities
├── lambda/               # AWS Lambda functions
│   ├── vector-search/    # Search & storage
│   └── db-init/          # Database initialization
├── infrastructure/       # AWS setup guides
├── scripts/             # Helper scripts
└── docs/                # Documentation
```

### Testing

```bash
# Test Bedrock access
./scripts/test-bedrock.sh

# Test search functionality
./scripts/test-search.sh "query"

# Test full chat pipeline
./scripts/test-chat.sh "question"

# Database management
./scripts/db-query.sh list
```

## Troubleshooting

See `docs/troubleshooting.md` for common issues and solutions.

**Common Issues:**
- Claude access denied → See `ENABLE-CLAUDE-ACCESS.md`
- Search returns no results → Check similarity threshold
- Upload fails → Verify IAM permissions
- Database connection fails → Check RDS security groups

## Contributing

This is a personal project, but suggestions and improvements are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- AI powered by [Anthropic Claude](https://www.anthropic.com/)
- Vector search with [pgvector](https://github.com/pgvector/pgvector)
- Hosted on [AWS](https://aws.amazon.com/)

## Support

For issues or questions:
1. Check the documentation in `/docs`
2. Review troubleshooting guide
3. Open an issue on GitHub

## Roadmap

- [ ] Conversation history
- [ ] Multi-user support
- [ ] Voice interface
- [ ] Mobile app
- [ ] Export/backup features
- [ ] Integration with health APIs
- [ ] Advanced analytics

## Author

Built for personal medical record management.

---

**Note:** This system is for organizing personal health information only. It is not a replacement for professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare providers for medical decisions.
