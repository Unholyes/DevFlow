# DevFlow Authentication Testing Guide

## 🧪 Testing Steps

### 1. **Test Tenant Admin Signup**
- Go to `http://localhost:3000/auth/signup`
- Fill out the form:
  - Organization Name: "Test Company"
  - Email: your-email@example.com
  - Password: testpassword123
  - Confirm Password: testpassword123
- Click "Create Organization"
- Check your email for verification link
- Click the verification link

### 2. **Test Login**
- Go to `http://localhost:3000/auth/login`
- Enter your credentials
- Should redirect to dashboard showing your organization

### 3. **Verify Database Integration**
- Check dashboard shows:
  - Your user profile with role "tenant_admin"
  - Your organization "Test Company"
  - Owner status

### 4. **Test Team Member Invitation Flow**
- As tenant admin, create invitation (we'll add this feature next)
- Test invitation acceptance

### 5. **Test Role-Based Access**
- Try accessing dashboard without login → should redirect to login
- Check that RLS policies work correctly

## 🔍 What to Check

### Database Tables Created:
- ✅ `profiles` - User profiles with roles
- ✅ `organizations` - Tenant organizations
- ✅ `organization_members` - Team memberships
- ✅ `team_invitations` - Invitation system

### Authentication Flow:
- ✅ Email/password signup with organization creation
- ✅ Email verification
- ✅ Secure login/logout
- ✅ Protected routes with middleware
- ✅ Role-based user metadata

### Security Features:
- ✅ Row Level Security (RLS) enabled
- ✅ Proper access policies
- ✅ Secure invitation tokens

## 🚨 Common Issues & Fixes

### Issue: "Table doesn't exist"
**Fix**: Make sure you ran the `database-schema.sql` in Supabase SQL Editor

### Issue: "Permission denied"
**Fix**: Check RLS policies are correctly applied

### Issue: "Email not received"
**Fix**: Check Supabase email settings and spam folder

### Issue: "Redirect loop"
**Fix**: Check middleware configuration in `middleware.ts`

## 🎯 Next Steps

Once authentication works:
1. Add project creation/management
2. Implement task management
3. Add team invitation UI
4. Build SDLC workflow boards
5. Add calendar and reporting features

## 🐛 Debug Tools

Use the browser console to run `test-db.js` for database connectivity testing.

Happy testing! 🚀