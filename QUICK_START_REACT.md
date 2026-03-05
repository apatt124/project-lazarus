# 🚀 Project Lazarus - Quick Start (React Version)

Get your medical history AI running in 5 minutes!

## Prerequisites

- ✅ AWS infrastructure deployed (Lambda, RDS, S3)
- ✅ Node.js 18+ installed
- ✅ AWS CLI configured

## Step 1: Install Dependencies (2 minutes)

```bash
cd frontend
npm install
```

## Step 2: Start the App (1 minute)

**Option A: Double-click**
```bash
# From project root
./START_LAZARUS.command
```

**Option B: Command line**
```bash
cd frontend
npm run dev
```

## Step 3: Open in Browser (30 seconds)

Open: http://localhost:3737

## Step 4: Test It! (1 minute)

### Test Upload:
1. Click "Upload" tab
2. Create test file: `echo "Patient visited Dr. Smith on March 5, 2025. Blood pressure: 120/80" > test.txt`
3. Drag `test.txt` into upload area
4. Wait for success message ✅

### Test Chat:
1. Click "Chat" tab
2. Ask: "What was my blood pressure?"
3. Get answer with sources! 🎉

## That's It!

You're now running Project Lazarus with a beautiful React interface.

## What's Next?

- Upload real medical documents
- Ask questions about your health history
- Customize the UI colors (see `frontend/SETUP.md`)
- Deploy to Vercel for remote access

## Troubleshooting

**Port 3737 in use?**
```bash
lsof -ti:3737 | xargs kill
```

**AWS credentials error?**
```bash
aws configure
```

**Need help?**
- See `frontend/SETUP.md` for detailed setup
- See `frontend/USER_GUIDE.md` for usage help
- See `docs/troubleshooting.md` for AWS issues

---

**Enjoy your new medical history AI! 🏥✨**
