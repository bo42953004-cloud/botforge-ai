import type { UIMessage } from "ai";

export type LocalThread = { id: string; title: string; updated_at: string };
type StoredMessage = { id: string; role: "user" | "assistant"; content: string };

const THREADS_KEY = "aureus.threads";
const messagesKey = (threadId: string) => `aureus.messages.${threadId}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — ignore
  }
}

export function listThreads(): LocalThread[] {
  return read<LocalThread[]>(THREADS_KEY, []).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at),
  );
}

function saveThreads(threads: LocalThread[]) {
  write(THREADS_KEY, threads);
}

export function createLocalThread(title = "New bot"): string {
  const id = crypto.randomUUID();
  const threads = listThreads();
  threads.unshift({ id, title, updated_at: new Date().toISOString() });
  saveThreads(threads);
  return id;
}

export function deleteLocalThread(id: string) {
  saveThreads(listThreads().filter((thread) => thread.id !== id));
  try {
    localStorage.removeItem(messagesKey(id));
  } catch {
    // ignore
  }
}

export function renameLocalThread(id: string, title: string) {
  saveThreads(listThreads().map((t) => (t.id === id ? { ...t, title } : t)));
}

export function touchLocalThread(id: string) {
  saveThreads(
    listThreads().map((t) => (t.id === id ? { ...t, updated_at: new Date().toISOString() } : t)),
  );
}

export function loadLocalMessages(threadId: string): UIMessage[] {
  return read<StoredMessage[]>(messagesKey(threadId), []).map((row) => ({
    id: row.id,
    role: row.role,
    parts: [{ type: "text", text: row.content }],
  })) as UIMessage[];
}

export function saveLocalMessage(
  threadId: string,
  role: "user" | "assistant",
  content: string,
  id: string,
) {
  const rows = read<StoredMessage[]>(messagesKey(threadId), []);
  if (rows.some((row) => row.id === id)) return;
  rows.push({ id, role, content });
  write(messagesKey(threadId), rows);
  touchLocalThread(threadId);
}
