import { describe, expect, it, vi } from 'vitest';
import {
  collectDataTransferDropSnapshot,
  readDataTransferDrop,
  readDataTransferDropBatches,
  readDataTransferDropFromSnapshot,
} from './readDataTransferEntryFiles';

describe('readDataTransferDrop', () => {
  it('falls back to dataTransfer.files when entries are unavailable', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const dataTransfer = {
      items: [],
      files: [file],
    } as unknown as DataTransfer;

    const drop = await readDataTransferDrop(dataTransfer);
    expect(drop.files).toHaveLength(1);
    expect(drop.files[0]?.name).toBe('photo.jpg');
  });

  it('collects loose files via getAsFile when webkitGetAsEntry is missing', async () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    const dataTransfer = {
      items: [
        {
          kind: 'file',
          webkitGetAsEntry: undefined,
          getAsFile: () => file,
        },
      ],
      files: [],
    } as unknown as DataTransfer;

    const snapshot = collectDataTransferDropSnapshot(dataTransfer);
    expect(snapshot.looseFiles).toHaveLength(1);

    const drop = await readDataTransferDropFromSnapshot(snapshot);
    expect(drop.files[0]?.name).toBe('photo.png');
  });

  it('walks a dropped folder tree and tags relative paths', async () => {
    const photo = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const nested = new File(['y'], 'b.png', { type: 'image/png' });

    const nestedEntry = {
      isFile: true,
      isDirectory: false,
      name: 'b.png',
      file: (ok: (f: File) => void) => ok(nested),
    } as unknown as FileSystemEntry;

    let subdirRead = false;
    const subdirEntry = {
      isFile: false,
      isDirectory: true,
      name: 'nested',
      createReader: () => ({
        readEntries: (ok: (entries: FileSystemEntry[]) => void) => {
          if (!subdirRead) {
            subdirRead = true;
            ok([nestedEntry]);
            return;
          }
          ok([]);
        },
      }),
    } as unknown as FileSystemEntry;

    let rootRead = false;
    const rootEntry = {
      isFile: false,
      isDirectory: true,
      name: 'Hands',
      createReader: () => ({
        readEntries: (ok: (entries: FileSystemEntry[]) => void) => {
          if (!rootRead) {
            rootRead = true;
            ok([
              {
                isFile: true,
                isDirectory: false,
                name: 'a.jpg',
                file: (resolve: (f: File) => void) => resolve(photo),
              } as unknown as FileSystemEntry,
              subdirEntry,
            ]);
            return;
          }
          ok([]);
        },
      }),
    } as unknown as FileSystemEntry;

    const dataTransfer = {
      items: [
        {
          kind: 'file',
          webkitGetAsEntry: () => rootEntry,
        },
      ],
      files: [],
    } as unknown as DataTransfer;

    const snapshot = collectDataTransferDropSnapshot(dataTransfer);
    expect(snapshot.suggestedFolderName).toBe('Hands');

    const drop = await readDataTransferDropFromSnapshot(snapshot);
    expect(drop.files).toHaveLength(2);
    expect((drop.files[0] as File & { webkitRelativePath?: string }).webkitRelativePath).toBe('Hands/a.jpg');
    expect((drop.files[1] as File & { webkitRelativePath?: string }).webkitRelativePath).toBe('Hands/nested/b.png');
  });

  it('snapshots entries synchronously before async traversal', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const getAsEntry = vi.fn(() => ({
      isFile: true,
      isDirectory: false,
      name: 'photo.jpg',
      file: (ok: (f: File) => void) => ok(file),
    }));

    const dataTransfer = {
      items: [{ kind: 'file', webkitGetAsEntry: getAsEntry, getAsFile: () => file }],
      files: [],
    } as unknown as DataTransfer;

    const snapshot = collectDataTransferDropSnapshot(dataTransfer);
    expect(getAsEntry).toHaveBeenCalledTimes(1);

    Object.defineProperty(dataTransfer, 'items', { value: [], configurable: true });

    const drop = await readDataTransferDropFromSnapshot(snapshot);
    expect(drop.files).toHaveLength(1);
  });

  it('returns one batch per dropped directory entry', async () => {
    const makeDir = (name: string, files: File[]) => {
      let read = false;
      return {
        isFile: false,
        isDirectory: true,
        name,
        createReader: () => ({
          readEntries: (ok: (entries: FileSystemEntry[]) => void) => {
            if (read) {
              ok([]);
              return;
            }
            read = true;
            ok(
              files.map((file) => ({
                isFile: true,
                isDirectory: false,
                name: file.name,
                file: (cb: (f: File) => void) => cb(file),
              })) as FileSystemEntry[],
            );
          },
        }),
      } as FileSystemEntry;
    };

    const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const fileB = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    const snapshot = {
      entries: [makeDir('FolderA', [fileA]), makeDir('FolderB', [fileB])],
      looseFiles: [],
      snapshotFiles: [],
      fileItemCount: 2,
    };

    const batches = await readDataTransferDropBatches(snapshot);
    expect(batches).toHaveLength(2);
    expect(batches[0]?.suggestedFolderName).toBe('FolderA');
    expect(batches[1]?.suggestedFolderName).toBe('FolderB');
  });

  it('splits snapshotFiles by top-level webkitRelativePath when items under-report folders', async () => {
    const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const fileB = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileA, 'webkitRelativePath', { value: 'FolderA/a.jpg', configurable: true });
    Object.defineProperty(fileB, 'webkitRelativePath', { value: 'FolderB/b.jpg', configurable: true });

    const makeSingleDir = (name: string) => {
      let read = false;
      return {
        isFile: false,
        isDirectory: true,
        name,
        createReader: () => ({
          readEntries: (ok: (entries: FileSystemEntry[]) => void) => {
            ok(read ? [] : []);
            read = true;
          },
        }),
      } as FileSystemEntry;
    };

    const snapshot = {
      entries: [makeSingleDir('FolderA')],
      looseFiles: [],
      snapshotFiles: [fileA, fileB],
      fileItemCount: 2,
    };

    const batches = await readDataTransferDropBatches(snapshot);
    expect(batches).toHaveLength(2);
    expect(batches[0]?.suggestedFolderName).toBe('FolderA');
    expect(batches[1]?.suggestedFolderName).toBe('FolderB');
  });
});
