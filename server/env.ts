import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// .env dibaca manual agar dev, preview, dan produksi memakai cara yang sama
// tanpa memerlukan flag --env-file atau dependency tambahan.
function loadDotEnv(): void {
  const file = resolve(process.cwd(), ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (line.trim() === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^["'](.*)["']$/, "$1");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

const apiKey = process.env.TMDB_API_KEY?.trim() || null;
const accessToken = process.env.TMDB_READ_ACCESS_TOKEN?.trim() || null;

export const tmdbCredentials = { apiKey, accessToken };
export const hasTmdbCredentials = Boolean(apiKey || accessToken);
export const serverPort = Number(process.env.PORT) || 3000;
