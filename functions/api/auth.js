const githubAuthorizeUrl = "https://github.com/login/oauth/authorize";

function createState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequest({ request, env }) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response("Missing GITHUB_CLIENT_ID.", { status: 500 });
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
