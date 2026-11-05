export interface ParsedAudioName {
  title: string;
  artist: string;
  track?: string;
  isLikelyInstrumentalOrRemix: boolean;
  detectedReason?: 'remix' | 'instrumental' | 'dj_mix' | 'other';
}

/**
 * Extracts artist, title, and remix/instrumental hints from audio filename and folder
 */
export function parseAudioFilename(filename: string, folderName: string = ''): ParsedAudioName {
  // Remove file extension
  const base = filename.replace(/\.[a-zA-Z0-9]+$/, '').trim();

  // Check for common remix / instrumental indicators
  const lower = base.toLowerCase();
  let isLikely = false;
  let detectedReason: 'remix' | 'instrumental' | 'dj_mix' | 'other' | undefined;

  if (
    lower.includes('instrumental') ||
    lower.includes('karaoke version') ||
    lower.includes('backing track') ||
    lower.includes('no vocals') ||
    lower.includes('playalong')
  ) {
    isLikely = true;
    detectedReason = 'instrumental';
  } else if (
    lower.includes('remix') ||
    lower.includes('club mix') ||
    lower.includes('extended mix') ||
    lower.includes('dub mix') ||
    lower.includes('vip mix') ||
    lower.includes('rework') ||
    lower.includes('bootleg')
  ) {
    isLikely = true;
    detectedReason = 'remix';
  } else if (
    lower.includes('continuous mix') ||
    lower.includes('dj set') ||
    lower.includes('megamix')
  ) {
    isLikely = true;
    detectedReason = 'dj_mix';
  }

  // Common pattern 1: "01. Artist - Title" or "01 - Artist - Title"
  const trackArtistTitle = base.match(/^(\d{1,3})[\s._-]+([^-]+)-[\s]+(.+)$/);
  if (trackArtistTitle) {
    return {
      track: trackArtistTitle[1],
      artist: cleanString(trackArtistTitle[2]),
      title: cleanString(trackArtistTitle[3]),
      isLikelyInstrumentalOrRemix: isLikely,
      detectedReason,
    };
  }

  // Common pattern 2: "Artist - Title"
  const artistTitle = base.match(/^([^-]+)-[\s]+(.+)$/);
  if (artistTitle) {
    return {
      artist: cleanString(artistTitle[1]),
      title: cleanString(artistTitle[2]),
      isLikelyInstrumentalOrRemix: isLikely,
      detectedReason,
    };
  }

  // Common pattern 3: "01 - Title" or "01. Title"
  const trackTitle = base.match(/^(\d{1,3})[\s._-]+(.+)$/);
  if (trackTitle) {
    return {
      track: trackTitle[1],
      artist: folderName ? cleanString(folderName.split('/')[0] || '') : 'Unbekannter Interpret',
      title: cleanString(trackTitle[2]),
      isLikelyInstrumentalOrRemix: isLikely,
      detectedReason,
    };
  }

  // Fallback: title is base filename, artist from folder if available
  return {
    artist: folderName ? cleanString(folderName.split('/')[0] || '') : 'Unbekannt',
    title: cleanString(base),
    isLikelyInstrumentalOrRemix: isLikely,
    detectedReason,
  };
}

function cleanString(str: string): string {
  return str
    .replace(/^\[.*?\]\s*/, '') // Remove prefix brackets like [HQ]
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
