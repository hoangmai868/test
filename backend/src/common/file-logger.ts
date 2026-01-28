import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const LOG_DIR = process.env.JOB_LOG_DIR ?? path.join(process.cwd(), 'logs');
const LOG_FILE_NAME = process.env.JOB_LOG_FILE_NAME ?? 'job-requests.log';
const LOG_FILE_PATH = path.join(LOG_DIR, LOG_FILE_NAME);

async function ensureLogDirectory(): Promise<void> {
  await fs.promises.mkdir(LOG_DIR, { recursive: true });
}

function formatPayload(payload?: unknown): string {
  if (payload === undefined) {
    return '';
  }

  if (typeof payload === 'string') {
    return payload;
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export async function logJobEvent(
  label: string,
  payload?: unknown,
): Promise<void> {
  const detail =
    payload === undefined ? label : `${label}: ${formatPayload(payload)}`;
  const entry = `${new Date().toISOString()} ${detail}${os.EOL}`;
  await ensureLogDirectory();
  await fs.promises.appendFile(LOG_FILE_PATH, entry);
}

export function logJobEventSafe(label: string, payload?: unknown): void {
  void logJobEvent(label, payload).catch((error) => {
    console.error('Failed to write job log entry', error);
  });
}
