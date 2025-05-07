import { get, writable } from "svelte/store";
import { store as authStore } from "./auth";

/** @typedef {{role: string, content: string}} Message */
/** @type import("svelte/store").Writable<Message[]> */
export const history = writable([]);

const DEFAULT_ERROR_MESSAGE = "Woops! Something went wrong ....";

/**
 * @param message {string}
 */
export async function send(message) {
  history.update((h) => [
    ...h,
    {
      role: "user",
      content: message,
    },
  ]);
  let messages = get(history);

  const body = {
    intent: true,
    model: "gpt-4",
    n: 1,
    stream: false,
    temperature: 0.1,
    top_p: 1,
    messages,
  };

  const CHAT_API_URL =
    "https://cors-anywhere.herokuapp.com/https://api.business.githubcopilot.com/chat/completions";

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
  history.update((h) => [...h, reply]);
}
