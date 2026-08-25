# Filefly - Client File Portal & Converter

A modern client file portal for freelancers and designers to upload, manage, review, and convert design assets into client-ready deliverables.

## Deployment to GitHub Pages

If you are deploying to **GitHub Pages**, follow these simple steps to ensure the Vite build and workflow run properly:

1. **Push this repository to GitHub**.
2. Go to your repository on GitHub: `https://github.com/<your-username>/<your-repo-name>`
3. Click on **Settings** (tab on the top right) $\rightarrow$ **Pages** (in the left sidebar under *Code and automation*).
4. Under **Build and deployment** $\rightarrow$ **Source**:
   - Select **GitHub Actions** (do NOT use "Deploy from a branch").
5. The included workflow (`.github/workflows/static.yml`) will automatically run:
   - It runs `npm run build` to compile the app into `./dist`.
   - It deploys the compiled output with proper JavaScript MIME types and base paths.
6. Check the **Actions** tab to watch your deployment complete with a green checkmark!

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
