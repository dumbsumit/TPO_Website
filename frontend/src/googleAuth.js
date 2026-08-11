/**
 * googleAuth.js — Shared Google Identity Services (GSI) singleton.
 *
 * Ensures google.accounts.id.initialize() is called only ONCE globally,
 * regardless of how many components use it. Each component registers a
 * callback via subscribeGoogleCallback() and gets unregistered on unmount.
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const ALLOWED_DOMAIN   = "walchandsangli.ac.in";

let initialized  = false;
let activeCallback = null;   // only one active login callback at a time

// Master callback handed to GSI — routes to whichever component is active
const masterCallback = (response) => {
  if (activeCallback) activeCallback(response);
};

/**
 * Initialize GSI once. Safe to call multiple times — subsequent calls are no-ops.
 */
export const initGoogleAuth = () => {
  if (initialized || !GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
  window.google.accounts.id.initialize({
    client_id:     GOOGLE_CLIENT_ID,
    callback:      masterCallback,
    auto_select:   false,
    hosted_domain: ALLOWED_DOMAIN,
  });
  initialized = true;
};

/**
 * Register a callback for the currently active component.
 * Returns an unsubscribe function to call on unmount.
 */
export const subscribeGoogleCallback = (cb) => {
  activeCallback = cb;
  return () => { if (activeCallback === cb) activeCallback = null; };
};

/**
 * Render the official Google Sign-In button into a DOM element by ID.
 * @param {string} elementId  — id of the container div
 * @param {"signin_with"|"signup_with"|"continue_with"} text
 */
export const renderGoogleButton = (elementId, text = "signin_with") => {
  if (!window.google?.accounts?.id || !GOOGLE_CLIENT_ID) return;
  const el = document.getElementById(elementId);
  if (!el) return;
  window.google.accounts.id.renderButton(el, {
    theme:  "outline",
    size:   "large",
    width:  340,
    text,
  });
};

export const isGoogleConfigured = () => Boolean(GOOGLE_CLIENT_ID);
