import { get, readable, writable } from "svelte/store";
import { store as authStore } from "./auth";
import { CORS_PROXY } from "./common";

/** @typedef {{role: string, content: string}} Message */

const DEFAULT_ERROR_MESSAGE = "Woops! Something went wrong ....";

/**
 * @param message {string}
 * @returns {Promise<string>}
 */
export async function send(message, temperature = 0.1) {
  let messages = [
    {
      role: "user",
      content: message,
    },
  ];

  const body = {
    intent: true,
    model: "gpt-4",
    n: 1,
    stream: false,
    temperature: temperature,
    messages,
  };

  const CHAT_API_URL =
    CORS_PROXY + "https://api.business.githubcopilot.com/chat/completions";

  const token = get(authStore).copilot_token;

  const resp = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json; charset=utf-8",
      Authorization: "Bearer " + token,
      "Editor-Version": "vscode/1.99",
    },
    body: JSON.stringify(body),
  });

  /** @type {{choices?: {message: Message}[]}} */
  const payload = await resp.json();

  const reply = (payload.choices ?? [
    {
      message: { content: DEFAULT_ERROR_MESSAGE, role: "assistant" },
    },
  ])[0].message;

  return reply.content;
}

/**
 * @param message {string}
 * @param temperature {number}
 * @param callback {(c: string) => Promise<void>}
 * @returns {Promise<void>}
 */
export async function stream(message, temperature = 0.1, callback) {
  let messages = [
    {
      role: "user",
      content: message,
    },
  ];

  const body = {
    intent: true,
    model: "gpt-4",
    n: 1,
    stream: true,
    temperature: temperature,
    messages,
  };

  const CHAT_API_URL =
    CORS_PROXY + "https://api.business.githubcopilot.com/chat/completions";

  const token = get(authStore).copilot_token;

  const resp = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json; charset=utf-8",
      Authorization: "Bearer " + token,
      "Editor-Version": "vscode/1.99",
    },
    body: JSON.stringify(body),
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
