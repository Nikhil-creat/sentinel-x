# Publish Sentinel-X on GitHub Pages

GitHub Pages hosts the static front end for free. The Docker backend is optional and is not hosted by GitHub Pages.

## Method A: GitHub website (no installs)

1. Extract the zip. Open the extracted `sentinel-x` folder. You should see `index.html` directly inside it.
2. On github.com click **New repository**, name it `sentinel-x`, keep it **Public**, and click **Create repository**.
3. Click **uploading an existing file** (or **Add file, Upload files**).
4. On a computer, open the extracted folder and drag **everything inside it** into the upload area:
   `index.html`, `404.html`, `manifest.webmanifest`, `sw.js`, `favicon.svg`, `robots.txt`, `README.md`, `LICENSE`,
   `SECURITY.md`, `docker-compose.yml`, `.env.example`, and the folders `css`, `js`, `assets`, `backend`, `web`, `docs`.
   Do not upload the parent folder itself, or your site will live at a longer path.
5. Wait for the upload to finish, then click **Commit changes**.
6. Go to **Settings, Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose branch **main** and folder **/ (root)**, then **Save**.
7. After one or two minutes your site is live at `https://YOUR-USERNAME.github.io/sentinel-x/`.

Hidden files such as `.github/workflows/ci.yml`, `.gitignore`, `.dockerignore` and `.nojekyll` may be skipped by the browser uploader. They are optional. Method B uploads them correctly.

## Method B: Git (recommended, uploads everything)

```bash
cd sentinel-x
git init
git add .
git commit -m "Sentinel-X: AI cyber defense platform"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/sentinel-x.git
git push -u origin main
```

Then enable Pages exactly as in step 6 above. If Git asks for a password, use a personal access token (GitHub, Settings, Developer settings, Personal access tokens) or sign in with GitHub Desktop.

## Method C: GitHub Desktop

1. Install GitHub Desktop and sign in.
2. **File, Add local repository**, choose the extracted folder, and accept the prompt to create a repository.
3. **Commit to main**, then **Publish repository** (keep it public).
4. Enable Pages as in step 6 above.

## After publishing

- Open the live link on your phone and computer to check it.
- Add the link to the repository's **About** box (the gear icon near the top right), plus topics such as `cybersecurity`, `machine-learning`, `rag`, `agentic-ai`, `docker`, `threejs`.
- Put the link on your resume and LinkedIn.

## Troubleshooting

| Problem | Fix |
|---|---|
| 404 on the site | Check that `index.html` is in the repository root, not inside a folder, and that Pages is set to `main` and `/ (root)`. |
| Blank 3D area | Three.js loads from a CDN. Check your connection, and try a browser with WebGL enabled. |
| Old version still showing | Hard refresh (Ctrl+Shift+R). The service worker caches files, so also try a private window. |
| CI shows a red cross | Open the run in the **Actions** tab. The `docker compose config` step needs the compose file to be valid, and the JS and Python steps need the files to be uploaded in full. |
