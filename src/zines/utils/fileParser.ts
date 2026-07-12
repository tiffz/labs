export {
  extractPageNumber,
  detectSpread,
  parsePageFile as parseFile,
  sortPageFilesByOrder as sortFilesByPageOrder,
  parseAndSortPageFiles as parseAndSortFiles,
  type ParsedPageFile,
} from '../../shared/zine/pageFileParser';

// Zine Studio historically used ParsedFile — same shape as ParsedPageFile.
export type { ParsedPageFile as ParsedFile } from '../../shared/zine/pageFileParser';
