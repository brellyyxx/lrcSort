import { LyricsLine } from '../types';

/**
 * Parses raw LRC string into an array of timed lines
 * Example format: [01:23.45] Some lyrics text
 */
export function parseLrc(lrcText: string): LyricsLine[] {
  if (!lrcText) return [];

  const lines = lrcText.split(/\r?\n/);
  const result: LyricsLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip metadata headers like [ti:...], [ar:...], [al:...]
    if (/^\[(ti|ar|al|by|offset|length):/i.test(trimmed)) {
      continue;
    }

    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length > 0) {
      const text = trimmed.replace(timeRegex, '').trim();
      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const fractionStr = match[3] || '0';
        const fraction = fractionStr.length === 3 ? parseInt(fractionStr, 10) / 1000 : parseInt(fractionStr, 10) / 100;
        const totalSeconds = minutes * 60 + seconds + fraction;

        result.push({
          time: totalSeconds,
          timestamp: `${match[1]}:${match[2]}.${fractionStr}`,
          text,
        });
      }
    }
  }

  // Sort by time ascending
  return result.sort((a, b) => a.time - b.time);
}

/**
 * Formats seconds into [mm:ss.xx]
 */
export function formatLrcTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

/**
 * Converts LyricsLine[] back to pure clean LRC formatted string without metadata headers
 */
export function stringifyLrc(lines: LyricsLine[]): string {
  return lines
    .filter(line => line.text !== undefined && line.text !== null)
    .sort((a, b) => a.time - b.time)
    .map(line => `[${formatLrcTime(line.time)}] ${line.text}`)
    .join('\n');
}

/**
 * Adjusts all timestamps in an LRC string by an offset (in seconds)
 */
export function adjustLrcOffset(lrcText: string, offsetSec: number): string {
  const parsed = parseLrc(lrcText);
  const adjusted = parsed.map(line => ({
    ...line,
    time: Math.max(0, line.time + offsetSec),
    timestamp: formatLrcTime(Math.max(0, line.time + offsetSec)),
  }));
  return stringifyLrc(adjusted);
}
