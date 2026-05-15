const githubTokenUrl = "https://github.com/login/oauth/access_token";

function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

function renderAuthPage(status, details) {
  const message = `authorization:github:${status}:${JSON.stringify(details)}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Authorizing S3S Admin</title>
  </head>
  <body>
    <p>Completing GitHub login...</p>
    <script>
      const message = ${JSON.stringify(message)};

      function finish(event) {
        if (window.opener) {
          window.opener.postMessage(message, event.origin);
          window.close();
        }
      }

      if (window.opener) {
        window.opener.postMessage("authorizing:github", "*");
        window.addEventListener("message", finish, false);
      } else {
        document.body.textContent = "Authentication finished. You can close this window.";
      }
    </script>
  </body>
</html>`;
}

function authResponse(status, details, responseStatus = 200) {
  return new Response(renderAuthPage(status, details), {
    status: responseStatus,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": "oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const storedState = getCookie(request, "oauth_state");

  if (!code || !returnedState || !storedState || returnedState !== storedState) {
    return authResponse("error", { message: "GitHub login could not be verified. Please try again." }, 401);
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return authResponse("error", { message: "GitHub OAuth is not configured on this site." }, 500);
  }

  const tokenResponse = await fetch(githubTokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/callback`,
      state: returnedState,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
    return authResponse(
      "error",
      { message: tokenData.error_description || tokenData.error || "GitHub did not return an access token." },
      401,
    );
  }

  return authResponse("success", {
    token: tokenData.access_token,
    provider: "github",
  });
}
