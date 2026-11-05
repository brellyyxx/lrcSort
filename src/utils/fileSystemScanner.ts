import { SongFile } from '../types';
import { parseAudioFilename } from './audioMetadata';
import { getIgnoredMap, getCustomLrcMap } from '../services/storageService';

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.m4a', '.ogg', '.opus', '.wav', '.aac', '.wma'];

/**
 * Scans a folder recursively using the File System Access API (showDirectoryPicker)
 */
export async function scanDirectoryWithHandle(
  directoryHandle: any,
  onProgress?: (count: number, currentFolder: string) => void
): Promise<SongFile[]> {
  const audioEntries: Array<{
    name: string;
    path: string;
    folder: string;
    extension: string;
    fileHandle: any;
    parentHandle: any;
  }> = [];

  const lrcEntries: Map<string, { handle: any; name: string }> = new Map();

  async function traverse(handle: any, currentPath: string) {
    if (onProgress) {
      onProgress(audioEntries.length, currentPath || 'Root');
    }

    for await (const [name, entry] of handle.entries()) {
      if (entry.kind === 'directory') {
        const subPath = currentPath ? `${currentPath}/${name}` : name;
        await traverse(entry, subPath);
      } else if (entry.kind === 'file') {
        const lowerName = name.toLowerCase();
        const ext = '.' + lowerName.split('.').pop();

        if (AUDIO_EXTENSIONS.includes(ext)) {
          audioEntries.push({
            name,
            path: currentPath ? `${currentPath}/${name}` : name,
            folder: currentPath || 'Root',
            extension: ext,
            fileHandle: entry,
            parentHandle: handle,
          });
        } else if (lowerName.endsWith('.lrc')) {
          // Normalize key: folder + base filename without .lrc
          const baseName = name.replace(/\.lrc$/i, '').trim().toLowerCase();
          const key = currentPath ? `${currentPath}/${baseName}` : baseName;
          lrcEntries.set(key, { handle: entry, name });
        }
      }
    }
  }

  await traverse(directoryHandle, '');

  const ignoredMap = getIgnoredMap();
  const customLrcMap = getCustomLrcMap();
  const songs: SongFile[] = [];

  for (const item of audioEntries) {
    const baseName = item.name.replace(/\.[a-zA-Z0-9]+$/, '').trim().toLowerCase();
    const lrcKey = item.folder !== 'Root' ? `${item.folder}/${baseName}` : baseName;

    // Check if matching LRC exists
    const matchingLrc = lrcEntries.get(lrcKey);
    let hasLrc = !!matchingLrc;
    let lrcFileName = matchingLrc ? matchingLrc.name : undefined;
    let lrcContent: string | undefined;

    if (matchingLrc) {
      try {
        const file = await matchingLrc.handle.getFile();
        lrcContent = await file.text();
      } catch (err) {
        console.warn('Could not read LRC file content', err);
      }
    } else if (customLrcMap[item.path]) {
      hasLrc = true;
      lrcContent = customLrcMap[item.path];
    }

    // Parse audio metadata
    const parsed = parseAudioFilename(item.name, item.folder);
    const ignoredRecord = ignoredMap[item.path] || ignoredMap[`${parsed.artist}_${parsed.title}`];

    const isNoLyrics = ignoredRecord ? ignoredRecord.isNoLyrics : false;
    const noLyricsReason = ignoredRecord?.reason || (parsed.isLikelyInstrumentalOrRemix ? parsed.detectedReason : undefined);

    songs.push({
      id: item.path,
      name: item.name,
      title: parsed.title,
      artist: parsed.artist,
      album: item.folder !== 'Root' ? item.folder.split('/').pop() : undefined,
      path: item.path,
      folder: item.folder,
      extension: item.extension,
      hasLrc,
      lrcFileName,
      lrcContent,
      isNoLyrics,
      noLyricsReason,
      fileHandle: item.fileHandle,
      lrcFileHandle: matchingLrc?.handle,
      folderHandle: item.parentHandle,
      updatedAt: Date.now(),
    });
  }

  return songs;
}

/**
 * Scans an array of File objects from a <input type="file" webkitdirectory />
 */
export function scanFilesFromInput(fileList: FileList): SongFile[] {
  const ignoredMap = getIgnoredMap();
  const customLrcMap = getCustomLrcMap();

  const audioFiles: File[] = [];
  const lrcFilesMap: Map<string, File> = new Map();

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const path = file.webkitRelativePath || file.name;
    const lower = path.toLowerCase();
    const ext = '.' + lower.split('.').pop();

    if (AUDIO_EXTENSIONS.includes(ext)) {
      audioFiles.push(file);
    } else if (lower.endsWith('.lrc')) {
      const baseKey = path.replace(/\.lrc$/i, '').trim().toLowerCase();
      lrcFilesMap.set(baseKey, file);
    }
  }

  const songs: SongFile[] = [];

  for (const file of audioFiles) {
    const fullPath = file.webkitRelativePath || file.name;
    const parts = fullPath.split('/');
    const filename = parts.pop() || file.name;
    const folder = parts.length > 0 ? parts.join('/') : 'Root';

    const baseKey = fullPath.replace(/\.[a-zA-Z0-9]+$/, '').trim().toLowerCase();
    const matchingLrc = lrcFilesMap.get(baseKey);

    const hasLrc = !!matchingLrc || !!customLrcMap[fullPath];
    const parsed = parseAudioFilename(filename, folder);

    const ignoredRecord = ignoredMap[fullPath] || ignoredMap[`${parsed.artist}_${parsed.title}`];

    songs.push({
      id: fullPath,
      name: filename,
      title: parsed.title,
      artist: parsed.artist,
      album: parts.length > 0 ? parts[parts.length - 1] : undefined,
      path: fullPath,
      folder,
      extension: '.' + filename.split('.').pop()?.toLowerCase(),
      size: file.size,
      hasLrc,
      lrcFileName: matchingLrc ? matchingLrc.name : undefined,
      isNoLyrics: ignoredRecord ? ignoredRecord.isNoLyrics : false,
      noLyricsReason: ignoredRecord?.reason || (parsed.isLikelyInstrumentalOrRemix ? parsed.detectedReason : undefined),
      fileObj: file,
      updatedAt: Date.now(),
    });
  }

  return songs;
}

/**
 * Writes or downloads an LRC file for a song with 1-to-1 exact filename match
 */
export async function saveLrcForSong(
  song: SongFile,
  lrcContent: string,
  rootDirHandle?: any
): Promise<boolean> {
  const lrcName = song.name.replace(/\.[a-zA-Z0-9]+$/, '.lrc');

  // 1. Try song.folderHandle if available directly
  if (song.folderHandle && typeof song.folderHandle.getFileHandle === 'function') {
    try {
      const fileHandle = await song.folderHandle.getFileHandle(lrcName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(lrcContent);
      await writable.close();
      return true;
    } catch (err) {
      console.warn('Direct write via song.folderHandle failed, trying rootHandle:', err);
    }
  }

  // 2. Try rootDirHandle (navigating into song.folder subdirectories)
  if (rootDirHandle && typeof rootDirHandle.getDirectoryHandle === 'function') {
    try {
      let targetHandle = rootDirHandle;
      if (song.folder && song.folder !== 'Root' && song.folder !== '.') {
        const parts = song.folder.split('/').filter((p) => p.length > 0);
        for (const part of parts) {
          targetHandle = await targetHandle.getDirectoryHandle(part, { create: true });
        }
      }
      const fileHandle = await targetHandle.getFileHandle(lrcName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(lrcContent);
      await writable.close();
      return true;
    } catch (err) {
      console.warn('Traversal via rootDirHandle failed, falling back to download:', err);
    }
  }

  // 3. Fallback: trigger a browser download of the .lrc file with 1-to-1 exact matching name
  try {
    const blob = new Blob([lrcContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lrcName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Download failed:', err);
    return false;
  }
}

/**
 * Loads realistic demo music collection
 */
export function getDemoMusicLibrary(): SongFile[] {
  const ignoredMap = getIgnoredMap();

  const demoList: Array<{
    name: string;
    artist: string;
    title: string;
    album: string;
    folder: string;
    ext: string;
    hasLrc: boolean;
    lrcContent?: string;
    isNoLyrics?: boolean;
    noLyricsReason?: 'remix' | 'instrumental' | 'dj_mix' | 'soundtrack' | 'other';
  }> = [
    {
      name: '01 - Bohemian Rhapsody.flac',
      artist: 'Queen',
      title: 'Bohemian Rhapsody',
      album: 'A Night at the Opera (1975)',
      folder: 'Queen/A Night at the Opera',
      ext: '.flac',
      hasLrc: true,
      lrcContent: `[ti:Bohemian Rhapsody]
[ar:Queen]
[al:A Night at the Opera]
[00:00.85]Is this the real life?
[00:04.12]Is this just fantasy?
[00:08.35]Caught in a landslide, no escape from reality
[00:15.90]Open your eyes, look up to the skies and see
[00:23.70]I'm just a poor boy, I need no sympathy
[00:30.50]Because I'm easy come, easy go, little high, little low
[00:38.20]Any way the wind blows doesn't really matter to me, to me
[00:54.40]Mama, just killed a man
[01:00.15]Put a gun against his head, pulled my trigger, now he's dead
[01:08.80]Mama, life had just begun
[01:14.20]But now I've gone and thrown it all away`,
    },
    {
      name: '02 - Hotel California.mp3',
      artist: 'Eagles',
      title: 'Hotel California',
      album: 'Hotel California',
      folder: 'Eagles/Hotel California',
      ext: '.mp3',
      hasLrc: true,
      lrcContent: `[ti:Hotel California]
[ar:Eagles]
[00:10.20]On a dark desert highway, cool wind in my hair
[00:16.80]Warm smell of colitas, rising up through the air
[00:23.10]Up ahead in the distance, I saw a shimmering light
[00:29.50]My head grew heavy and my sight grew dim, I had to stop for the night
[00:36.20]There she stood in the doorway; I heard the mission bell
[00:42.50]And I was thinking to myself, "This could be Heaven or this could be Hell"`,
    },
    {
      name: '03 - Harder Better Faster Stronger (Deadmau5 Remix).mp3',
      artist: 'Daft Punk',
      title: 'Harder Better Faster Stronger (Deadmau5 Club Rework)',
      album: 'Discovery Remixed',
      folder: 'Daft Punk/Remixes',
      ext: '.mp3',
      hasLrc: false,
      isNoLyrics: true,
      noLyricsReason: 'remix',
    },
    {
      name: '04 - Time (Inception Soundtrack).flac',
      artist: 'Hans Zimmer',
      title: 'Time [Original Instrumental]',
      album: 'Inception (Music from the Motion Picture)',
      folder: 'Hans Zimmer/Inception OST',
      ext: '.flac',
      hasLrc: false,
      isNoLyrics: true,
      noLyricsReason: 'instrumental',
    },
    {
      name: '05 - Lose Yourself.m4a',
      artist: 'Eminem',
      title: 'Lose Yourself',
      album: '8 Mile Soundtrack',
      folder: 'Eminem/8 Mile',
      ext: '.m4a',
      hasLrc: false,
    },
    {
      name: '06 - Blinding Lights.flac',
      artist: 'The Weeknd',
      title: 'Blinding Lights',
      album: 'After Hours',
      folder: 'The Weeknd/After Hours',
      ext: '.flac',
      hasLrc: true,
      lrcContent: `[ti:Blinding Lights]
[ar:The Weeknd]
[00:00.00]Yeah
[00:08.50]I've been tryna call
[00:11.80]I've been on my own for long enough
[00:17.20]Maybe you can show me how to love, maybe
[00:25.10]I'm going through withdrawals
[00:28.40]You don't even have to do too much
[00:33.80]You can turn me on with just a touch, baby`,
    },
    {
      name: '07 - Around the World (Continuous DJ Mix).mp3',
      artist: 'Daft Punk',
      title: 'Around the World (Live DJ Megamix)',
      album: 'Alive 2007',
      folder: 'Daft Punk/Alive 2007',
      ext: '.mp3',
      hasLrc: false,
      isNoLyrics: true,
      noLyricsReason: 'dj_mix',
    },
    {
      name: '08 - Rolling in the Deep.flac',
      artist: 'Adele',
      title: 'Rolling in the Deep',
      album: '21',
      folder: 'Adele/21',
      ext: '.flac',
      hasLrc: false,
    },
    {
      name: '09 - Smells Like Teen Spirit.mp3',
      artist: 'Nirvana',
      title: 'Smells Like Teen Spirit',
      album: 'Nevermind',
      folder: 'Nirvana/Nevermind',
      ext: '.mp3',
      hasLrc: false,
    },
    {
      name: '10 - Comfortably Numb.flac',
      artist: 'Pink Floyd',
      title: 'Comfortably Numb',
      album: 'The Wall',
      folder: 'Pink Floyd/The Wall',
      ext: '.flac',
      hasLrc: true,
      lrcContent: `[ti:Comfortably Numb]
[ar:Pink Floyd]
[00:00.00]Hello? (Hello? Hello? Hello?)
[00:03.50]Is there anybody in there?
[00:06.80]Just nod if you can hear me
[00:10.50]Is there anyone home?
[00:15.50]Come on now
[00:18.20]I hear you're feeling down
[00:21.80]Well I can ease your pain
[00:25.50]Get you on your feet again`,
    },
    {
      name: '11 - Clair de Lune.flac',
      artist: 'Claude Debussy',
      title: 'Clair de Lune, L. 75 [Klavier solo]',
      album: 'Suite bergamasque',
      folder: 'Classical/Debussy',
      ext: '.flac',
      hasLrc: false,
      isNoLyrics: true,
      noLyricsReason: 'instrumental',
    },
    {
      name: '12 - Sweet Child O Mine.mp3',
      artist: "Guns N' Roses",
      title: "Sweet Child O' Mine",
      album: 'Appetite for Destruction',
      folder: "Guns N' Roses/Appetite",
      ext: '.mp3',
      hasLrc: false,
    },
    {
      name: '13 - Billie Jean.flac',
      artist: 'Michael Jackson',
      title: 'Billie Jean',
      album: 'Thriller',
      folder: 'Michael Jackson/Thriller',
      ext: '.flac',
      hasLrc: true,
      lrcContent: `[ti:Billie Jean]
[ar:Michael Jackson]
[00:10.00]She was more like a beauty queen from a movie scene
[00:15.50]I said don't mind, but what do you mean, I am the one
[00:20.00]Who will dance on the floor in the round?
[00:26.50]She said I am the one, who will dance on the floor in the round`,
    },
    {
      name: '14 - Get Lucky.mp3',
      artist: 'Daft Punk feat. Pharrell Williams',
      title: 'Get Lucky',
      album: 'Random Access Memories',
      folder: 'Daft Punk/Random Access Memories',
      ext: '.mp3',
      hasLrc: false,
    },
    {
      name: '15 - Midnight City.opus',
      artist: 'M83',
      title: 'Midnight City',
      album: 'Hurry Up, We\'re Dreaming',
      folder: 'M83/Hurry Up',
      ext: '.opus',
      hasLrc: false,
    },
    {
      name: '16 - Windowlicker (Acid Dub Mix).wav',
      artist: 'Aphex Twin',
      title: 'Windowlicker (Acid Dub Tool)',
      album: 'Windowlicker EP',
      folder: 'Aphex Twin/EPs',
      ext: '.wav',
      hasLrc: false,
      isNoLyrics: true,
      noLyricsReason: 'remix',
    },
    {
      name: '17 - Starboy.flac',
      artist: 'The Weeknd feat. Daft Punk',
      title: 'Starboy',
      album: 'Starboy',
      folder: 'The Weeknd/Starboy',
      ext: '.flac',
      hasLrc: false,
    },
    {
      name: '18 - Titanium.mp3',
      artist: 'David Guetta feat. Sia',
      title: 'Titanium',
      album: 'Nothing but the Beat',
      folder: 'David Guetta/Nothing but the Beat',
      ext: '.mp3',
      hasLrc: true,
      lrcContent: `[ti:Titanium]
[ar:David Guetta feat. Sia]
[00:07.50]You shout it out, but I can't hear a word you say
[00:14.20]I'm talking loud, not saying much
[00:22.00]I'm criticized, but all your bullets ricochet
[00:29.50]Shoot me down, but I get up`,
    },
    {
      name: '19 - Interstellar Main Theme.flac',
      artist: 'Hans Zimmer',
      title: 'First Step / Day One [Instrumental Score]',
      album: 'Interstellar OST',
      folder: 'Soundtracks/Interstellar',
      ext: '.flac',
      hasLrc: false,
      isNoLyrics: true,
      noLyricsReason: 'soundtrack',
    },
    {
      name: '20 - Numb.mp3',
      artist: 'Linkin Park',
      title: 'Numb',
      album: 'Meteora',
      folder: 'Linkin Park/Meteora',
      ext: '.mp3',
      hasLrc: false,
    },
  ];

  return demoList.map((item, idx) => {
    const fullPath = `smb://192.168.1.100/Musik/${item.folder}/${item.name}`;
    const ignoredRecord = ignoredMap[fullPath] || ignoredMap[`${item.artist}_${item.title}`];

    return {
      id: `demo_${idx}_${item.name}`,
      name: item.name,
      title: item.title,
      artist: item.artist,
      album: item.album,
      folder: item.folder,
      path: fullPath,
      extension: item.ext,
      hasLrc: item.hasLrc,
      lrcFileName: item.hasLrc ? item.name.replace(/\.[a-zA-Z0-9]+$/, '.lrc') : undefined,
      lrcContent: item.lrcContent,
      isNoLyrics: ignoredRecord ? ignoredRecord.isNoLyrics : !!item.isNoLyrics,
      noLyricsReason: ignoredRecord?.reason || item.noLyricsReason,
      updatedAt: Date.now(),
    };
  });
}
