export type ZineboxDesignThemeId =
  | 'hotstack'
  | 'risograph'
  | 'risodrift'
  | 'risogold'
  | 'risofluoro'
  | 'risomint'
  | 'risomidnight'
  | 'risosepia'
  | 'risoastro'
  | 'risopulp'
  | 'risoluxe'
  | 'newsprint'
  | 'xerox'
  | 'neonbodega'
  | 'pasteup'
  | 'letterpress'
  | 'dotmatrix'
  | 'candycomic'
  | 'voidgallery';

export type ZineboxDesignThemeGroup = 'classic' | 'riso';

export type ZineboxDesignTheme = {
  id: ZineboxDesignThemeId;
  label: string;
  tagline: string;
  group: ZineboxDesignThemeGroup;
  muiMode: 'light' | 'dark';
  muiPrimary: string;
  muiBackgroundDefault: string;
  muiBackgroundPaper: string;
  muiTextPrimary: string;
  muiTextSecondary: string;
  cssVars: Record<string, string>;
};

export type ZineboxDesignThemeGroupDef = {
  id: ZineboxDesignThemeGroup;
  label: string;
  themes: readonly ZineboxDesignTheme[];
};
