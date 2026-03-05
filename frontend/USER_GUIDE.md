# Project Lazarus - User Guide

## Getting Started

### Starting the Application

**Option 1: Double-Click (Easiest)**
1. Find the file `START_LAZARUS.command` in the project folder
2. Double-click it
3. Your web browser will open automatically to `http://localhost:3737`
4. You're ready to use the app!

**Option 2: Terminal**
1. Open Terminal
2. Navigate to the project folder
3. Run: `cd frontend && npm run dev`

### First Time Setup

The app will open at `http://localhost:3737` in your web browser.

## Using the Application

### 📄 Uploading Documents

1. Click the **"Upload"** tab at the top
2. **Drag and drop** your document into the upload area (or click to browse)
3. Fill in the document information:
   - **Document Type**: Select what kind of document it is
   - **Healthcare Provider**: Enter your doctor's name (optional)
   - **Date**: When was this document created? (optional)
   - **Notes**: Any additional information (optional)
4. The document will **automatically upload** when you drop it
5. Wait for the success message ✅

**Supported File Types:**
- Text files (.txt)
- PDF documents (.pdf)
- Word documents (.doc, .docx)

**What to Upload:**
- Doctor visit notes
- Lab test results
- Prescription records
- Imaging reports (X-rays, MRIs, etc.)
- Vaccination records
- Hospital discharge summaries
- Any medical document with text

### 💬 Asking Questions

1. Click the **"Chat"** tab at the top
2. Type your question in the chat box at the bottom
3. Press **Enter** or click **Send**
4. Wait a few seconds for the answer

**Example Questions:**
- "What was my blood pressure at the last visit?"
- "What medications am I currently taking?"
- "When did I last see Dr. Smith?"
- "What were my cholesterol levels?"
- "Do I have any allergies documented?"
- "What vaccines have I received?"

**Tips for Better Results:**
- Be specific in your questions
- Use medical terms if you know them
- Reference dates or providers when relevant
- Upload more documents for better answers

## Understanding the Results

### Chat Responses

When you ask a question, the system will:
1. Search through all your uploaded documents
2. Find the most relevant information
3. Show you the answer with sources
4. Display a relevance percentage (how confident it is)

**Relevance Scores:**
- 90-100%: Very confident match
- 70-89%: Good match
- 50-69%: Possible match
- Below 50%: May not be relevant

### No Results Found

If the system says "I couldn't find any relevant information":
- The information might not be in your uploaded documents
- Try rephrasing your question
- Upload more documents that might contain the answer
- Check if you used the correct medical terms

## Privacy & Security

### Your Data is Safe

- ✅ All documents are encrypted
- ✅ Stored securely in AWS
- ✅ Only you can access your data
- ✅ No data is shared with anyone
- ✅ Complies with HIPAA security standards

### What Gets Stored

- Your uploaded documents
- Document metadata (type, date, provider)
- Search history (to improve results)

### What Doesn't Get Stored

- Your AWS credentials (kept on your computer)
- Temporary files (deleted after upload)
- Chat conversations (only in browser session)

## Important Reminders

### ⚠️ Medical Disclaimer

This system is for **informational purposes only**:
- It is NOT a substitute for professional medical advice
- Always consult your healthcare provider for medical decisions
- Do not use this for medical emergencies
- The AI may make mistakes - verify important information

### When to See a Doctor

This system helps you:
- ✅ Track your medical history
- ✅ Remember past visits and results
- ✅ Prepare questions for appointments
- ✅ Organize your health records

This system does NOT:
- ❌ Diagnose conditions
- ❌ Prescribe medications
- ❌ Provide medical advice
- ❌ Replace your doctor

## Troubleshooting

### The app won't start

1. Make sure you have internet connection
2. Check that AWS credentials are configured
3. Try restarting your computer
4. Contact your technical support person

### Upload fails

1. Check your internet connection
2. Make sure the file is a supported type (.txt, .pdf, .doc)
3. Try a smaller file (under 10MB)
4. Check that the file isn't corrupted

### Search returns no results

1. Make sure you've uploaded documents
2. Try different search terms
3. Be more specific in your question
4. Upload more relevant documents

### Browser doesn't open automatically

1. Manually open your web browser
2. Go to: `http://localhost:8501`
3. Bookmark this page for easy access

## Tips for Best Results

### Document Organization

- **Use clear filenames**: "Dr_Smith_Visit_2025-03-01.txt"
- **Upload regularly**: Don't wait to upload old documents
- **Include dates**: Always add the document date
- **Add provider names**: Helps with searching later

### Asking Questions

- **Be specific**: "What was my blood pressure in March 2025?" vs "What was my blood pressure?"
- **Use names**: "When did I see Dr. Smith?" vs "When was my last visit?"
- **One question at a time**: Better results than multiple questions
- **Follow up**: Ask clarifying questions based on the answer

### Maintaining Your Records

- Upload documents after each doctor visit
- Scan paper records and upload them
- Keep a backup of important documents
- Review your document history monthly

## Getting Help

### Technical Issues

Contact your technical support person if:
- The app won't start
- Uploads consistently fail
- You see error messages
- The app is very slow

### Using the System

Refer to this guide for:
- How to upload documents
- How to ask questions
- Understanding results
- Privacy and security

## Monthly Maintenance

### Recommended Tasks

**Weekly:**
- Upload any new medical documents
- Review recent visits in chat

**Monthly:**
- Check document history
- Verify all recent visits are uploaded
- Test a few searches to ensure everything works

**Yearly:**
- Review all uploaded documents
- Remove duplicates if any
- Verify provider information is current

## Cost Information

This system costs approximately **$13-16 per month** to run:
- Secure cloud storage
- AI-powered search
- Encrypted database
- 24/7 availability

This is automatically charged to the AWS account.

---

**Questions?** Keep this guide handy and refer to it whenever you need help using Project Lazarus.
