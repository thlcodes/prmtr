import { get, writable } from "svelte/store";
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
