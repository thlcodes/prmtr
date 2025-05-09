import { get, readable, writable } from "svelte/store";
import { store as authStore } from "./auth";

/** @typedef {{role: string, content: string}} Message */

/**
 * @param message {string}
 * @param temperature {number}
 * @param callback {(c: string) => Promise<void>}
 * @returns {Promise<void>}
 */
export async function stream(message, temperature = 0.1, callback) {
  const body = {
    temperature: temperature,
    message,
  };

  const CHAT_API_URL =
    "https://prompete.cfapps.eu10.hana.ondemand.com/api/chat/stream";

  const resp = await fetch(CHAT_API_URL, {
    method: "POST",
    body: JSON.stringify(body),
    credentials: "include",
  });

  const reader = resp.body.pipeThrough(new TextDecoderStream()).getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    for (const entry of value.split("\n")) {
      if (entry.trim() == "") {
        continue;
      }
      if (!entry.startsWith("data: ")) {
        continue;
      }
      const json = entry.slice(6);
      if (json == "[DONE]") {
        continue;
      }
      try {
        const payload = JSON.parse(json);
        if ((payload.choices || []).length == 0) {
          continue;
        }
        const content = payload.choices[0]?.delta?.content;
        if (content) {
          await callback(content);
        }
      } catch {
        await callback("ERROR: could not parse payload");
        break;
      }
    }
  }
}

/**
 * @param message {string}
 * @param temperature {number}
 * @param callback {(c: string) => Promise<void>}
 * @returns {Promise<string>}
 */
export async function ask(message, temperature = 0.1) {
  const body = {
    temperature: temperature,
    message,
  };

  const CHAT_API_URL =
    "https://prompete.cfapps.eu10.hana.ondemand.com/api/chat/ask";

  const resp = await fetch(CHAT_API_URL, {
    method: "POST",
    body: JSON.stringify(body),
    credentials: "include",
  });

  const payload = await resp.json();

  if (payload.choices.length > 0) {
    return payload.choices[0].message.content;
  }
  return "";
}
