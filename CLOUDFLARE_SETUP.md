# Cloudflare Worker Setup Guide

This guide will help you integrate your Cloudflare Worker with the L'Oréal Smart Routine & Product Advisor project.

## Prerequisites

- A Cloudflare account
- An OpenAI API key
- Node.js installed (for Wrangler CLI)

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

## Step 3: Create Your Worker

Create a new directory for your worker:

```bash
mkdir loreal-api-worker
cd loreal-api-worker
```

Initialize the worker:

```bash
wrangler init
```

## Step 4: Configure wrangler.toml

Create or update `wrangler.toml`:

```toml
name = "loreal-api-worker"
main = "src/index.js"
compatibility_date = "2023-01-01"

[vars]
# Add any non-sensitive variables here
```

## Step 5: Create Worker Code

Create `src/index.js` with the following code:

```javascript
export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      // Get the request body
      const body = await request.json();

      // Validate required fields
      if (!body.model || !body.messages) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: model and messages",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Make request to OpenAI API
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      // Return response with CORS headers
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.message,
          details: "Failed to process request",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};
```

## Step 6: Add OpenAI API Key as Secret

Add your OpenAI API key as a secret (encrypted environment variable):

```bash
wrangler secret put OPENAI_API_KEY
```

When prompted, paste your OpenAI API key and press Enter.

## Step 7: Deploy Your Worker

```bash
wrangler deploy
```

After deployment, you'll get a URL like:

```
https://loreal-api-worker.your-subdomain.workers.dev
```

## Step 8: Update Your Project

1. Open `script.js` in your project
2. Find this line near the top:

```javascript
const WORKER_ENDPOINT = "https://your-worker-name.your-subdomain.workers.dev";
```

3. Replace it with your actual Worker URL:

```javascript
const WORKER_ENDPOINT = "https://loreal-api-worker.your-subdomain.workers.dev";
```

## Step 9: Test Your Integration

1. Open your project in a browser
2. Select a category and choose some products
3. Click "Generate Routine"
4. If everything works, you should see an AI-generated routine

### Troubleshooting

If you encounter issues:

1. **Check Worker Logs:**

   ```bash
   wrangler tail
   ```

2. **Verify API Key:**
   Make sure your OpenAI API key is correctly set in Cloudflare:

   - Go to Cloudflare Dashboard → Workers & Pages → Your Worker
   - Click "Settings" → "Variables"
   - Verify `OPENAI_API_KEY` is listed

3. **Test Worker Directly:**
   Use curl to test your worker:

   ```bash
   curl -X POST https://your-worker-url.workers.dev \
     -H "Content-Type: application/json" \
     -d '{
       "model": "gpt-4o",
       "messages": [
         {"role": "system", "content": "You are a helpful assistant."},
         {"role": "user", "content": "Say hello!"}
       ]
     }'
   ```

4. **Check Browser Console:**
   Open browser DevTools (F12) and check the Console and Network tabs for errors

## Security Benefits

Using a Cloudflare Worker provides several security benefits:

- ✅ API key is never exposed in client-side code
- ✅ All API requests go through your secure backend
- ✅ You can add rate limiting and authentication
- ✅ CORS is properly configured
- ✅ Request validation before hitting OpenAI

## Optional: Add Rate Limiting

To prevent abuse, you can add rate limiting to your worker:

```javascript
// Add this at the top of your worker
const RATE_LIMIT = 10; // requests per minute
const rateLimitStore = new Map();

// Add this before the OpenAI API call
const ip = request.headers.get("CF-Connecting-IP");
const now = Date.now();
const userRequests = rateLimitStore.get(ip) || [];
const recentRequests = userRequests.filter((time) => now - time < 60000);

if (recentRequests.length >= RATE_LIMIT) {
  return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

recentRequests.push(now);
rateLimitStore.set(ip, recentRequests);
```

## Next Steps

- Remove `secrets.js` from your project (already done in HTML)
- Consider adding authentication to your worker
- Set up monitoring and alerts in Cloudflare Dashboard
- Add custom error handling for specific OpenAI errors
