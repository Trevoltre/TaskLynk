# 🚨 Database Connection Fix Instructions

## Problem
Your Turso database connection is failing, causing:
- Login page blank/not working
- All API routes returning 500 errors
- All pages showing blank screens

## Root Cause
The database URL `libsql://tasklynk-database-maxwelldotech.turso.io` is not accessible. This could mean:
1. The database was deleted
2. The auth token expired
3. The database name is incorrect
4. Network/DNS issues

---

## ✅ Solution: Fix Your Database Connection

### Step 1: Check Your Existing Database

```bash
# Login to Turso
turso auth login

# List all your databases
turso db list

# Check if tasklynk-database-maxwelldotech exists
```

### Step 2A: If Database Exists

```bash
# Get the correct URL
turso db show tasklynk-database-maxwelldotech --url

# Generate a new auth token
turso db tokens create tasklynk-database-maxwelldotech

# Copy both values to update .env
```

### Step 2B: If Database Doesn't Exist (Create New One)

```bash
# Create new database
turso db create tasklynk-production

# Get URL
turso db show tasklynk-production --url

# Get token  
turso db tokens create tasklynk-production

# Copy both values
```

### Step 3: Update Your .env File

Update these lines in your `.env` file with the values from Step 2:

```env
TURSO_CONNECTION_URL="libsql://your-database-url-here.turso.io"
TURSO_AUTH_TOKEN="eyJhbGci...your-token-here"
```

### Step 4: Push Schema to Database

```bash
# This creates all tables in your database
npm run db:push
```

### Step 5: Set Up Admin Accounts

```bash
# Run the setup script to create admin accounts
npm run setup-db
```

### Step 6: Restart Development Server

```bash
# Stop the current server (Ctrl+C)
# Start it again
npm run dev
```

---

## 🧪 Testing

After completing the steps above:

1. **Test Database Connection**
   - Visit: http://localhost:3000/api/test/db-connection
   - Should return: `{ "success": true, "usersCount": 6 }`

2. **Test Login**
   - Visit: http://localhost:3000/login
   - Email: `topwriteessays@gmail.com`
   - Password: `kemoda2025`
   - Should redirect to admin dashboard

3. **Verify Admin Accounts**
   All these accounts should work with password `kemoda2025`:
   - topwriteessays@gmail.com
   - m.d.techpoint25@gmail.com
   - maguna956@gmail.com
   - tasklynk01@gmail.com
   - maxwellotieno11@gmail.com
   - ashleydothy3162@gmail.com

---

## 📝 Package.json Scripts Added

I've added these commands to your package.json:

```json
{
  "scripts": {
    "setup-db": "tsx src/scripts/setup-database.ts",
    "db:push": "drizzle-kit push"
  }
}
```

---

## ❓ Still Having Issues?

### Issue: "Failed to connect to database"
**Solution**: Verify your TURSO_CONNECTION_URL starts with `libsql://`

### Issue: "Authentication failed"  
**Solution**: Generate a new TURSO_AUTH_TOKEN using the Turso CLI

### Issue: "Table does not exist"
**Solution**: Run `npm run db:push` to create tables

### Issue: "Cannot find module 'tsx'"
**Solution**: Run `npm install tsx --save-dev`

---

## 🎯 Quick Summary

1. Get Turso credentials (URL + token)
2. Update `.env` file  
3. Run `npm run db:push`
4. Run `npm run setup-db`
5. Restart server
6. Login works! 🎉

---

## 📞 Need Help?

If you're stuck, provide me with:
1. Output of `turso db list`
2. First 20 characters of your TURSO_AUTH_TOKEN
3. Error messages you're seeing

I'll help you diagnose and fix the issue!