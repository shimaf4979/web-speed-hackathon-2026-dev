interface SoundMetadata {
  artist?: string;
  title?: string;
}

function readRiffInfoTag(data: Buffer, tagId: string): string | undefined {
  for (let i = 0; i < data.length - 12; i++) {
    if (
      data[i] === 0x4c &&
      data[i + 1] === 0x49 &&
      data[i + 2] === 0x53 &&
      data[i + 3] === 0x54
    ) {
      const listSize = data.readUInt32LE(i + 4);
      if (
        data[i + 8] === 0x49 &&
        data[i + 9] === 0x4e &&
        data[i + 10] === 0x46 &&
        data[i + 11] === 0x4f
      ) {
        const listEnd = Math.min(i + 8 + listSize, data.length);
        let pos = i + 12;
        while (pos + 8 <= listEnd) {
          const chunkId = data.subarray(pos, pos + 4).toString("ascii");
          const chunkSize = data.readUInt32LE(pos + 4);
          if (chunkId === tagId) {
            let raw = data.subarray(pos + 8, pos + 8 + chunkSize);
            const nullIdx = raw.indexOf(0);
            if (nullIdx >= 0) raw = raw.subarray(0, nullIdx);
            try {
              const decoded = new TextDecoder("shift_jis", { fatal: true }).decode(raw);
              return decoded;
            } catch {
              return raw.toString("utf-8");
            }
          }
          pos += 8 + chunkSize + (chunkSize % 2);
        }
      }
    }
  }
  return undefined;
}

export async function extractMetadataFromSound(data: Buffer): Promise<SoundMetadata> {
  try {
    const title = readRiffInfoTag(data, "INAM");
    const artist = readRiffInfoTag(data, "IART");
    if (title || artist) {
      return { title, artist };
    }

    const MusicMetadata = await import("music-metadata");
    const metadata = await MusicMetadata.parseBuffer(data);
    return {
      artist: metadata.common.artist,
      title: metadata.common.title,
    };
  } catch {
    return {
      artist: undefined,
      title: undefined,
    };
  }
}
