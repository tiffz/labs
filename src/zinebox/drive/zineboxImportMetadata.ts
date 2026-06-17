export type ZineboxImportBatchMetadata = {
  /** Shop, bundle, or publisher label applied to every comic in the batch. */
  source: string;
  tags: string[];
  /**
   * When true, each PDF keeps a source derived from its Drive subfolder path.
   * When false, every comic uses {@link source}.
   */
  useSubfolderAsSource: boolean;
};

export const DEFAULT_ZINEBOX_IMPORT_METADATA: ZineboxImportBatchMetadata = {
  source: 'Local',
  tags: [],
  useSubfolderAsSource: false,
};
