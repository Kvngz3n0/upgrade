import fs from 'fs';
import path from 'path';

const importedUserAgentFile = path.resolve(process.cwd(), 'import', 'build', 'user-agents.min.json');

const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15'
];

function loadImportedUserAgents(): string[] | null {
  try {
    if (!fs.existsSync(importedUserAgentFile)) {
      return null;
    }

    const raw = fs.readFileSync(importedUserAgentFile, 'utf-8');
    const parsed = JSON.parse(raw);

    const agents: string[] = [];
    if (typeof parsed.recommended === 'string') {
      agents.push(parsed.recommended);
    }

    if (Array.isArray(parsed.desktop)) {
      agents.push(...parsed.desktop.filter((ua: unknown) => typeof ua === 'string'));
    }

    if (Array.isArray(parsed.mobile)) {
      agents.push(...parsed.mobile.filter((ua: unknown) => typeof ua === 'string'));
    }

    const unique = Array.from(new Set(agents.map((ua) => ua.trim()).filter(Boolean)));
    return unique.length > 0 ? unique : null;
  } catch {
    return null;
  }
}

export function getRandomUserAgent(): string {
  const importedAgents = loadImportedUserAgents();
  const pool = importedAgents && importedAgents.length > 0 ? importedAgents : DEFAULT_USER_AGENTS;
  return pool[Math.floor(Math.random() * pool.length)];
}
