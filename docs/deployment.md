# Deployment Guide

This guide provides instructions on how to deploy the **Smart Bio Writer** application to production environments.

## 1. Deploying to Google Cloud Run

Google Cloud Run is a managed compute platform that enables you to run containers that are automatically scaled. Since this is a Vite-based React application, we need to containerize the build output.

### Prerequisites
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and configured.
- A Google Cloud Project with Billing enabled.

### Step-by-Step Deployment

1. **Create a Dockerfile**
   Create a file named `Dockerfile` in the root directory:
   ```dockerfile
   # Build stage
   FROM node:20-slim AS build
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   # Production stage
   FROM nginx:stable-alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   # Copy custom nginx config if needed for SPA routing
   # COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Build and Push to Artifact Registry**
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/smart-bio-writer
   ```

3. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy smart-bio-writer \
     --image gcr.io/[PROJECT_ID]/smart-bio-writer \
     --platform managed \
     --region [REGION] \
     --allow-unauthenticated \
     --set-env-vars GEMINI_API_KEY=[YOUR_API_KEY]
   ```

---

## 2. Deploying to GitHub via AI Studio (Verbal/Export)

AI Studio Build provides a seamless way to export your project to GitHub.

### Exporting to GitHub
1. Open the **Settings** menu (gear icon) in the AI Studio Build interface.
2. Select **Export to GitHub**.
3. Authenticate with your GitHub account if prompted.
4. Choose a repository name and visibility (Public/Private).
5. Click **Export**.

### Automated Deployment (GitHub Actions)
Once your code is on GitHub, you can set up GitHub Actions to automate deployment to services like GitHub Pages or Firebase Hosting.

#### Example: GitHub Pages Deployment
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install and Build
        run: |
          npm install
          npm run build
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

      - name: Deploy
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
```

---

## Security Note: API Keys
Since this is a client-side application, any API key included in the build will be visible to anyone who inspects the network traffic or source code.

**Recommended Approach for Production:**
For a production-grade application, it is highly recommended to:
1. **Switch to a Full-Stack Architecture:** Use an Express backend to proxy Gemini API requests. This keeps your `GEMINI_API_KEY` hidden on the server.
2. **Use Environment Variables:** Never hardcode keys. Use Google Cloud Secret Manager if deploying to Cloud Run.
