import { NoteEvent, SheetParseResult } from "./types";

export function parseSheetLocally(rawContent: string, bpm: number = 120): SheetParseResult {
  const events: NoteEvent[] = [];
  let totalNotes = 0;

  const safeBpm = Math.min(Math.max(bpm, 40), 300);
  const quarterNoteMs = 60000 / safeBpm;
  const stepDelayMs = Math.round((quarterNoteMs / 4) * 1.15); // ~144ms at 120 BPM
  const fastDelayMs = Math.round(stepDelayMs * 0.65);         // ~94ms for runs
  const restDelayMs = stepDelayMs;
  const barDelayMs = Math.round(quarterNoteMs * 0.75);

  const lines = rawContent.split("\n");
  let lineIdx = 0;

  for (const line of lines) {
    lineIdx++;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) {
      continue;
    }

    let i = 0;
    while (i < trimmed.length) {
      const char = trimmed[i];

      if (char === "[" || char === "{") {
        const closeChar = char === "[" ? "]" : "}";
        const closeIdx = trimmed.indexOf(closeChar, i + 1);

        if (closeIdx !== -1) {
          const chordContent = trimmed.substring(i + 1, closeIdx);
          const chordKeys: string[] = [];

          for (const c of chordContent) {
            if (isValidPianoChar(c)) {
              chordKeys.push(c);
            }
          }

          if (chordKeys.length > 0) {
            totalNotes += chordKeys.length;
            let extraDelay = stepDelayMs;

            let j = closeIdx + 1;
            // Check if followed immediately by another note without spaces
            if (j < trimmed.length && (isValidPianoChar(trimmed[j]) || trimmed[j] === "[" || trimmed[j] === "{")) {
              extraDelay = fastDelayMs;
            }

            let spaceCount = 0;
            while (j < trimmed.length) {
              const nextC = trimmed[j];
              if (nextC === " ") {
                spaceCount++;
                j++;
              } else if (nextC === "-" || nextC === "~") {
                extraDelay += restDelayMs;
                j++;
              } else if (nextC === "|") {
                extraDelay += barDelayMs;
                j++;
              } else {
                break;
              }
            }

            if (spaceCount > 1) {
              extraDelay += (spaceCount - 1) * restDelayMs;
            }

            events.push({
              display: `[${chordKeys.join("")}]`,
              keys: chordKeys,
              is_chord: true,
              delay_after_ms: extraDelay,
              line_number: lineIdx,
            });

            i = j;
            continue;
          }
          i = closeIdx + 1;
          continue;
        }
      }

      if (char === " ") {
        if (events.length > 0) {
          events[events.length - 1].delay_after_ms += restDelayMs;
        }
        i++;
        continue;
      }

      if (char === "|") {
        if (events.length > 0) {
          events[events.length - 1].delay_after_ms += barDelayMs;
        }
        i++;
        continue;
      }

      if (char === "-" || char === "~") {
        if (events.length > 0) {
          events[events.length - 1].delay_after_ms += restDelayMs;
        }
        i++;
        continue;
      }

      if (isValidPianoChar(char)) {
        totalNotes += 1;
        let extraDelay = stepDelayMs;
        let j = i + 1;

        if (j < trimmed.length && (isValidPianoChar(trimmed[j]) || trimmed[j] === "[" || trimmed[j] === "{")) {
          extraDelay = fastDelayMs;
        }

        let spaceCount = 0;
        while (j < trimmed.length) {
          const nextC = trimmed[j];
          if (nextC === " ") {
            spaceCount++;
            j++;
          } else if (nextC === "-" || nextC === "~") {
            extraDelay += restDelayMs;
            j++;
          } else if (nextC === "|") {
            extraDelay += barDelayMs;
            j++;
          } else {
            break;
          }
        }

        if (spaceCount > 1) {
          extraDelay += (spaceCount - 1) * restDelayMs;
        }

        events.push({
          display: char,
          keys: [char],
          is_chord: false,
          delay_after_ms: extraDelay,
          line_number: lineIdx,
        });

        i = j;
        continue;
      }

      i++;
    }

    if (events.length > 0) {
      events[events.length - 1].delay_after_ms += stepDelayMs;
    }
  }

  const totalMs = events.reduce((acc, curr) => acc + curr.delay_after_ms, 0);

  return {
    events,
    total_notes: totalNotes,
    estimated_duration_sec: Math.round((totalMs / 1000) * 10) / 10,
  };
}

export function isValidPianoChar(c: string): boolean {
  if (c.length !== 1) return false;
  return /^[a-zA-Z0-9!@#$%^&*()]$/.test(c);
}
