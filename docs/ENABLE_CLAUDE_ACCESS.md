# Enable Claude Access in AWS Bedrock

## Issue

AWS Bedrock requires you to request access to Claude models before you can use them. You're currently getting this error:

```
ResourceNotFoundException: Model use case details have not been submitted for this account.
Fill out the Anthropic use case details form before using the model.
```

## Solution: Request Model Access

### Step 1: Open AWS Bedrock Console

1. Go to: https://console.aws.amazon.com/bedrock/
2. Make sure you're in **us-east-1** region (top right)

### Step 2: Request Model Access

1. In the left sidebar, click **"Model access"**
2. Click **"Manage model access"** (orange button)
3. Find **"Anthropic"** in the list
4. Check the boxes for:
   - ✅ Claude 3 Haiku
   - ✅ Claude 3.5 Sonnet (optional, for better responses)
   - ✅ Claude Sonnet 4.5 (optional, latest model)

### Step 3: Fill Out Use Case Form

1. Click **"Next"**
2. Fill out the use case form:
   - **Use case description**: "Personal medical record management and health information assistant"
   - **Industry**: Healthcare
   - **Will you use for**: Personal use
   - **Data handling**: Private, encrypted storage in personal AWS account
   
3. Accept terms and conditions
4. Click **"Submit"**

### Step 4: Wait for Approval

- **Haiku**: Usually instant (< 1 minute)
- **Sonnet**: May take 5-15 minutes
- **Check status**: Refresh the Model access page

### Step 5: Verify Access

Once approved, test with our script:

```bash
./scripts/test-bedrock.sh
```

Should see:
```
✅ Success!
Response: Lazarus is working!
```

## Alternative: Use Amazon Titan

While waiting for Claude access, you can use Amazon Titan (no approval needed):

### Titan Text Premier

Good for conversational AI, no approval required:

```typescript
modelId: 'amazon.titan-text-premier-v1:0'
```

However, Titan is not as good as Claude for medical conversations.

## Why This Happens

AWS Bedrock requires use case approval for third-party models (like Claude) to:
- Ensure responsible AI use
- Comply with model provider terms
- Prevent abuse
- Track usage patterns

Amazon's own models (Titan) don't require approval.

## Timeline

- **Haiku**: Instant to 5 minutes
- **Sonnet**: 5-15 minutes  
- **Opus**: 15-30 minutes

If it takes longer than 30 minutes, check:
1. Email for approval notification
2. AWS Support Center for any issues
3. Bedrock console for status updates

## After Approval

Once approved:

1. **Test Bedrock**:
   ```bash
   ./scripts/test-bedrock.sh
   ```

2. **Test Chat**:
   ```bash
   ./scripts/test-chat.sh "Hello!"
   ```

3. **Use the UI**:
   - Open http://localhost:3737
   - Chat should now use Claude AI
   - Responses will be natural and conversational

## Cost After Approval

Claude Haiku pricing:
- Input: $0.25 per 1M tokens
- Output: $1.25 per 1M tokens
- ~$0.01 per conversation

Very affordable for personal use!

## Troubleshooting

### "Still getting errors after approval"
- Wait 15 minutes after approval
- Restart the dev server
- Clear browser cache
- Check AWS region (must be us-east-1)

### "Form submission failed"
- Try a different browser
- Check AWS account is in good standing
- Contact AWS Support

### "Access denied"
- Verify IAM user has `bedrock:InvokeModel` permission
- Check AWS credentials: `aws sts get-caller-identity`

## Quick Start (After Approval)

```bash
# 1. Verify access
./scripts/test-bedrock.sh

# 2. Restart dev server
cd frontend && npm run dev

# 3. Test chat
./scripts/test-chat.sh "How do you work?"

# 4. Use UI
open http://localhost:3737
```

## Need Help?

If you're stuck:
1. Check AWS Bedrock console for status
2. Look for email from AWS
3. Check AWS Support Center
4. Try the AWS Bedrock documentation: https://docs.aws.amazon.com/bedrock/

## Summary

1. Go to AWS Bedrock console
2. Click "Model access" → "Manage model access"
3. Select Anthropic Claude models
4. Fill out use case form
5. Wait for approval (usually < 15 minutes)
6. Test with `./scripts/test-bedrock.sh`
7. Enjoy conversational AI! 🎉
