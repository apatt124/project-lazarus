# 🏥 Project Lazarus - Quick Start Guide

## For Non-Technical Users

### Starting the App (3 Easy Steps)

1. **Find the file** `START_LAZARUS.command` in the project folder
2. **Double-click it**
3. **Wait** for your web browser to open automatically

That's it! The app will open at `http://localhost:8501`

### Using the App

**To Upload a Document:**
1. Click "Upload Documents" on the left
2. Drag and drop your medical document
3. Fill in the details (doctor name, date, etc.)
4. Click "Upload Document"

**To Ask Questions:**
1. Click "Chat" on the left
2. Type your question (e.g., "What was my blood pressure?")
3. Press Enter
4. Get your answer in seconds!

### Need Help?

See `frontend/USER_GUIDE.md` for detailed instructions.

---

## For Technical Users

### Quick Start

```bash
# Install dependencies
cd frontend
pip install -r requirements.txt

# Run the app
streamlit run app.py
```

The app will open at `http://localhost:8501`

### What's Included

- **Chat Interface**: Semantic search over medical documents
- **Document Upload**: Drag-and-drop with metadata
- **Document History**: View all uploaded files
- **AWS Integration**: Direct connection to your infrastructure

### Architecture

```
User Browser (localhost:8501)
    ↓
Streamlit App (frontend/app.py)
    ↓
AWS Lambda (lazarus-vector-search)
    ↓
RDS PostgreSQL + pgvector
```

### Configuration

AWS credentials are read from:
1. Environment variables
2. `~/.aws/credentials` (AWS CLI)
3. IAM role (if running on EC2)

No additional configuration needed if AWS CLI is set up.

### Deployment to AWS App Runner

When ready for remote access:

```bash
# See frontend/README.md for deployment instructions
# Cost: ~$5-10/month
```

### Customization

Edit `frontend/app.py` to customize:
- UI colors and layout
- Document types
- Search parameters
- Additional features

### Troubleshooting

**App won't start:**
```bash
pip install --upgrade streamlit boto3
```

**AWS credentials error:**
```bash
aws configure
```

**Port in use:**
```bash
streamlit run app.py --server.port 8502
```

### Development

```bash
# Run with auto-reload
streamlit run app.py --server.runOnSave true

# View logs
tail -f ~/.streamlit/logs/streamlit.log
```

---

## What's Next?

### Immediate
- ✅ Upload your first medical document
- ✅ Test the chat interface
- ✅ Verify search works

### Soon
- Deploy to AWS App Runner for remote access
- Add provider management features
- Integrate Google Calendar
- Add document OCR for scanned images

### Future
- Mobile app
- Voice interface
- Automated document categorization
- Health metrics tracking dashboard

---

**Monthly Cost**: $13-16 (infrastructure only, app is free to run locally)

**Support**: See `frontend/USER_GUIDE.md` or `docs/troubleshooting.md`
