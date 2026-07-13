import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  colorStateToHex,
  generatePaletteFromSeedHex,
  generateRandomPalettes,
  hexToColorState,
  proposePalettesFromImageFiles,
  resolvePaletteProfile,
  type ColorState,
  type PaletteGenerationProfile,
  type PaletteMoodPreset,
  type PaletteProposal,
  type PaletteRandomTemplate,
} from '../../shared/color';
import { createPaletteFromHexes, type ComicPalette } from '../../shared/palette';
import type { PalettegenUrlState } from '../utils/palettegenUrlParams';

export type PalettegenMode = 'image' | 'seed' | 'random';

export type PalettegenSourceImage = {
  id: string;
  url: string;
  name: string;
};

export type PalettegenGalleryEntry = {
  id: string;
  label: string;
  proposal: PaletteProposal;
  palette: ComicPalette;
};

type GallerySnapshot = {
  entries: PalettegenGalleryEntry[];
  activeId: string | null;
  mode: PalettegenMode;
  randomSeed: number;
};

const MAX_GALLERY_HISTORY = 24;

function paletteSourceForProposal(proposal: PaletteProposal): ComicPalette['source'] {
  if (proposal.method === 'random') return 'manual';
  if (proposal.method === 'seed') return 'manual';
  return 'image';
}

function entryFromProposal(proposal: PaletteProposal): PalettegenGalleryEntry {
  const hexes = proposal.colors.map(colorStateToHex);
  return {
    id: proposal.id,
    label: proposal.label,
    proposal,
    palette: createPaletteFromHexes(hexes, proposal.label, paletteSourceForProposal(proposal)),
  };
}

function entryFromSharedHexes(hexes: string[]): PalettegenGalleryEntry {
  const colors = hexes
    .map((hex) => hexToColorState(hex))
    .filter((color): color is ColorState => color != null);
  const proposal: PaletteProposal = {
    id: 'shared',
    label: 'Shared palette',
    rule: 'dominant',
    method: 'dominant',
    colors,
  };
  return {
    id: 'shared',
    label: 'Shared palette',
    proposal,
    palette: createPaletteFromHexes(hexes, 'Shared palette', 'manual'),
  };
}

export function usePalettegenGallery(): {
  mode: PalettegenMode;
  setMode: (mode: PalettegenMode) => void;
  entries: PalettegenGalleryEntry[];
  activeEntry: PalettegenGalleryEntry | null;
  activeId: string | null;
  selectEntry: (id: string) => void;
  navigateEntry: (delta: number) => void;
  profile: PaletteGenerationProfile;
  moodPreset: PaletteMoodPreset;
  setMoodPreset: (preset: PaletteMoodPreset) => void;
  updateProfile: (patch: Partial<PaletteGenerationProfile>) => void;
  swatchCount: number;
  setSwatchCount: (count: number) => void;
  seedHex: string;
  setSeedHex: (hex: string) => void;
  randomTemplates: PaletteRandomTemplate[];
  setRandomTemplates: (templates: PaletteRandomTemplate[]) => void;
  busy: boolean;
  status: string;
  generateFromImages: (files: File[]) => Promise<void>;
  generateFromSeed: (variationSeed?: number) => void;
  useColorAsSeed: (hex: string) => void;
  generateRandom: () => void;
  regenerate: () => void;
  undoRegenerate: () => boolean;
  loadFromUrl: (state: PalettegenUrlState) => void;
  sourceImages: PalettegenSourceImage[];
  clearSourceImages: () => void;
} {
  const [mode, setMode] = useState<PalettegenMode>('random');
  const [entries, setEntries] = useState<PalettegenGalleryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moodPreset, setMoodPresetState] = useState<PaletteMoodPreset>('mixed');
  const [profileOverrides, setProfileOverrides] = useState<Partial<PaletteGenerationProfile>>({});
  const [swatchCount, setSwatchCount] = useState(5);
  const [seedHex, setSeedHex] = useState('#ff44a1');
  const [randomTemplates, setRandomTemplates] = useState<PaletteRandomTemplate[]>([
    'balanced',
    'complementary',
    'triadic',
    'analogous',
  ]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [randomSeed, setRandomSeed] = useState(Date.now());
  const [sourceImages, setSourceImages] = useState<PalettegenSourceImage[]>([]);
  const imageFilesRef = useRef<File[]>([]);
  const sourceUrlsRef = useRef<string[]>([]);
  const imageVariationRef = useRef(0);
  const seedVariationRef = useRef(0);
  const activeIdRef = useRef<string | null>(null);
  const hasGeneratedRef = useRef(false);
  const settingsRefreshReadyRef = useRef(false);
  const galleryHistoryRef = useRef<GallerySnapshot[]>([]);
  const entriesRef = useRef<PalettegenGalleryEntry[]>([]);
  const modeRef = useRef<PalettegenMode>('random');
  const randomSeedRef = useRef(randomSeed);
  const sharedFromUrlRef = useRef(false);

  activeIdRef.current = activeId;
  entriesRef.current = entries;
  modeRef.current = mode;
  randomSeedRef.current = randomSeed;

  const clearSourceImages = useCallback(() => {
    for (const url of sourceUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    sourceUrlsRef.current = [];
    setSourceImages([]);
  }, []);

  useEffect(() => () => {
    for (const url of sourceUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const setSourceFiles = useCallback((files: File[]) => {
    for (const url of sourceUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    const next = files.map((file, index) => {
      const url = URL.createObjectURL(file);
      sourceUrlsRef.current.push(url);
      return {
        id: `source-${index}-${file.name}`,
        url,
        name: file.name,
      };
    });
    setSourceImages(next);
  }, []);

  const profile = useMemo(
    () => resolvePaletteProfile(moodPreset, profileOverrides),
    [moodPreset, profileOverrides],
  );

  const pushGalleryHistory = useCallback(() => {
    if (entriesRef.current.length === 0) return;
    galleryHistoryRef.current.push({
      entries: entriesRef.current,
      activeId: activeIdRef.current,
      mode: modeRef.current,
      randomSeed: randomSeedRef.current,
    });
    if (galleryHistoryRef.current.length > MAX_GALLERY_HISTORY) {
      galleryHistoryRef.current.shift();
    }
  }, []);

  const applyProposals = useCallback((proposals: PaletteProposal[], message = '', keepIndex = false) => {
    const next = proposals.map(entryFromProposal);
    setEntries((prev) => {
      if (keepIndex && prev.length > 0) {
        const prevIndex = prev.findIndex((entry) => entry.id === activeIdRef.current);
        const nextIndex = prevIndex >= 0 ? Math.min(prevIndex, next.length - 1) : 0;
        setActiveId(next[nextIndex]?.id ?? null);
      } else {
        setActiveId(next[0]?.id ?? null);
      }
      return next;
    });
    setStatus(message ? message : (prev) => prev);
    hasGeneratedRef.current = true;
    window.setTimeout(() => {
      settingsRefreshReadyRef.current = true;
    }, 0);
  }, []);

  const loadFromUrl = useCallback((state: PalettegenUrlState) => {
    if (state.mode) setMode(state.mode);
    if (state.seed) setSeedHex(state.seed.startsWith('#') ? state.seed : `#${state.seed}`);

    if (state.colors.length >= 2) {
      const hexes = state.colors.map((hex) => (hex.startsWith('#') ? hex : `#${hex}`));
      const entry = entryFromSharedHexes(hexes);
      setEntries([entry]);
      setActiveId(entry.id);
      setStatus('Loaded shared palette.');
      hasGeneratedRef.current = true;
      settingsRefreshReadyRef.current = true;
      sharedFromUrlRef.current = !state.mode;
    }
  }, []);

  const generateFromImages = useCallback(
    async (files: File[], keepIndex = false, variationSeed?: number) => {
      if (files.length === 0) return;
      sharedFromUrlRef.current = false;
      imageFilesRef.current = files;
      setSourceFiles(files);
      setBusy(true);
      setStatus('Sampling colors from images…');
      try {
        const proposals = await proposePalettesFromImageFiles(files, {
          maxSwatches: swatchCount,
          profile,
          variationSeed,
        });
        applyProposals(proposals, variationSeed != null ? 'Resampled image colors.' : '', keepIndex);
        setMode('image');
      } catch {
        setStatus('Could not read one or more images.');
      } finally {
        setBusy(false);
      }
    },
    [applyProposals, profile, setSourceFiles, swatchCount],
  );

  const generateFromSeed = useCallback(
    (variationSeed?: number, keepIndex = false) => {
      sharedFromUrlRef.current = false;
      const variation = variationSeed ?? seedVariationRef.current;
      const proposals = generatePaletteFromSeedHex(seedHex, profile, swatchCount, {
        variationSeed: variation > 0 ? variation : undefined,
      });
      if (proposals.length === 0) {
        setStatus('Enter a valid seed color.');
        return;
      }
      applyProposals(proposals, '', keepIndex);
      setMode('seed');
    },
    [applyProposals, profile, seedHex, swatchCount],
  );

  const useColorAsSeed = useCallback(
    (hex: string) => {
      sharedFromUrlRef.current = false;
      const color = hexToColorState(hex);
      if (!color) {
        setStatus('Could not use that color as a seed.');
        return;
      }
      if (entriesRef.current.length > 0) {
        pushGalleryHistory();
      }
      const normalized = colorStateToHex(color);
      setSeedHex(normalized);
      seedVariationRef.current = 0;
      const proposals = generatePaletteFromSeedHex(normalized, profile, swatchCount);
      if (proposals.length === 0) {
        setStatus('Could not generate a palette from that seed.');
        return;
      }
      applyProposals(proposals, `Seed palette from ${normalized}`);
      setMode('seed');
    },
    [applyProposals, profile, pushGalleryHistory, swatchCount],
  );

  const generateRandom = useCallback(
    (keepIndex = false) => {
      sharedFromUrlRef.current = false;
      const proposals = generateRandomPalettes(profile, {
        count: 8,
        swatches: swatchCount,
        templates: randomTemplates,
        seed: randomSeed,
      });
      applyProposals(proposals, '', keepIndex);
      setMode('random');
    },
    [applyProposals, profile, randomSeed, randomTemplates, swatchCount],
  );

  const refreshFromSettings = useCallback(() => {
    if (sharedFromUrlRef.current) return;
    if (!hasGeneratedRef.current || entries.length === 0) return;
    if (mode === 'image' && imageFilesRef.current.length > 0) {
      void generateFromImages(imageFilesRef.current, true);
      return;
    }
    if (mode === 'seed') {
      generateFromSeed(seedVariationRef.current, true);
      return;
    }
    const proposals = generateRandomPalettes(profile, {
      count: 8,
      swatches: swatchCount,
      templates: randomTemplates,
      seed: randomSeed,
    });
    applyProposals(proposals, '', true);
  }, [applyProposals, entries.length, generateFromImages, generateFromSeed, mode, profile, randomSeed, randomTemplates, swatchCount]);

  useEffect(() => {
    if (!settingsRefreshReadyRef.current || !hasGeneratedRef.current) return;
    const timer = window.setTimeout(() => {
      refreshFromSettings();
    }, 90);
    return () => window.clearTimeout(timer);
  }, [profile, swatchCount, randomTemplates, refreshFromSettings]);

  const regenerate = useCallback(() => {
    sharedFromUrlRef.current = false;
    if (entriesRef.current.length > 0) {
      pushGalleryHistory();
    }
    if (mode === 'image' && imageFilesRef.current.length > 0) {
      const nextVariation = Date.now();
      imageVariationRef.current = nextVariation;
      void generateFromImages(imageFilesRef.current, false, nextVariation);
      return;
    }
    if (mode === 'seed') {
      const nextVariation = Date.now();
      seedVariationRef.current = nextVariation;
      generateFromSeed(nextVariation);
      return;
    }
    const nextSeed = Date.now();
    setRandomSeed(nextSeed);
    const proposals = generateRandomPalettes(profile, {
      count: 8,
      swatches: swatchCount,
      templates: randomTemplates,
      seed: nextSeed,
    });
    applyProposals(proposals);
    setMode('random');
  }, [applyProposals, generateFromImages, generateFromSeed, mode, profile, pushGalleryHistory, randomTemplates, swatchCount]);

  const undoRegenerate = useCallback((): boolean => {
    const previous = galleryHistoryRef.current.pop();
    if (!previous) {
      setStatus('Nothing to undo.');
      return false;
    }
    setEntries(previous.entries);
    setActiveId(previous.activeId);
    setMode(previous.mode);
    setRandomSeed(previous.randomSeed);
    setStatus('Restored previous palettes.');
    hasGeneratedRef.current = previous.entries.length > 0;
    return true;
  }, []);

  const navigateEntry = useCallback((delta: number) => {
    if (entries.length === 0) return;
    const currentIndex = entries.findIndex((entry) => entry.id === activeIdRef.current);
    const index = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (index + delta + entries.length) % entries.length;
    setActiveId(entries[nextIndex]?.id ?? null);
  }, [entries]);

  const setMoodPreset = useCallback((preset: PaletteMoodPreset) => {
    setMoodPresetState(preset);
    if (preset !== 'custom') {
      setProfileOverrides({});
    }
  }, []);

  const setModeAndUnlock = useCallback((next: PalettegenMode) => {
    sharedFromUrlRef.current = false;
    setMode(next);
  }, []);

  const activeEntry = entries.find((entry) => entry.id === activeId) ?? entries[0] ?? null;

  const updateProfile = useCallback((patch: Partial<PaletteGenerationProfile>) => {
    setMoodPresetState('custom');
    setProfileOverrides((current) => ({ ...current, ...patch }));
  }, []);

  return {
    mode,
    setMode: setModeAndUnlock,
    entries,
    activeEntry,
    activeId: activeEntry?.id ?? null,
    selectEntry: setActiveId,
    navigateEntry,
    profile,
    moodPreset,
    setMoodPreset,
    updateProfile,
    swatchCount,
    setSwatchCount,
    seedHex,
    setSeedHex,
    randomTemplates,
    setRandomTemplates,
    busy,
    status,
    generateFromImages,
    generateFromSeed,
    useColorAsSeed,
    generateRandom,
    regenerate,
    undoRegenerate,
    loadFromUrl,
    sourceImages,
    clearSourceImages,
  };
}
