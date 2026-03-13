# Project Lazarus

Personal medical record management system. Building an AI assistant to help organize, search, and understand my own medical documents (lab results, visit notes, prescriptions, imaging reports). The system stores documents securely in my private AWS account and uses AI to provide conversational access to my health information. This is for personal use only to better manage my own healthcare data.

## Overview

Project Lazarus is a conversational AI assistant for managing personal medical records. Upload any medical document (PDFs, images, screenshots) and chat with an AI that understands your health history.

### Key Features

- 🤖 **Conversational AI** - Natural language chat powered by Claude Sonnet 4 (Anthropic)
- 📄 **Universal File Support** - Upload PDFs, images, screenshots with automatic OCR
- 🔍 **Semantic Search** - Find information by meaning, not just keywords
- 🧠 **Knowledge Graph** - Interactive visualization of medical facts and relationships
- 🔬 **Automatic Fact Extraction** - AI extracts structured medical facts from documents
- 💬 **Conversation Memory** - Persistent chat history across sessions
- 🔒 **Private & Secure** - Your data stays in your own AWS account
- 💰 **Cost-Effective** - ~$15-20/month for complete infrastructure
- 🎨 **Modern UI** - Clean, responsive interface with 8 color themes

## Architecture

```
┌─────────────────┐
│   Vite + React  │  Modern frontend with Tailwind CSS
└────────┬────────┘
         │
┌────────▼────────┐
│  API Gateway    │  RESTful API with authentication
└────────┬────────┘
         │
┌────────▼────────┐
│  AWS Lambda     │  Serverless functions (Node.js)
│  + PostgreSQL   │  RDS with pgvector + knowledge graph
└────────┬────────┘
         │
┌────────▼────────┐
│  AWS Bedrock    │  Claude Sonnet 4 + Titan embeddings
│  + S3 Storage   │  Encrypted document storage
│  + Textract     │  OCR for scanned documents
└─────────────────┘
```

### Technology Stack

**Frontend:**
- Vite + React 18
- TypeScript
- Tailwind CSS
- D3.js (knowledge graph visualization)

**Backend:**
- AWS Lambda (Node.js 20.x)
- PostgreSQL 15 with pgvector
- AWS S3 (encrypted storage)

**AI/ML:**
- Claude Sonnet 4 (Anthropic via AWS Bedrock)
- Amazon Bedrock Titan V2 (embeddings)
- AWS Textract (OCR)

## Features

### 1. Conversational AI Chat

Ask questions in natural language:
- "What's my blood pressure trend?"
- "Summarize my medical history"
- "What were my MRI results?"
- "Show me all my medications"
- "When was my last checkup?"

The AI maintains conversation context and cites sources with similarity scores.

### 2. Knowledge Graph Visualization

Interactive graph showing relationships between:
- Medical conditions and symptoms
- Medications and what they treat
- Test results and diagnoses
- Providers and conditions they manage
- Allergies and contraindications

Features:
- Force-directed layout with collision detection
- Zoom and pan controls
- Node filtering by type
- Relationship highlighting
- Export as PNG

### 3. Automatic Fact Extraction

When you upload documents, the AI automatically extracts:
- **Medical conditions**: Diagnoses, chronic conditions
- **Symptoms**: Reported complaints
- **Medications**: Drugs, dosages, frequencies
- **Allergies**: Adverse reactions
- **Procedures**: Surgeries, treatments
- **Test results**: Lab values, imaging findings
- **Family history**: Hereditary conditions
- **Lifestyle**: Diet, exercise, habits
- **Providers**: Doctor information

Facts are stored in a structured database and linked in the knowledge graph.

### 4. Universal File Upload

Supports any medical document format:
- PDFs (machine-readable and scanned)
- Images (PNG, JPG, screenshots)
- Batch upload via ZIP files
- Automatic text extraction with OCR
- AI-powered metadata detection

### 5. Semantic Search

Find information by meaning:
- Vector embeddings (1024 dimensions)
- Similarity-based retrieval
- Context-aware results
- Configurable similarity thresholds

### 6. Conversation History

- Persistent chat sessions
- Create multiple conversations
- Switch between conversations
- Rename and delete conversations
- Full message history

## Getting Started

### Prerequisites

- [ ] AWS Account
- [ ] Node.js 18+
- [ ] Python 3.11+
- [ ] PostgreSQL client
- [ ] AWS CLI v2

### Quick Start

See [QUICK_START.md](QUICK_START.md) for a 5-minute setup guide.

Or follow these steps:

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

3. **Install and start frontend**
   ```bash
   npm install
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

For detailed instructions, see:
- [Quick Start Guide](QUICK_START.md)
- [Infrastructure Setup](infrastructure/setup-guide-rds.md)
- [Deployment Guide](DEPLOYMENT-GUIDE.md)

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
# Test chat endpoint
./scripts/test-chat.sh "What's in my records?"

# Extract facts from documents
node scripts/extract-facts-from-documents.js

# Test fact extraction
./scripts/test-fact-extraction.sh

# Database queries
./scripts/db-query.sh count

# View logs
./scripts/logs.sh api-chat

# Deploy Lambda functions
./scripts/deploy-lambda.sh api-chat
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

- [Quick Start Guide](QUICK_START.md) - Get started in 5 minutes
- [Deployment Guide](DEPLOYMENT-GUIDE.md) - Deploy to AWS Amplify
- [Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md) - What was built and why
- [Architecture](docs/architecture.md) - System design and data models
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions
- [User Guide](frontend/USER_GUIDE.md) - How to use the interface
- [Infrastructure Setup](infrastructure/setup-guide-rds.md) - AWS infrastructure deployment

## Development

### Project Structure

```
project-lazarus/
├── src/                  # React application
│   ├── components/       # React components
│   │   ├── graph/       # Knowledge graph components
│   │   ├── Chat.tsx     # Main chat interface
│   │   ├── Sidebar.tsx  # Navigation sidebar
│   │   └── Upload.tsx   # Document upload
│   ├── lib/             # Utilities and API
│   └── App.tsx          # Main app component
├── lambda/              # AWS Lambda functions
│   ├── api-chat/        # Chat endpoint
│   ├── api-upload/      # Document upload
│   ├── api-analyze/     # Document analysis
│   ├── api-conversations/ # Conversation management
│   ├── api-fact-extraction/ # Fact extraction
│   └── api-relationships/   # Knowledge graph
├── infrastructure/      # AWS setup guides
├── scripts/            # Helper scripts
└── docs/               # Documentation
    ├── architecture/   # System design
    ├── deployment/     # Deployment guides
    ├── features/       # Feature documentation
    ├── guides/         # User guides
    ├── security/       # Security docs
    └── testing/        # Testing procedures
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
