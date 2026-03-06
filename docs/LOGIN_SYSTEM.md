# Login System Documentation

## Overview
Simple password-based authentication system to protect the application when deployed.

## Routes

### `/` - Login Page
- Clean, modern login interface
- Password-only authentication
- Session-based authentication using sessionStorage
- Redirects to `/app` on successful login
- Auto-redirects to `/app` if already authenticated

### `/app` - Protected Application
- Main application interface (chat, sidebar, etc.)
- Requires authentication to access
- Redirects to `/` if not authenticated
- Includes logout functionality

## Authentication Flow

```
User visits / (root)
    ↓
Enters password
    ↓
POST /api/auth/login
    ↓
Password validated against APP_PASSWORD env var
    ↓
Success: sessionStorage.setItem('lazarus_auth', 'true')
    ↓
Redirect to /app
    ↓
/app checks sessionStorage
    ↓
If authenticated: Show app
If not: Redirect to /
```

## Configuration

### Environment Variable
Add to `frontend/.env.local`:
```env
APP_PASSWORD=your_secure_password_here
```

**Default password:** `lazarus2024`

### For Production Deployment
1. Set `APP_PASSWORD` environment variable in AWS Amplify
2. Use a strong, unique password
3. Consider adding rate limiting for production

## Security Notes

### Current Implementation
- ✅ Password stored in environment variable (not in code)
- ✅ Session-based authentication
- ✅ Protected routes with redirect
- ✅ Simple and lightweight

### Limitations (Simple Auth)
- ⚠️ No rate limiting (add for production)
- ⚠️ No password hashing (single password, not user accounts)
- ⚠️ Session stored in sessionStorage (cleared on browser close)
- ⚠️ No JWT or token-based auth
- ⚠️ No multi-user support

### Suitable For
- ✅ Personal use
- ✅ Single user access
- ✅ Quick deployment protection
- ✅ Development/staging environments

### NOT Suitable For
- ❌ Multi-user applications
- ❌ Applications requiring user accounts
- ❌ High-security requirements
- ❌ Compliance-heavy environments (use proper auth)

## Usage

### Local Development
1. Set password in `frontend/.env.local`:
```env
APP_PASSWORD=mypassword123
```

2. Restart dev server:
```bash
cd frontend
npm run dev
```

3. Visit http://localhost:3737
4. Enter password: `mypassword123`
5. Access application at http://localhost:3737/app

### Production Deployment (AWS Amplify)
1. Go to AWS Amplify Console
2. Select your app
3. Go to "Environment variables"
4. Add variable:
   - Key: `APP_PASSWORD`
   - Value: `your_secure_production_password`
5. Redeploy application
6. Users must enter password to access

## API Endpoint

### POST /api/auth/login
Validates password and returns success/failure.

**Request:**
```json
{
  "password": "lazarus2024"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid password"
}
```

## Components

### Login Page (`frontend/app/page.tsx`)
- Clean, centered login form
- Password input with validation
- Error message display
- Loading state during authentication
- Auto-redirect if already authenticated

### App Page (`frontend/app/app/page.tsx`)
- Protected route with auth check
- Main application interface
- Logout functionality
- Loading state during auth verification

### Sidebar (`frontend/components/Sidebar.tsx`)
- Added optional `onLogout` prop
- Logout button at bottom of sidebar
- Red styling for logout action

## Session Management

### Login
```typescript
sessionStorage.setItem('lazarus_auth', 'true');
```

### Check Authentication
```typescript
const isAuth = sessionStorage.getItem('lazarus_auth') === 'true';
```

### Logout
```typescript
sessionStorage.removeItem('lazarus_auth');
router.push('/');
```

### Session Persistence
- Session persists across page refreshes
- Session cleared when browser/tab is closed
- Session cleared on logout

## Future Enhancements

### Phase 1 (Current)
- ✅ Simple password protection
- ✅ Session-based auth
- ✅ Protected routes

### Phase 2 (Optional)
- [ ] Rate limiting on login attempts
- [ ] Password strength requirements
- [ ] Remember me functionality (localStorage)
- [ ] Session timeout/expiry

### Phase 3 (If Multi-User Needed)
- [ ] User accounts with database
- [ ] JWT token-based authentication
- [ ] Password hashing (bcrypt)
- [ ] User registration/management
- [ ] Role-based access control

### Phase 4 (Enterprise)
- [ ] OAuth integration (Google, Microsoft)
- [ ] Two-factor authentication (2FA)
- [ ] Audit logging
- [ ] Session management dashboard

## Testing

### Test Login Flow
1. Visit http://localhost:3737
2. Should see login page
3. Enter wrong password → Should show error
4. Enter correct password → Should redirect to /app
5. Refresh page → Should stay on /app (session persists)
6. Click logout → Should redirect to /
7. Try to visit /app directly → Should redirect to /

### Test Session Persistence
1. Login successfully
2. Refresh page → Should stay logged in
3. Open new tab to same URL → Should stay logged in
4. Close browser completely
5. Reopen browser → Should need to login again

## Troubleshooting

### Issue: Can't login with correct password
**Solution:** 
1. Check `APP_PASSWORD` in `.env.local`
2. Restart dev server (environment variables need restart)
3. Check browser console for errors

### Issue: Redirects to login after successful login
**Solution:**
1. Check browser console for sessionStorage errors
2. Ensure sessionStorage is enabled (not in private/incognito mode)
3. Clear browser cache and try again

### Issue: Password not working in production
**Solution:**
1. Verify `APP_PASSWORD` is set in Amplify environment variables
2. Check Amplify build logs for errors
3. Ensure environment variable is not prefixed with `NEXT_PUBLIC_`

## Security Best Practices

### For Production
1. **Use a strong password:**
   - Minimum 16 characters
   - Mix of letters, numbers, symbols
   - Not a dictionary word
   - Example: `Lz@r$2024!Pr0d#Sec`

2. **Rotate password regularly:**
   - Change every 90 days
   - Update in Amplify environment variables
   - Notify authorized users

3. **Monitor access:**
   - Check Amplify logs for failed login attempts
   - Set up CloudWatch alarms for suspicious activity

4. **Consider upgrading to proper auth:**
   - If multiple users needed
   - If compliance required
   - If audit trail needed

## Files Modified/Created

### Created:
- `frontend/app/page.tsx` - Login page
- `frontend/app/app/page.tsx` - Protected app page
- `frontend/app/api/auth/login/route.ts` - Login API
- `LOGIN-SYSTEM.md` - This documentation

### Modified:
- `frontend/components/Sidebar.tsx` - Added logout button
- `frontend/.env.local` - Added APP_PASSWORD
- `frontend/.env.example` - Added APP_PASSWORD example

## Summary

Simple, effective password protection for single-user deployment. Perfect for personal use and quick deployment protection. Easy to upgrade to more robust authentication if needed in the future.

**Default Password:** `lazarus2024`
**Change it in:** `frontend/.env.local` → `APP_PASSWORD`
