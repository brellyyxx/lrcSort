import { LRCLibResult } from '../types';

const BASE_URL = 'https://lrclib.net/api';

/**
 * Searches LRCLIB for lyrics matching track name and artist name
 */
export async function searchLyrics(query: {
  trackName: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
}): Promise<LRCLibResult[]> {
  try {
    // First attempt: exact search via /search with track_name and artist_name
    const params = new URLSearchParams();
    if (query.trackName) params.append('track_name', query.trackName.trim());
    if (query.artistName && query.artistName !== 'Unbekannt' && query.artistName !== 'Unbekannter Interpret') {
      params.append('artist_name', query.artistName.trim());
    }
    if (query.albumName) params.append('album_name', query.albumName.trim());

    let response = await fetch(`${BASE_URL}/search?${params.toString()}`);
    if (response.ok) {
      const data: LRCLibResult[] = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }

    // Fallback attempt: generalized query search 'q'
    const generalQuery = `${query.artistName ? query.artistName + ' ' : ''}${query.trackName}`.trim();
    if (generalQuery) {
      response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(generalQuery)}`);
      if (response.ok) {
        const data: LRCLibResult[] = await response.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    }

    return [];
  } catch (error) {
    console.error('LRCLIB search error:', error);
    return [];
  }
}

/**
 * Directly attempts to get lyrics for a track if duration is available or exact match
 */
export async function getExactLyrics(query: {
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
}): Promise<LRCLibResult | null> {
  try {
    const params = new URLSearchParams();
    params.append('track_name', query.trackName.trim());
    params.append('artist_name', query.artistName.trim());
    if (query.albumName) params.append('album_name', query.albumName.trim());
    if (query.duration && query.duration > 0) params.append('duration', Math.round(query.duration).toString());

    const response = await fetch(`${BASE_URL}/get?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('LRCLIB getExact error:', error);
    return null;
  }
}
