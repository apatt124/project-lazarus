# Project Lazarus Frontend - Setup Guide

## Prerequisites

Before you begin, make sure you have:

1. **Node.js 18+** installed
   - Download from: https://nodejs.org/
   - Check version: `node --version`

2. **AWS CLI configured** with credentials
   - Check: `aws sts get-caller-identity`
   - Configure: `aws configure`

3. **AWS Infrastructure deployed**
   - Lambda function: `lazarus-vector-search`
   - S3 bucket: `project-lazarus-medical-docs-677625843326`
   - RDS database initialized

## Installation

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

This will install:
- Next.js 14
- React 18
- AWS SDK for JavaScript v3
- Tailwind CSS
- TypeScript

### Step 2: Configure Environment

Create a `.env.local` file (optional - uses AWS CLI credentials by default):

```bash
cp .env.example .env.local
```

Edit `.env.local` if you need to override defaults:

```env
AWS_REGION=us-east-1
AWS_LAMBDA_FUNCTION_NAME=lazarus-vector-search
AWS_S3_BUCKET=project-lazarus-medical-docs-677625843326
```

### Step 3: Start Development Server

```bash
npm run dev
```

Or use the startup script:
```bash
./start.sh
```

Or double-click `START_LAZARUS.command` from the project root.

The app will be available at: http://localhost:3737

## Project Structure

```
frontend/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # Chat API endpoint
│   │   └── upload/route.ts    # Upload API endpoint
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page
├── components/
│   ├── ChatInterface.tsx      # Chat UI component
│   └── DocumentUpload.tsx     # Upload UI component
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── tailwind.config.ts         # Tailwind config
└── next.config.mjs            # Next.js config
```

## How It Works

### Architecture

```
Browser (React)
    ↓
Next.js API Routes (/api/chat, /api/upload)
    ↓
AWS SDK (Lambda Client, S3 Client)
    ↓
AWS Lambda (lazarus-vector-search)
    ↓
RDS PostgreSQL + pgvector
```

### Chat Flow

1. User types question in chat interface
2. Frontend sends POST to `/api/chat`
3. API route invokes Lambda with search parameters
4. Lambda performs vector search in RDS
5. Results returned to frontend
6. UI displays answer with sources

### Upload Flow

1. User drops file in upload area
2. Frontend sends file + metadata to `/api/upload`
3. API route uploads file to S3
4. API route invokes Lambda to store document
5. Lambda generates embedding and stores in RDS
6. Success message shown to user

## Development

### Running in Development Mode

```bash
npm run dev
```

- Hot reload enabled
- Source maps for debugging
- Detailed error messages

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Customization

### Changing Colors/Theme

Edit `app/globals.css`:

```css
.gradient-bg {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}
```

### Adding New Document Types

Edit `components/DocumentUpload.tsx`:

```tsx
<option value="new_type">New Type</option>
```

### Modifying Chat Behavior

Edit `app/api/chat/route.ts` to change:
- Number of search results
- Answer generation logic
- Response formatting

## Troubleshooting

### Port 3737 already in use

```bash
# Kill existing process
lsof -ti:3737 | xargs kill

# Or use different port
PORT=3738 npm run dev
```

### AWS Credentials Error

```bash
# Check credentials
aws sts get-caller-identity

# Reconfigure if needed
aws configure
```

### Module not found errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Lambda invocation fails

Check:
1. Lambda function exists: `aws lambda get-function --function-name lazarus-vector-search`
2. IAM permissions allow Lambda invocation
3. Lambda is in same region as configured

### Upload fails

Check:
1. S3 bucket exists and is accessible
2. File size is reasonable (<10MB)
3. File type is supported
4. AWS credentials have S3 write permissions

## Deployment Options

### Option 1: Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

**Pros**: Free tier, automatic HTTPS, global CDN  
**Cons**: Need to configure AWS credentials securely

### Option 2: AWS App Runner

1. Build Docker image
2. Push to ECR
3. Create App Runner service

**Pros**: Integrated with AWS, easy IAM  
**Cons**: ~$5-10/month

### Option 3: Local Only

Keep running locally with `npm run dev`

**Pros**: Free, full control  
**Cons**: Only accessible on your computer

## Security Notes

- Never commit `.env.local` to git
- AWS credentials should use least-privilege IAM policies
- All API routes validate input
- File uploads are scanned for size/type
- HTTPS required in production

## Performance Tips

1. **Limit file sizes**: Keep uploads under 5MB for best performance
2. **Use production build**: `npm run build` for faster load times
3. **Enable caching**: Configure CDN for static assets
4. **Optimize images**: Use Next.js Image component if adding images

## Support

- Frontend issues: Check browser console for errors
- AWS issues: Check CloudWatch logs for Lambda
- Database issues: See `docs/troubleshooting.md`

## Next Steps

1. Test the chat interface with sample questions
2. Upload a test document
3. Customize the UI to your preferences
4. Consider deploying to Vercel for remote access
5. Add authentication if sharing with others

---

**Ready to start?** Run `npm run dev` and open http://localhost:3737
