import { PianoSheet, Difficulty } from "./types";

/**
 * Downloads a single sheet as a .txt file formatted for Virtual Piano
 */
export function exportSheetAsTxt(sheet: PianoSheet): void {
  const fileContent = [
    `// AutoPiano Open Source Sheet`,
    `// Title: ${sheet.title}`,
    `// Artist: ${sheet.artist || "Unknown Artist"}`,
    `// BPM: ${sheet.bpm}`,
    `// Difficulty: ${sheet.difficulty}`,
    sheet.description ? `// Description: ${sheet.description}` : "",
    "",
    sheet.content,
  ]
    .filter(Boolean)
    .join("\n");

  const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
  const safeTitle = sheet.title.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  downloadBlob(blob, `${safeTitle}.txt`);
}

/**
 * Exports entire library or custom sheets collection as a JSON file
 */
export function exportLibraryAsJson(sheets: PianoSheet[], fileName = "autopiano-collection.json"): void {
  const exportPayload = {
    app: "Auto Piano Play",
    version: "0.1.0",
    exportedAt: new Date().toISOString(),
    totalSheets: sheets.length,
    sheets: sheets.map((s) => ({
      title: s.title,
      artist: s.artist || "Unknown Artist",
      bpm: s.bpm || 120,
      difficulty: s.difficulty || "Normal",
      content: s.content || "",
      description: s.description || "",
      tags: s.tags || ["Community"],
    })),
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, fileName);
}

/**
 * Helper to trigger file download in browser / desktop webview
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses an imported file (.txt or .json) into an array of PianoSheet objects
 */
export function parseImportedFileContent(
  rawContent: string,
  fileName: string
): { sheets: Omit<PianoSheet, "id">[]; errors?: string } {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return { sheets: [], errors: "Berkas kosong." };
  }

  // 1. Handle JSON Import (Single sheet or Collection array)
  if (fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      const rawList: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.sheets)
        ? parsed.sheets
        : [parsed];

      const validSheets: Omit<PianoSheet, "id">[] = [];

      for (const item of rawList) {
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          const title = String(obj.title || obj.name || "Untitled Sheet").trim();
          const content = String(obj.content || obj.notation || obj.notes || "").trim();
          const artist = String(obj.artist || obj.author || "Community").trim();
          const rawBpm = Number(obj.bpm) || 120;
          const bpm = Math.min(260, Math.max(30, rawBpm));
          const diffStr = String(obj.difficulty || "Normal").toLowerCase();
          const difficulty: Difficulty =
            diffStr.includes("easy") || diffStr.includes("mudah")
              ? "Easy"
              : diffStr.includes("hard") || diffStr.includes("sulit")
              ? "Hard"
              : "Normal";

          if (content) {
            validSheets.push({
              title,
              artist,
              bpm,
              difficulty,
              content,
              isPremium: false,
              description: String(obj.description || `Diimpor dari ${fileName}`),
              tags: Array.isArray(obj.tags) ? (obj.tags as string[]) : ["Imported"],
            });
          }
        }
      }

      if (validSheets.length === 0) {
        return { sheets: [], errors: "Tidak ditemukan partitur valid dalam berkas JSON." };
      }

      return { sheets: validSheets };
    } catch (err) {
      return { sheets: [], errors: `Gagal membaca format JSON: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // 2. Handle TXT Import (Virtual Piano notation with optional header comments)
  const lines = trimmed.split(/\r?\n/);
  let title = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();
  let artist = "Community";
  let bpm = 120;
  let difficulty: Difficulty = "Normal";
  let description = `Diimpor dari berkas ${fileName}`;
  const notationLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("//") || trimmedLine.startsWith("#")) {
      const lower = trimmedLine.toLowerCase();
      if (lower.includes("title:")) {
        title = trimmedLine.split(/title:/i)[1].trim();
      } else if (lower.includes("artist:")) {
        artist = trimmedLine.split(/artist:/i)[1].trim();
      } else if (lower.includes("bpm:")) {
        const parsedBpm = parseInt(trimmedLine.split(/bpm:/i)[1].trim(), 10);
        if (!isNaN(parsedBpm)) bpm = Math.min(260, Math.max(30, parsedBpm));
      } else if (lower.includes("difficulty:")) {
        const diffPart = trimmedLine.split(/difficulty:/i)[1].trim().toLowerCase();
        if (diffPart.includes("easy")) difficulty = "Easy";
        else if (diffPart.includes("hard")) difficulty = "Hard";
        else difficulty = "Normal";
      } else if (lower.includes("description:")) {
        description = trimmedLine.split(/description:/i)[1].trim();
      }
    } else if (trimmedLine) {
      notationLines.push(line);
    }
  }

  const content = notationLines.join("\n").trim();
  if (!content) {
    return { sheets: [], errors: "Berkas .txt tidak memiliki baris notasi tuts yang valid." };
  }

  return {
    sheets: [
      {
        title: title || "Untitled Sheet",
        artist,
        bpm,
        difficulty,
        content,
        isPremium: false,
        description,
        tags: ["TXT Import"],
      },
    ],
  };
}
