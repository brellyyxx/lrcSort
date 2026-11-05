/**
 * Generates an in-memory playable audio file (WAV Blob) with a rhythmic drum & chord beat
 * so users can hear sound even if they haven't loaded a local MP3/FLAC file yet.
 */
export function generateDemoAudioTrack(durationSeconds: number = 180, bpm: number = 115): File {
  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new Float32Array(totalSamples);

  const secondsPerBeat = 60 / bpm;
  const samplesPerBeat = Math.floor(sampleRate * secondsPerBeat);

  // Simple chord frequencies (Am - F - C - G)
  const chordProgression = [
    [220.0, 261.63, 329.63], // Am
    [174.61, 220.0, 261.63], // F
    [261.63, 329.63, 392.0], // C
    [196.0, 246.94, 293.66], // G
  ];

  // Synthesize rhythmic beat + melodic chords
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beatIndex = Math.floor(i / samplesPerBeat);
    const sampleInBeat = i % samplesPerBeat;
    const beatFraction = sampleInBeat / samplesPerBeat;

    let sample = 0;

    // 1. Kick drum on beats 0 and 2 (4/4 time)
    if (beatIndex % 4 === 0 || beatIndex % 4 === 2) {
      if (beatFraction < 0.25) {
        const kickEnv = Math.exp(-beatFraction * 24);
        const kickFreq = 140 * Math.exp(-beatFraction * 18) + 45;
        sample += Math.sin(2 * Math.PI * kickFreq * t) * kickEnv * 0.6;
      }
    }

    // 2. Snare / Clap on beats 1 and 3
    if (beatIndex % 4 === 1 || beatIndex % 4 === 3) {
      if (beatFraction < 0.2) {
        const snareEnv = Math.exp(-beatFraction * 20);
        const noise = (Math.random() * 2 - 1) * 0.35;
        const tone = Math.sin(2 * Math.PI * 220 * t) * 0.25;
        sample += (noise + tone) * snareEnv * 0.5;
      }
    }

    // 3. Hi-hat every eighth note
    const eighthIndex = Math.floor(i / (samplesPerBeat / 2));
    const eighthFraction = (i % Math.floor(samplesPerBeat / 2)) / (samplesPerBeat / 2);
    if (eighthFraction < 0.08) {
      const hatEnv = Math.exp(-eighthFraction * 40);
      sample += (Math.random() * 2 - 1) * hatEnv * 0.15;
    }

    // 4. Melodic chord pad
    const barIndex = Math.floor(beatIndex / 4);
    const currentChord = chordProgression[barIndex % chordProgression.length];
    for (const freq of currentChord) {
      const vibrato = 1 + 0.003 * Math.sin(2 * Math.PI * 4 * t);
      sample += Math.sin(2 * Math.PI * freq * vibrato * t) * 0.07;
    }

    // Clip prevention
    buffer[i] = Math.max(-1, Math.min(1, sample));
  }

  // Convert Float32Array to 16-bit PCM WAV
  const wavBlob = encodeWavPCM(buffer, sampleRate);
  return new File([wavBlob], 'Demo-Rhythmus-Track.wav', { type: 'audio/wav' });
}

function encodeWavPCM(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF Chunk
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt Subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample

  // data Subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}
