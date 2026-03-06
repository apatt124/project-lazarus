# Project Lazarus - Web Interface

Modern React/Next.js web interface with Gemini-inspired UI for your medical history assistant.

## Features

- 💬 **Chat Interface**: Ask questions about your medical history with beautiful UI
- 📄 **Document Upload**: Drag-and-drop file uploads with metadata
- 🔍 **Semantic Search**: AI-powered search across all records
- 🎨 **Gemini-Style UI**: Clean, modern design with gradient accents
- ⚡ **Fast & Responsive**: Built with Next.js 14 and React

## Quick Start (Local)

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure AWS Credentials

Option A: Use existing AWS CLI credentials (recommended)
```bash
# Your AWS credentials are already configured from deployment
# No additional setup needed!
```

Option B: Create .env.local file
```bash
cp .env.example .env.local
# Edit .env.local with your AWS credentials if needed
```

### 3. Run the Development Server

```bash
npm run dev
```

The app will open in your browser at `http://localhost:3737`

## Usage

### For Non-Technical Users

1. **Open the app**: Double-click `START_LAZARUS.command` or have someone run `npm run dev`
2. **Upload documents**: 
   - Click the "Upload" tab at the top
   - Drag and drop your medical records
   - Fill in document details (optional)
   - Document is automatically uploaded and processed
3. **Ask questions**:
   - Click the "Chat" tab at the top
   - Type questions like:
     - "What was my blood pressure at the last visit?"
     - "What medications am I taking?"
     - "When did I see Dr. Smith?"
   - Get instant answers from your records

### Document Types Supported

- Text files (.txt)
- PDF documents (.pdf)
- Word documents (.doc, .docx)
- Visit notes, lab results, prescriptions, imaging reports, vaccination records

## Production Build

To build for production:

```bash
npm run build
npm start
```

## Deployment to Vercel (Recommended)

The easiest way to deploy:

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables (AWS credentials)
4. Deploy!

Cost: Free tier available

## Deployment to AWS App Runner (Alternative)

When ready to deploy for remote access:

```bash
# Build production
npm run build

# Create Dockerfile and deploy to App Runner
# See infrastructure docs for details
```

Cost: ~$5-10/month

## Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Unable to locate credentials"
```bash
# Make sure AWS CLI is configured
aws configure
```

### "Lambda function not found"
```bash
# Verify the Lambda function name
aws lambda get-function --function-name lazarus-vector-search
```

### Port already in use
```bash
# Kill the process or use a different port
lsof -ti:3737 | xargs kill
# or
PORT=3738 npm run dev
```

## Security Notes

- All data is encrypted in transit (TLS)
- AWS credentials should never be committed to git
- The app connects directly to your AWS infrastructure
- No data is stored locally (except in browser session)

## Customization

Edit files to customize:
- `app/globals.css` - Colors, gradients, animations
- `components/` - UI components
- `app/api/` - API endpoints and Lambda integration
- `tailwind.config.ts` - Tailwind theme

## Support

See main project documentation in `/docs` for:
- Architecture details
- Security best practices
- Cost optimization
- Troubleshooting guides
