/// <reference types="astro/client" />

interface NetlifyIdentityWidget {
  on(eventName: "init", callback: (user: unknown) => void): void;
  open(tab?: "login" | "signup"): void;
}

interface Window {
  netlifyIdentity?: NetlifyIdentityWidget;
}
