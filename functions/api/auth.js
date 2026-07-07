const githubAuthorizeUrl = "https://github.com/login/oauth/authorize";

function missingConfigResponse() {
  return new Response(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>S3S Admin Login Setup Needed</title>
    <style>
      body {
        max-width: 720px;
        margin: 0 auto;
        padding: 48px 24px;
        color: #17191d;
        background: #f6f1e8;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.55;
      }

      h1 {
        color: #522d80;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(2rem, 6vw, 4rem);
        line-height: 1;
      }

      code {
        padding: 0.1em 0.3em;
        border-radius: 4px;
        background: rgba(82, 45, 128, 0.12);
      }

      a {
        color: #522d80;
        font-weight: 800;
        text-decoration-color: #f66733;
        text-underline-offset: 0.2em;
      }
    </style>
  </head>
  <body>
    <h1>Admin login needs GitHub OAuth setup.</h1>
    <p>Cloudflare Pages is missing <code>GITHUB_CLIENT_ID</code> and/or <code>GITHUB_CLIENT_SECRET</code>, so Decap cannot open the GitHub login flow yet.</p>
    <p>Create a GitHub OAuth app with callback <code>https://website-bgu.pages.dev/api/callback</code>, add the client ID and secret to Cloudflare Pages environment variables, then redeploy.</p>
    <p><a href="/admin/help.html">Open the S3S admin setup guide</a></p>
  </body>
</html>`, {
    status: 500,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function createState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequest({ request, env }) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return missingConfigResponse();
  }

  const origin = new URL(request.url).origin;
  const state = createState();
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${origin}/api/callback`,
    scope: "public_repo",
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${githubAuthorizeUrl}?${params.toString()}`,
      "Set-Cookie": `oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
