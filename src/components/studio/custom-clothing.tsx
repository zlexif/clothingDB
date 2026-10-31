'use client';

import { FileWarning, FolderOpen, Lock, Shirt, Upload, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { categoryBySlug, type Gender } from '../../lib/clothing';
import {
  type ClothingTexture,
  GameFileError,
  parseClothingName,
  pickDiffuse,
  readDrawable,
  readTextures,
} from '../../lib/rage';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Pills } from './controls';
import type { CustomPiece } from './ped-viewport';

export const CUSTOM_SLOTS = [
  'tops',
  'undershirts',
  'torsos',
  'legs',
  'shoes',
  'masks',
  'hair',
  'accessories',
  'armor',
  'bags',
  'decals',
] as const;

export interface CustomItem {
  id: string;
  name: string;
  gender: Gender;
  slot: string;
  piece: CustomPiece;
  thumb: string | null;
  slotGuessed: boolean;
}

interface Problem {
  file: string;
  message: string;
}

const MAX_BYTES = 64 * 1024 * 1024;
export const MAX_FILES = 200;

const isClothingFile = (file: File) => /\.(ydd|ytd)$/i.test(file.name);

const slotLabel = (slot: string) => categoryBySlug(slot)?.label ?? slot;

function thumbnail(texture: ClothingTexture | undefined): string | null {
  if (texture?.kind !== 'rgba') return null;
  const full = document.createElement('canvas');
  full.width = texture.width;
  full.height = texture.height;
  full.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(texture.data), texture.width), 0, 0);
  const small = document.createElement('canvas');
  small.width = 64;
  small.height = 64;
  small.getContext('2d')?.drawImage(full, 0, 0, 64, 64);
  return small.toDataURL('image/png');
}

const SHOWN_NAMES = 3;

export function groupProblems(problems: Problem[]): { message: string; files: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const p of problems) groups.set(p.message, [...(groups.get(p.message) ?? []), p.file]);
  return [...groups].map(([message, files]) => ({ message, files }));
}

function explain(error: unknown): string {
  if (error instanceof GameFileError) {
    if (error.problem === 'escrowed')
      return 'Escrowed (encrypted). It only opens inside FiveM, so it cannot be shown here. Take in-game screenshots and use Key captures instead.';
    return error.message;
  }
  return 'This file could not be read.';
}

async function readEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) =>
      (entry as FileSystemFileEntry).file(
        (f) => resolve([f]),
        () => resolve([]),
      ),
    );
  }
  if (!entry.isDirectory) return [];
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const children: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])));
    if (!batch.length) break;
    children.push(...batch);
  }
  return (await Promise.all(children.map(readEntry))).flat();
}

async function filesFromDrop(data: DataTransfer): Promise<File[]> {
  const entries = [...data.items].map((i) => i.webkitGetAsEntry?.()).filter((e): e is FileSystemEntry => !!e);
  if (entries.length) return (await Promise.all(entries.map(readEntry))).flat();
  return [...data.files];
}

export async function loadClothing(
  files: File[],
  fallbackGender: Gender,
): Promise<{ items: CustomItem[]; problems: Problem[] }> {
  const problems: Problem[] = [];
  const models: { file: File; name: ReturnType<typeof parseClothingName>; piece: CustomPiece }[] = [];
  const textures: { file: File; name: ReturnType<typeof parseClothingName>; texture: ClothingTexture }[] = [];

  const clothing = files.filter(isClothingFile);
  const skipped = new Set(clothing.slice(MAX_FILES));
  if (skipped.size) {
    problems.push({
      file: `${skipped.size} more ${skipped.size === 1 ? 'file' : 'files'}`,
      message: `Only ${MAX_FILES} clothing files are read at a time. Add the rest in another go.`,
    });
  }

  for (const file of files) {
    if (skipped.has(file)) continue;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.ydd') && !lower.endsWith('.ytd')) {
      if (!lower.endsWith('.meta') && !lower.endsWith('.lua') && !lower.endsWith('.md'))
        problems.push({ file: file.name, message: 'Only .ydd models and .ytd textures can be added.' });
      continue;
    }
    if (file.size > MAX_BYTES) {
      problems.push({ file: file.name, message: 'This file is too large to open.' });
      continue;
    }
    const name = parseClothingName(file.name);
    if (name.prop) {
      problems.push({ file: file.name, message: 'Props like hats and glasses are not supported yet.' });
      continue;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (lower.endsWith('.ydd')) models.push({ file, name, piece: { mesh: readDrawable(bytes), textures: [] } });
      else textures.push({ file, name, texture: pickDiffuse(readTextures(bytes)) });
    } catch (error) {
      problems.push({ file: file.name, message: explain(error) });
    }
  }

  const sameItem = (a: ReturnType<typeof parseClothingName>, b: ReturnType<typeof parseClothingName>) =>
    a.component !== null &&
    a.component === b.component &&
    a.item === b.item &&
    (a.gender === null || b.gender === null || a.gender === b.gender);

  const used = new Set<File>();
  const items: CustomItem[] = models.map((m) => {
    let own = textures.filter((t) => sameItem(m.name, t.name));
    if (!own.length && models.length === 1) own = textures;
    own.sort((a, b) => (a.name.colour ?? 99) - (b.name.colour ?? 99) || a.file.name.localeCompare(b.file.name));
    for (const t of own) used.add(t.file);
    const piece = { mesh: m.piece.mesh, textures: own.map((t) => t.texture) };
    return {
      id: crypto.randomUUID(),
      name: m.name.stem,
      gender: m.name.gender ?? fallbackGender,
      slot: m.name.slot ?? 'tops',
      piece,
      thumb: thumbnail(piece.textures.find((t) => t.kind === 'rgba')),
      slotGuessed: m.name.slot === null,
    };
  });

  for (const t of textures) {
    if (!used.has(t.file))
      problems.push({ file: t.file.name, message: 'No matching model (.ydd) was added for this texture.' });
  }
  return { items, problems };
}

export function CustomThumb({ item, className }: { item: CustomItem; className?: string }) {
  return (
    <span
      className={cn(
        'transparency-grid flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-hairline',
        className,
      )}
    >
      {item.thumb ? (
        <img src={item.thumb} alt="" className="h-full w-full object-cover" />
      ) : (
        <Shirt size={16} strokeWidth={1.5} className="text-fg-3" />
      )}
    </span>
  );
}

export function AddClothingDialog({
  open,
  gender,
  onClose,
  onAdd,
}: {
  open: boolean;
  gender: Gender;
  onClose: () => void;
  onAdd: (items: CustomItem[]) => void;
}) {
  const [drafts, setDrafts] = useState<CustomItem[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDrafts([]);
    setProblems([]);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    folderRef.current?.setAttribute('webkitdirectory', '');
  });

  async function take(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    const result = await loadClothing(files, gender);
    setDrafts((d) => [...d, ...result.items]);
    setProblems((p) => [...p, ...result.problems]);
    setBusy(false);
  }

  const edit = (id: string, patch: Partial<CustomItem>) =>
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...patch, slotGuessed: false } : d)));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="add-clothing"
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto px-4 py-[8vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="fixed inset-0 bg-canvas/70 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-clothing-title"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative w-full max-w-[560px] rounded-[20px] border border-hairline-strong bg-card shadow-modal"
          >
            <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
              <div>
                <h2 id="add-clothing-title" className="text-[17px] font-medium text-fg-strong">
                  Add your own clothing
                </h2>
                <p className="mt-1 text-[13px] text-fg-2">
                  Add a clothing model (.ydd) and its textures (.ytd). Your files stay on this computer.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fg-2 hover:bg-elevated hover:text-fg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(false);
                  void filesFromDrop(e.dataTransfer).then(take);
                }}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-8 text-center transition-colors',
                  over ? 'border-ember bg-canvas' : 'border-hairline-strong hover:border-fg-3',
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".ydd,.ytd"
                  className="sr-only"
                  onChange={(e) => {
                    void take([...(e.target.files ?? [])]);
                    e.target.value = '';
                  }}
                />
                <Upload size={22} strokeWidth={1.5} className={over ? 'text-ember' : 'text-fg-2'} />
                <span className="mt-3 text-[15px] font-medium text-fg">
                  {busy ? 'Reading your files…' : 'Drop files or a folder here'}
                </span>
                <span className="mt-1 text-[13px] text-fg-3">or click to choose .ydd and .ytd files</span>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[12px] text-fg-3">
                  <Lock size={12} /> Escrowed (encrypted) clothing cannot be opened outside FiveM.
                </p>
                <button
                  type="button"
                  onClick={() => folderRef.current?.click()}
                  className="press flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] text-fg-2 hover:bg-elevated hover:text-fg"
                >
                  <FolderOpen size={14} /> Choose a folder
                </button>
                <input
                  ref={folderRef}
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    void take([...(e.target.files ?? [])]);
                    e.target.value = '';
                  }}
                />
              </div>

              {drafts.length > 0 && (
                <ul className="space-y-2">
                  {drafts.map((d) => (
                    <li key={d.id} className="rounded-2xl border border-hairline bg-canvas p-3">
                      <div className="flex items-center gap-3">
                        <CustomThumb item={d} className="h-11 w-11" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-fg">{d.name}</p>
                          <p className="text-[12px] text-fg-3">
                            {d.piece.textures.length
                              ? `${d.piece.textures.length} ${d.piece.textures.length === 1 ? 'colour' : 'colours'}`
                              : 'No textures added, it will show in grey'}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${d.name}`}
                          onClick={() => setDrafts((list) => list.filter((x) => x.id !== d.id))}
                          className="press flex h-7 w-7 items-center justify-center rounded-full text-fg-3 hover:bg-elevated hover:text-fg"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Pills
                          label={`${d.name} ped`}
                          value={d.gender}
                          options={['male', 'female'] as Gender[]}
                          onChange={(g) => edit(d.id, { gender: g })}
                        />
                        <select
                          aria-label={`${d.name} slot`}
                          value={d.slot}
                          onChange={(e) => edit(d.id, { slot: e.target.value })}
                          className={cn(
                            'h-8 w-full rounded-full border bg-card px-3 text-[13px] text-fg',
                            d.slotGuessed ? 'border-amber' : 'border-hairline',
                          )}
                        >
                          {CUSTOM_SLOTS.map((s) => (
                            <option key={s} value={s}>
                              {slotLabel(s)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {d.slotGuessed && (
                        <p className="mt-2 text-[12px] text-amber">
                          The file name does not say which slot this is. Pick it above.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {problems.length > 0 && (
                <ul className="space-y-1.5 rounded-2xl border border-hairline p-3">
                  {groupProblems(problems).map((g) => (
                    <li key={g.message} className="flex gap-2 text-[12.5px]">
                      <FileWarning size={14} className="mt-0.5 shrink-0 text-amber" />
                      <span className="min-w-0">
                        <span className="break-all text-fg">{g.files.slice(0, SHOWN_NAMES).join(', ')}</span>
                        {g.files.length > SHOWN_NAMES && (
                          <span className="text-fg"> and {g.files.length - SHOWN_NAMES} more</span>
                        )}
                        <span className="text-fg-2"> · {g.message}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-4">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={!drafts.length || busy} onClick={() => onAdd(drafts)}>
                {drafts.length > 1 ? `Add ${drafts.length} pieces` : 'Add and wear it'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
