/**
 * Utility and service to fetch and cleanly strip Genius / song lyrics
 */

/**
 * Strips all verse, chorus, bridge, intro, outro, and bracketed headers from lyrics,
 * leaving pure clean text ready for LRC syncing.
 */
export function cleanGeniusLyrics(rawText: string): string {
  if (!rawText) return '';

  const lines = rawText.split(/\r?\n/);
  const cleanedLines: string[] = [];

  // Regex to detect Genius / lyrics section headers
  // e.g. [Verse 1], [Verse 1: Drake], [Chorus], [Pre-Chorus], [Refrain], [Bridge], [Intro], [Outro], [Hook], [Strophe 1], [Songtext zu ...]
  const sectionHeaderRegex = /^\s*(\[|\()(?:\s*(?:verse|chorus|refrain|hook|bridge|intro|outro|pre-chorus|post-chorus|strophe|couplet|part|drop|breakdown|interlude|skit|spoken|guitar solo|instrumental|produced by|songtext|paroles).*?|.*?(?:verse|chorus|refrain|hook|bridge|intro|outro|strophe|part\s*\d+).*?)(\]|\))\s*$/i;

  // Generic bracket-only line if it looks like a section tag (e.g. [Beat switch], [Producer tag])
  const bracketOnlyLineRegex = /^\s*\[[A-Za-z0-9\s:,'"-]{2,40}\]\s*$/;

  // Genius site artifacts to strip
  const geniusArtifacts = [
    /^\s*\d+\s+contributors?\s*$/i,
    /^\s*translations\s*$/i,
    /^\s*embed\s*$/i,
    /^\s*you might also like\s*$/i,
    /^\s*see .+ live\s*$/i,
    /^\s*get tickets as low as\s*$/i,
    /^\s*lyrics for this song have yet to be released\s*$/i,
  ];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Check if line is empty
    if (!trimmed) {
      // Avoid multiple consecutive empty lines
      if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] !== '') {
        cleanedLines.push('');
      }
      continue;
    }

    // Check for Genius artifacts
    if (geniusArtifacts.some((pattern) => pattern.test(trimmed))) {
      continue;
    }

    // Check for section headers like [Verse 1], [Chorus], etc.
    if (sectionHeaderRegex.test(trimmed) || bracketOnlyLineRegex.test(trimmed)) {
      continue;
    }

    // Also strip inline bracketed chorus markers if the line only starts with them
    const strippedInline = trimmed
      .replace(/^\[(verse|chorus|refrain|hook|bridge|intro|outro|strophe).*?\]\s*/i, '')
      .trim();

    if (strippedInline) {
      cleanedLines.push(strippedInline);
    }
  }

  // Remove leading and trailing empty lines
  while (cleanedLines.length > 0 && cleanedLines[0] === '') {
    cleanedLines.shift();
  }
  while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === '') {
    cleanedLines.pop();
  }

  return cleanedLines.join('\n');
}

/**
 * Searches and fetches lyrics from lyrics APIs (lyrics.ovh and LRCLIB plain text)
 * and applies cleanGeniusLyrics automatically.
 */
export async function fetchCleanLyrics(query: {
  title: string;
  artist?: string;
}): Promise<{ lyrics: string; source: string } | null> {
  const { title, artist } = query;
  if (!title.trim()) return null;

  const cleanTitle = title.replace(/\.[a-zA-Z0-9]+$/, '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
  const cleanArtist = (artist || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();

  // Attempt 1: lyrics.ovh (clean direct lyrics)
  if (cleanArtist && cleanTitle && cleanArtist !== 'Unbekannt' && cleanArtist !== 'Unbekannter Interpret') {
    try {
      const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.lyrics && data.lyrics.trim().length > 20) {
          return {
            lyrics: cleanGeniusLyrics(data.lyrics),
            source: 'Genius / Lyrics Database',
          };
        }
      }
    } catch (e) {
      console.warn('lyrics.ovh fetch failed, falling back:', e);
    }
  }

  // Attempt 2: LRCLIB search for plainLyrics
  try {
    const params = new URLSearchParams();
    params.append('track_name', cleanTitle);
    if (cleanArtist && cleanArtist !== 'Unbekannt') {
      params.append('artist_name', cleanArtist);
    }

    const res = await fetch(`https://lrclib.net/api/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        for (const item of data) {
          if (item.plainLyrics && item.plainLyrics.trim().length > 20) {
            return {
              lyrics: cleanGeniusLyrics(item.plainLyrics),
              source: 'LRCLIB / Genius Mirror',
            };
          }
          if (item.syncedLyrics && item.syncedLyrics.trim().length > 20) {
            // Convert synced lyrics to plain text and clean
            const plainFromSynced = item.syncedLyrics
              .split(/\r?\n/)
              .map((l: string) => l.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim())
              .filter((l: string) => l.length > 0)
              .join('\n');

            return {
              lyrics: cleanGeniusLyrics(plainFromSynced),
              source: 'LRCLIB Synced Text',
            };
          }
        }
      }
    }
  } catch (e) {
    console.warn('LRCLIB plain fetch failed:', e);
  }

  return null;
}
