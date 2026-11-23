import type { ApiResult } from "./client";

export interface TranslationBatch {
  texts: string[];
  translated: boolean[];
}

const CHUNK_SIZE = 20;

async function translateChunk(
  texts: string[],
  signal?: AbortSignal,
): Promise<ApiResult<TranslationBatch>> {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ texts }),
      signal,
    });
    const body = (await res.json().catch(() => null)) as
      | { ok: true; data?: { texts?: unknown; translated?: unknown } }
      | { ok: false; code?: string; message?: string }
      | null;

    if (!body) {
      return {
        ok: false,
        status: res.status,
        code: "BAD_RESPONSE",
        message: "Respons terjemahan tidak valid.",
      };
    }
    if (!body.ok) {
      return {
        ok: false,
        status: res.status,
        code: body.code || "TRANSLATE",
        message: body.message || "Terjemahan gagal.",
      };
    }

    const rawTexts = Array.isArray(body.data?.texts) ? body.data.texts : [];
    const rawFlags = Array.isArray(body.data?.translated) ? body.data.translated : [];
    return {
      ok: true,
      data: {
        texts: texts.map((source, index) => {
          const value = rawTexts[index];
          return typeof value === "string" && value ? value : source;
        }),
        translated: texts.map((_, index) => rawFlags[index] === true),
      },
    };
  } catch {
    if (signal?.aborted) {
      return { ok: false, status: 0, code: "ABORTED", message: "Permintaan dibatalkan." };
    }
    return {
      ok: false,
      status: 0,
      code: "NETWORK",
      message: "Terjemahan tidak bisa dimuat.",
    };
  }
}

/**
 * Terjemahan mesin en -> id. Server yang memanggil layanan terjemahan dan
 * menyimpan hasilnya, jadi teks yang sama tidak diterjemahkan berulang kali.
 */
export async function translateTexts(
  texts: string[],
  signal?: AbortSignal,
): Promise<ApiResult<TranslationBatch>> {
  const clean = texts.map((text) => text.trim());
  if (clean.length === 0) {
    return { ok: true, data: { texts: [], translated: [] } };
  }

  const resultTexts: string[] = [];
  const resultFlags: boolean[] = [];
  for (let start = 0; start < clean.length; start += CHUNK_SIZE) {
    const chunk = clean.slice(start, start + CHUNK_SIZE);
    const result = await translateChunk(chunk, signal);
    if (!result.ok) {
      // Batalkan hanya bila permintaan memang dihentikan. Kegagalan satu
      // kelompok tidak membuang hasil kelompok lain; teks aslinya dipakai.
      if (result.code === "ABORTED") return result;
      resultTexts.push(...chunk);
      resultFlags.push(...chunk.map(() => false));
      continue;
    }
    resultTexts.push(...result.data.texts);
    resultFlags.push(...result.data.translated);
  }

  return { ok: true, data: { texts: resultTexts, translated: resultFlags } };
}

export async function translateToIndonesian(
  text: string,
  signal?: AbortSignal,
): Promise<ApiResult<string>> {
  const result = await translateTexts([text], signal);
  if (!result.ok) return result;
  const translated = result.data.texts[0] ?? text;
  if (result.data.translated[0] !== true) {
    return {
      ok: false,
      status: 0,
      code: "TRANSLATE",
      message: "Terjemahan tidak tersedia.",
    };
  }
  return { ok: true, data: translated };
}
