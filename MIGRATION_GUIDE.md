# Migration Guide: Firebase Storage to Cloudflare R2

## 1. Cloudflare Worker Deployment
The code for the worker is in `cloudflare-worker/src/index.ts`.

### Setup
1.  Navigate to the worker directory:
    ```bash
    cd cloudflare-worker
    ```
2.  Install dependencies:
    ```bash
    npm install aws4fetch
    ```
3.  Login to Cloudflare (if not logged in):
    ```bash
    npx wrangler login
    ```
4.  Deploy the worker:
    ```bash
    npx wrangler deploy
    ```
    *Note: This will output your worker URL (e.g., `https://r2-video-uploader.<your-subdomain>.workers.dev`).*

## 2. R2 Configuration
1.  Go to Cloudflare Dashboard > R2.
2.  Ensure you have a bucket named `bengauru-swada-videos`.
3.  **CORS Policy**: Settings > CORS Policy. Add:
    ```json
    [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["PUT", "GET", "HEAD"],
        "AllowedHeaders": ["*"]
      }
    ]
    ```
4.  **Connect Domain**: If using a custom domain (recommended as `videos.bengaluru-swada.com`), connect it in Settings. If using `r2.dev`, note that it is rate-limited and not for production.

## 3. Environment Variables
You must set your R2 credentials in the Worker environment secrets:
```bash
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put ACCOUNT_ID
```
*Get these from Cloudflare Dashboard > R2 > Manage R2 API Tokens.*

## 4. Angular Configuration Update
1.  Open `src/environments/environment.development.ts`.
2.  Update `cloudflare.workerUrl` with the deployed worker URL from Step 1.
3.  Update `cloudflare.cdnUrl` with your connected custom domain or public R2 URL.

## 5. Verification
1.  Run `ng serve`.
2.  Go to Upload Reel page.
3.  Upload a video.
4.  Check network tab: You should see a request to your worker, followed by a PUT to Cloudflare.
5.  Check Firestore: The `videoUrl` should now be a Cloudflare URL.

## 6. Cleanup
- `provideStorage` has been removed from `app.config.ts`.
- You can uninstall `@angular/fire/storage` if you wish: `npm uninstall @angular/fire/storage`.
