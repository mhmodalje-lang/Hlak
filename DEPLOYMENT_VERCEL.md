# 🚀 VERCEL DEPLOYMENT GUIDE - BARBER HUB

Complete guide to deploy Barber Hub platform on Vercel with cost optimization.

---

## 📋 **Prerequisites**

1. **GitHub Account** - Your code must be in a GitHub repository
2. **Vercel Account** - Free tier available at vercel.com
3. **MongoDB Atlas** - Free tier (M0) available at mongodb.com/cloud/atlas
4. **Emergent LLM Key** - From Emergent integrations (for AI features)

---

## 🔑 **Step 1: Extract API Keys from Emergent**

### **Backend Environment Variables:**

Create `/app/backend/.env.production` file with:

```env
# Database
MONGO_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
DB_NAME=barber_hub_prod

# CORS (Vercel frontend URL)
CORS_ORIGINS=https://your-app.vercel.app

# AI Services
EMERGENT_LLM_KEY=sk-emergent-YOUR_KEY_HERE

# JWT Secret (Generate new one for production)
JWT_SECRET=<generate_random_secure_string_here>

# Optional: Stripe (if implementing payments later)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
```

### **Frontend Environment Variables:**

Create `/app/frontend/.env.production` file with:

```env
REACT_APP_BACKEND_URL=https://your-backend-api.vercel.app
```

---

## 📁 **Step 2: Prepare Repository Structure**

Your repository should look like:

```
barber-hub/
├── backend/
│   ├── server.py
│   ├── ai_services.py
│   ├── ai_tryon_service.py
│   ├── requirements.txt
│   └── vercel.json
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vercel.json
└── README.md
```

---

## 🔧 **Step 3: Create Vercel Configuration Files**

### **Backend: `/backend/vercel.json`**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.py",
      "use": "@vercel/python",
      "config": {
        "maxLambdaSize": "50mb"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.py"
    },
    {
      "src": "/(.*)",
      "dest": "server.py"
    }
  ],
  "env": {
    "PYTHONPATH": "/var/task"
  }
}
```

### **Frontend: `/frontend/vercel.json`**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

---

## 📤 **Step 4: Push to GitHub**

From Emergent platform:
1. Click "Save to GitHub" button
2. Authorize GitHub access
3. Create new repository or use existing one
4. Commit and push all changes

---

## 🌐 **Step 5: Deploy to Vercel**

### **Deploy Backend:**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure:
   - **Root Directory:** `backend`
   - **Framework Preset:** Other
   - **Build Command:** Leave empty
   - **Output Directory:** Leave empty
4. **Environment Variables:**
   - Add all variables from `.env.production`
   - Click "Add" for each variable
5. Click "Deploy"
6. Copy the deployed URL (e.g., `https://barber-hub-api.vercel.app`)

### **Deploy Frontend:**

1. Go to [vercel.com/new](https://vercel.com/new) again
2. Import same GitHub repository
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Create React App
   - **Build Command:** `yarn build`
   - **Output Directory:** `build`
4. **Environment Variables:**
   - `REACT_APP_BACKEND_URL` = Your backend URL from previous step
5. Click "Deploy"

---

## ✅ **Step 6: Configure MongoDB Atlas**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free M0 cluster (512MB storage)
3. Configure Network Access:
   - Click "Network Access"
   - Add IP: `0.0.0.0/0` (Allow from anywhere for Vercel)
4. Create Database User:
   - Click "Database Access"
   - Add user with password
5. Get Connection String:
   - Click "Connect"
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your user's password
6. Update `MONGO_URL` in Vercel backend environment variables

---

## 🧪 **Step 7: Test Deployment**

1. Visit your frontend URL: `https://your-app.vercel.app`
2. Test core flows:
   - Gender Selection → Homepage loads
   - Login/Register works
   - AI Advisor (requires booking)
   - AI Try-On (requires confirmed booking)
3. Check backend logs in Vercel Dashboard → Deployments → [Your Deployment] → Logs

---

## 💰 **Cost Breakdown**

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Vercel Hobby | Free (100GB bandwidth) | **$0** |
| MongoDB Atlas | M0 Cluster | **$0** |
| Emergent LLM Key | Pay-as-you-go | **~$5-20/month** |
| **Total** | | **$5-20/month** |

**Savings:** $225/month → $5-20/month = **~$200+ saved!**

---

## 🔒 **Security Checklist**

- [ ] All API keys in environment variables (not in code)
- [ ] CORS properly configured with your frontend domain
- [ ] MongoDB network access restricted or monitored
- [ ] JWT_SECRET is a strong random string
- [ ] One-Shot Policy enforced (1 AI Try-On per booking)

---

## 📊 **Monitoring**

### **Vercel Dashboard:**
- Monitor bandwidth usage
- Check function execution logs
- View deployment history

### **Barber Dashboard:**
- Navigate to Barber Dashboard → AI Usage Statistics
- Track total AI calls (Advisor + Try-On)
- Monitor estimated cost

---

## 🆘 **Troubleshooting**

### **Backend 500 Error:**
- Check Vercel logs: Dashboard → Deployments → Logs
- Verify all environment variables are set
- Ensure MongoDB connection string is correct

### **Frontend Can't Connect to Backend:**
- Verify `REACT_APP_BACKEND_URL` is correct
- Check CORS settings in backend
- Ensure backend API routes have `/api` prefix

### **AI Features Not Working:**
- Check `EMERGENT_LLM_KEY` is set correctly
- Verify emergentintegrations library is in requirements.txt
- Check backend logs for specific error messages

---

## 📝 **Environment Variables Checklist**

### **Backend (Vercel):**
```
✓ MONGO_URL
✓ DB_NAME
✓ CORS_ORIGINS
✓ EMERGENT_LLM_KEY
✓ JWT_SECRET
```

### **Frontend (Vercel):**
```
✓ REACT_APP_BACKEND_URL
```

---

## 🔄 **Continuous Deployment**

After initial setup, any push to GitHub will automatically trigger:
- Backend redeployment (if backend/ changes)
- Frontend redeployment (if frontend/ changes)

---

## 🎉 **Success!**

Your Barber Hub platform is now live on Vercel with:
- ✅ Cost optimized ($200+/month saved)
- ✅ One-Shot AI Try-On policy (1 attempt per booking)
- ✅ Production-ready MongoDB Atlas
- ✅ All API keys secured in environment variables
- ✅ Usage monitoring dashboard

**Live URL:** `https://your-app.vercel.app` 🚀
