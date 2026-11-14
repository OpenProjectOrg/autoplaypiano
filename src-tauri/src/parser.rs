use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteEvent {
    pub display: String,
    pub keys: Vec<char>,
    pub is_chord: bool,
    pub delay_after_ms: u64,
    pub line_number: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SheetParseResult {
    pub events: Vec<NoteEvent>,
    pub total_notes: usize,
    pub estimated_duration_sec: f64,
}

pub fn parse_virtual_piano_sheet(raw_content: &str, bpm: u32) -> SheetParseResult {
    let mut events = Vec::new();
    let mut total_notes = 0;

    // Standard Virtual Piano & PlayPianoSheets timing calibration
    // At 120 BPM, standard quarter note = 500ms.
    // Standard Roblox / PlayPianoSheets notes (like Golden Hour arpeggios) flow at 1/4 or 1/3 of a beat (~125ms-145ms).
    let safe_bpm = bpm.clamp(40, 300);
    let quarter_note_ms = 60_000.0 / (safe_bpm as f64);
    
    // Normal step delay between notes separated by single space or consecutive
    let step_delay_ms = ((quarter_note_ms / 4.0) * 1.15).round() as u64; // ~144ms at 120 BPM
    let fast_delay_ms = (step_delay_ms as f64 * 0.65).round() as u64;    // ~94ms for unspaced runs
    let rest_delay_ms = step_delay_ms;                                    // for hyphens '-'
    let bar_delay_ms = (quarter_note_ms * 0.75).round() as u64;          // for '|' measure breaks

    let mut line_idx = 0usize;
    for line in raw_content.lines() {
        line_idx += 1;
        let trimmed = line.trim();
        if trimmed.starts_with('#') || trimmed.starts_with("//") {
            continue;
        }

        let mut chars = trimmed.chars().peekable();
        while let Some(&c) = chars.peek() {
            match c {
                '[' | '{' => {
                    chars.next(); // consume opening bracket
                    let close_char = if c == '[' { ']' } else { '}' };
                    let mut chord_keys = Vec::new();

                    while let Some(&ch) = chars.peek() {
                        if ch == close_char {
                            chars.next(); // consume closing bracket
                            break;
                        }
                        if is_valid_piano_key(ch) {
                            chord_keys.push(ch);
                        }
                        chars.next();
                    }

                    if !chord_keys.is_empty() {
                        total_notes += chord_keys.len();
                        let display_str = format!("[{}]", chord_keys.iter().collect::<String>());

                        // Determine delay after chord
                        let mut extra_delay = step_delay_ms;
                        let mut space_count = 0;

                        // Check if immediately followed by another character without spaces
                        if let Some(&next_c) = chars.peek() {
                            if is_valid_piano_key(next_c) || next_c == '[' || next_c == '{' {
                                extra_delay = fast_delay_ms;
                            }
                        }

                        while let Some(&next_c) = chars.peek() {
                            if next_c == ' ' {
                                space_count += 1;
                                chars.next();
                            } else if next_c == '-' || next_c == '~' {
                                extra_delay += rest_delay_ms;
                                chars.next();
                            } else if next_c == '|' {
                                extra_delay += bar_delay_ms;
                                chars.next();
                            } else {
                                break;
                            }
                        }

                        // Only extra spaces beyond the first separator add extra pause
                        if space_count > 1 {
                            extra_delay += rest_delay_ms * ((space_count - 1) as u64);
                        }

                        events.push(NoteEvent {
                            display: display_str,
                            keys: chord_keys,
                            is_chord: true,
                            delay_after_ms: extra_delay,
                            line_number: line_idx,
                        });
                    }
                }
                ' ' => {
                    chars.next();
                    if let Some(last) = events.last_mut() {
                        last.delay_after_ms += rest_delay_ms;
                    }
                }
                '|' => {
                    chars.next();
                    if let Some(last) = events.last_mut() {
                        last.delay_after_ms += bar_delay_ms;
                    }
                }
                '-' | '~' => {
                    chars.next();
                    if let Some(last) = events.last_mut() {
                        last.delay_after_ms += rest_delay_ms;
                    }
                }
                _ => {
                    chars.next();
                    if is_valid_piano_key(c) {
                        total_notes += 1;
                        let mut extra_delay = step_delay_ms;
                        let mut space_count = 0;

                        // Check if immediately followed by another character without spaces
                        if let Some(&next_c) = chars.peek() {
                            if is_valid_piano_key(next_c) || next_c == '[' || next_c == '{' {
                                extra_delay = fast_delay_ms;
                            }
                        }

                        while let Some(&next_c) = chars.peek() {
                            if next_c == ' ' {
                                space_count += 1;
                                chars.next();
                            } else if next_c == '-' || next_c == '~' {
                                extra_delay += rest_delay_ms;
                                chars.next();
                            } else if next_c == '|' {
                                extra_delay += bar_delay_ms;
                                chars.next();
                            } else {
                                break;
                            }
                        }

                        // Only extra spaces beyond the first separator add extra pause
                        if space_count > 1 {
                            extra_delay += rest_delay_ms * ((space_count - 1) as u64);
                        }

                        events.push(NoteEvent {
                            display: c.to_string(),
                            keys: vec![c],
                            is_chord: false,
                            delay_after_ms: extra_delay,
                            line_number: line_idx,
                        });
                    }
                }
            }
        }

        // Natural pause at phrase / line end
        if let Some(last) = events.last_mut() {
            last.delay_after_ms += step_delay_ms;
        }
    }

    let total_ms: u64 = events.iter().map(|e| e.delay_after_ms).sum();
    let estimated_duration_sec = (total_ms as f64) / 1000.0;

    SheetParseResult {
        events,
        total_notes,
        estimated_duration_sec,
    }
}

pub fn is_valid_piano_key(c: char) -> bool {
    c.is_ascii_alphanumeric()
        || matches!(
            c,
            '!' | '@' | '#' | '$' | '%' | '^' | '&' | '*' | '(' | ')'
        )
}
