import { writable, get } from "svelte/store";

const DEVICE_CODE_URL =
  "https://cors-anywhere.herokuapp.com/https://github.com/login/device/code?client_id=Iv1.b507a08c87ecfe98&scope=read:user";

/** @type {import("svelte/store").Writable<{device_code?: string, user_code?: string, access_token?: string, copilot_token?: string, user?: string}>} */
export const store = writable({
  user_code: localStorage.getItem("user_code") || null,
  device_code: localStorage.getItem("device_code") || null,
  access_token: localStorage.getItem("access_token") || null,
  copilot_token: null,
  user: null,
});

/**
 * @returns {Promise<void>}
 */
export async function getDeviceCode() {
  let device_code = localStorage.getItem("device_code");
  let user_code = localStorage.getItem("user_code");
  let code_expiry = parseInt(localStorage.getItem("code_expiry") || "0");
  console.log(
    `stuff in localStorage: dc=${device_code},uc=${user_code},exp=${code_expiry}; now=${Date.now()}; expires_in=${(code_expiry - Date.now()) / 1000}`,
  );
  if (device_code != null && user_code != null && Date.now() < code_expiry) {
    store.set({ device_code, user_code });
    return;
  }
  const res = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  let expires_in = 0;
  ({ device_code, user_code, expires_in } = await res.json());
  store.set({ device_code, user_code });
  localStorage.setItem("device_code", device_code);
  localStorage.setItem("user_code", user_code);
  localStorage.setItem("code_expiry", `${Date.now() + expires_in * 1000}`);
}

const ACCESS_TOKEN_URL =
  "https://cors-anywhere.herokuapp.com/https://github.com/login/oauth/access_token?client_id=Iv1.b507a08c87ecfe98&grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=";

/**
 * @returns {Promise<number>}
 */
export async function getAccessToken() {
  const { device_code } = get(store);
  const res = await fetch(ACCESS_TOKEN_URL + device_code, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  let resp = await res.json();
  if (!resp.access_token) {
    console.log("access token not yet ready", resp);
    return resp.interval || 5;
  }
  store.set({
    access_token: resp.access_token,
  });
  localStorage.clear();
  localStorage.setItem("access_token", resp.access_token);
  return 0;
}

/**
 * @returns {Promise<void>}
 */
export async function waitForAccessToken() {
  const interval = await getAccessToken();
  if (interval <= 0) {
    return;
  }
  await new Promise((r) => {
    setTimeout(async () => {
      console.log(`waiting ${interval}s for access token ...`);
      await waitForAccessToken();
      r();
    }, interval * 1000);
  });
}

const COPILOT_TOKEN_URL =
  "https://cors-anywhere.herokuapp.com/https://api.github.com/copilot_internal/v2/token";

/**
 * @returns {Promise<void>}
 */
export async function getCopilotToken() {
  const { access_token } = get(store);
  const res = await fetch(COPILOT_TOKEN_URL, {
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + access_token,
    },
  });
  let resp = await res.json();
  if (!resp.token) {
    console.log(
      "request for copilot token did not contain token, restarting auth ...",
    );
    store.set({});
    return;
  }
  console.log("successfully fetch copilot token");
  store.update((s) => ({
    ...s,
    copilot_token: resp.token,
  }));
}

const USERINFO_URL = "https://api.github.com/user";

/**
 * @returns {Promise<void>}
 */
export async function getUser() {
  const { access_token } = get(store);
  const res = await fetch(USERINFO_URL, {
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + access_token,
    },
  });
  let resp = await res.json();
  if (resp.login) {
    store.update((s) => ({ ...s, user: resp.login }));
  }
}

export function logout() {
  localStorage.clear();
  store.set({});
}
