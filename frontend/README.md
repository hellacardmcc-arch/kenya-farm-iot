# Kenya Farm IoT Frontend

Simple static dashboard for Kenyan farmers.

## Deployment on Render (Static Site)

1. Go to **[Render Dashboard](https://dashboard.render.com)**
2. Click **"New +"** → **"Static Site"**
3. Connect your GitHub repository (`hellacardmcc-arch/kenya-farm-iot` or your fork).
4. **Configure:**
   - **Name:** `kenya-farm-dashboard` (or any name)
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** *(leave empty)* — no build needed
   - **Publish Directory:** `.` — publish the contents of `frontend/` (where `index.html` lives)
5. Click **"Create Static Site"**.

**That's it!** Your site will be live in 2 minutes.

After deploy, set **API_URL** in `frontend/index.html` to your backend URL (see below).

---

## SOLUTION 2: If You Want React/Vue (With Build)

If you want to use React/Vue with a build process:

### Option A: Create Simple React App

**1. Create `frontend/package.json`:**

```json
{
  "name": "kenya-farm-dashboard",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

*(This repo already uses a React + Vite setup with more dependencies; the above is a minimal example.)*

---

## Backend Connection

Update the API_URL in index.html to point to your backend:

```javascript
const API_URL = 'https://your-backend.onrender.com';
```
