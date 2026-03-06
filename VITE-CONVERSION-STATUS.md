# Vite Conversion Status

## ✅ Completed

1. **Created Vite configuration**
   - `vite.config.ts` - Vite build config with port 3737
   - `index.html` - Entry point for Vite

2. **Converted to React Router**
   - `src/App.tsx` - Main app with routing
   - `src/pages/LoginPage.tsx` - Login page (converted from Next.js)
   - `src/pages/AppPage.tsx` - Main app page (converted from Next.js)
   - `src/main.tsx` - React entry point

3. **Moved files to src/**
   - `src/components/` - All React components
   - `src/lib/` - Utilities and helpers
   - `src/index.css` - Global styles

4. **Updated configuration**
   - `package.json` - Switched to Vite dependencies
   - `amplify.yml` - Changed baseDirectory to `dist`
   - `.env.example` - Added VITE_API_URL

## 🚧 Next Steps

### Step 1: Install Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Step 2: Update Component Imports
The components in `src/components/` need to be updated to remove Next.js specific imports:
- Remove `'use client'` directives
- Replace `next/navigation` with `react-router-dom`
- Replace `@/` imports with relative paths

### Step 3: Create Lambda Functions for API Routes
Convert these Next.js API routes to Lambda functions:

**Priority 1 (Core functionality):**
- `app/api/chat/route.ts` → Lambda function
- `app/api/upload/route.ts` → Lambda function  
- `app/api/analyze/route.ts` → Lambda function

**Priority 2 (Additional features):**
- `app/api/conversations/route.ts` → Lambda function
- `app/api/conversations/[id]/route.ts` → Lambda function
- `app/api/auth/login/route.ts` → Lambda function

### Step 4: Create API Gateway
Set up API Gateway to expose Lambda functions:
```
POST /chat → lazarus-chat Lambda
POST /upload → lazarus-upload Lambda
POST /analyze → lazarus-analyze Lambda
POST /conversations → lazarus-conversations Lambda
GET /conversations/{id} → lazarus-conversation-detail Lambda
POST /auth/login → lazarus-auth Lambda
```

### Step 5: Update Environment Variables
Create `.env.local`:
```
VITE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
```

### Step 6: Test Locally
```bash
npm run dev
# Visit http://localhost:3737
```

### Step 7: Deploy to Amplify
```bash
git add -A
git commit -m "Convert from Next.js to Vite + React"
git push origin develop
```

Amplify will now deploy as a static site successfully!

## Benefits of This Conversion

✅ **No more deployment issues** - Static site deploys perfectly on Amplify
✅ **Faster builds** - Vite is much faster than Next.js
✅ **Simpler architecture** - No SSR complexity
✅ **Better performance** - Static files served from CDN
✅ **Easier debugging** - No server-side rendering issues
✅ **Lower costs** - Static hosting is cheaper than SSR

## File Structure

```
project-lazarus/
├── index.html              # Vite entry point
├── vite.config.ts          # Vite configuration
├── package.json            # Updated for Vite
├── src/
│   ├── main.tsx           # React entry point
│   ├── App.tsx            # Router setup
│   ├── index.css          # Global styles
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   └── AppPage.tsx
│   ├── components/        # React components
│   └── lib/               # Utilities
├── public/                # Static assets
└── dist/                  # Build output (gitignored)
```

## Old Next.js Files (Can be removed after testing)

- `app/` directory
- `next.config.mjs`
- `next-env.d.ts`
- All Next.js dependencies

## Estimated Time to Complete

- **Component updates**: 30 minutes
- **Lambda function creation**: 1-2 hours
- **API Gateway setup**: 30 minutes
- **Testing**: 30 minutes

**Total**: 2-3 hours

---

**Status**: Framework converted, needs component updates and Lambda functions
**Next Action**: Update components to remove Next.js dependencies
