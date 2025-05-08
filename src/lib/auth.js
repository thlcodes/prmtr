import { writable, get } from "svelte/store";

const DEVICE_CODE_URL =
  "https://prompete.cfapps.eu10.hana.ondemand.com/api/device/code";

/** @type {import("svelte/store").Writable<{user_code?: string, authenticated?: boolean, loading: boolean, error?: string}>} */
export const store = writable({
  loading: false,
  user_code: null,
  authenticated: false,
  error: null,
});

/**
 * @returns {Promise<void>}
 */
export async function getDeviceCode() {
  store.update((s) => ({ ...s, loading: true }));
  const res = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  const { user_code } = await res.json();
  store.set({ user_code, loading: false });
}

const CHECK_AUTH_URL =
  "https://prompete.cfapps.eu10.hana.ondemand.com/api/auth/check";

/**
 * @returns {Promise<number>}
 */
export async function check() {
  const res = await fetch(CHECK_AUTH_URL, {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (res.status != 200) {
    store.set({
      error: `${res.status}`,
      loading: true,
    });
    return 0;
  }
  let resp = await res.json();
  if (!resp.authenticated) {
    console.log("access token not yet ready", resp);
    return resp.interval || 5;
  }
  store.set({
    authenticated: !!resp.authenticated,
    loading: true,
  });
  return 0;
}

/**
 * @returns {Promise<void>}
 */
export async function waitForAuth() {
  const interval = await check();
  if (interval <= 0) {
    return;
  }
  await new Promise((r) => {
    setTimeout(async () => {
      console.log(`waiting ${interval}s for auth ...`);
      await waitForAuth();
      r();
    }, interval * 1000);
  });
  store.update((s) => ({ ...s }));
}

const LOGOUT_AUTH_URL =
  "https://prompete.cfapps.eu10.hana.ondemand.com/api/auth/logout";

export async function logout() {
  await fetch(LOGOUT_AUTH_URL, {
    credentials: "include",
  });
  store.set({ loading: false, authenticated: false });
}
