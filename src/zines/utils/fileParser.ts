import type { ParsedFile } from '../types';

/**
 * Extracts page number from filename using naming conventions.
 * Handles flexible naming patterns:
 * - "page1.png", "page_1.png", "1.png" for single pages
 * - "file1.pdf", "page2.pdf" for numbered pages
 * - Special keywords: "front", "back", "rear", "last", "inner"
 */
export function extractPageNumber(filename: string): number | null {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').toLowerCase();
  
  // Handle special keywords - assign them to specific positions
  // These will be sorted separately, but we need numeric values for ordering
  // Check for compound keywords first (more specific)
  // Handle underscore-separated keywords (e.g., "Inner_Front")
  const normalizedName = nameWithoutExt.replace(/_/g, '');
  
  if (normalizedName.includes('inner') && normalizedName.includes('front')) {
    return -0.5; // Inner front cover (pairs with page 1)
  }
  if (normalizedName.includes('inner') && normalizedName.includes('back')) {
    return -1; // Inner back cover (pairs with last page)
  }
  
  const keywordMap: Record<string, number> = {
    'front': 0,      // Outer front cover
    'inner': -1,     // Inner back cover (default if just "inner")
    'back': -2,      // Outer back cover
    'rear': -2,      // Outer back cover (alternative)
    'last': -3,      // Last page (alternative)
  };
  
  // Check against normalized name (without underscores) for keyword matching
  for (const [keyword, value] of Object.entries(keywordMap)) {
    if (normalizedName.includes(keyword)) {
      return value;
    }
  }
  
  // Extract numbers from filename - handles various patterns:
  // - "page1.png" -> 1
  // - "page_1.png" -> 1
  // - "1.png" -> 1
  // - "file1.pdf" -> 1
  const numberMatch = nameWithoutExt.match(/(\d+)/);
  if (numberMatch) {
    return parseInt(numberMatch[1], 10);
  }
  
  return null;
}

/**
 * Detects if a filename represents a double page spread.
 * Handles patterns like:
 * - "page14-15.jpg" (hyphenated)
 * - "14-15.jpg" (hyphenated numbers only)
 * - "page14page15.jpg" (concatenated)
 * - "1415.jpg" (concatenated numbers)
 * - "page12-innercover.jpg" (number + keyword)
 */
export function detectSpread(filename: string): { isSpread: boolean; pages?: [number, number] } {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').toLowerCase();
  
  // Pattern 1: Hyphenated with number-number (e.g., "page14-15", "page_14-15", "14-15", "1-2")
  // Handles: page1-2.png, page_1-2.png, 1-2.png
  // IMPORTANT: Use hyphen only, not underscore, to avoid matching "Page_12" as "1-2"
  const hyphenMatch = nameWithoutExt.match(/(?:page[_-]?)?(\d+)-(\d+)/);
  if (hyphenMatch) {
    const page1 = parseInt(hyphenMatch[1], 10);
    const page2 = parseInt(hyphenMatch[2], 10);
    if (page1 && page2 && page2 === page1 + 1) {
      return { isSpread: true, pages: [page1, page2] };
    }
  }
  
  // Pattern 1b: Keyword-keyword spreads (e.g., "outer_back-outer_front", "back-front")
  // Handle underscore-separated keywords - check for back/front combinations
  // Match patterns like: "back-front", "outer_back-outer_front", "rear-front", etc.
  // Check if both back and front keywords exist and are separated by hyphen or underscore
  const hasBack = nameWithoutExt.includes('back') || nameWithoutExt.includes('rear') || nameWithoutExt.includes('last');
  const hasFront = nameWithoutExt.includes('front');
  
  if (hasBack && hasFront) {
    // Match patterns where back and front are separated by hyphen or underscore
    // This handles: "back-front", "outer_back-outer_front", "back_front", etc.
    const keywordKeywordMatch = nameWithoutExt.match(/(back|rear|last|outerback|outer_back)[_-](front|outerfront|outer_front)/);
    if (keywordKeywordMatch) {
      return { isSpread: true, pages: [-2, 0] }; // Outer back + outer front
    }
  }
  
  // Pattern 1c: Number hyphenated with keyword (e.g., "page12-innercover", "12-inner", "page_12-inner_back")
  // Normalize underscores in keywords to handle variants like "inner_back"
  const normalizedForNumberKeyword = nameWithoutExt.replace(/inner[_-]?front/gi, 'innerfront')
                                                    .replace(/inner[_-]?back/gi, 'innerback')
                                                    .replace(/inner[_-]?cover/gi, 'innercover');
  const numberKeywordMatch = normalizedForNumberKeyword.match(/(?:page[_-]?)?(\d+)[_-](innercover|innerback|innerfront|inner|back|front|cover)/);
  if (numberKeywordMatch) {
    const pageNum = parseInt(numberKeywordMatch[1], 10);
    const keyword = numberKeywordMatch[2];
    
    // Determine the second page number based on keyword (check most specific first)
    if (keyword === 'innerfront' || (keyword.includes('inner') && keyword.includes('front'))) {
      return { isSpread: true, pages: [-0.5, pageNum] }; // Inner front cover + page
    } else if (keyword === 'innerback' || keyword === 'innercover' || 
               (keyword.includes('inner') && keyword.includes('back'))) {
      return { isSpread: true, pages: [pageNum, -1] }; // Inner back cover
    } else if (keyword === 'inner') {
      // Default inner = inner back
      return { isSpread: true, pages: [pageNum, -1] };
    } else if (keyword.includes('back')) {
      return { isSpread: true, pages: [pageNum, -2] }; // Outer back cover
    } else if (keyword.includes('front')) {
      return { isSpread: true, pages: [-2, pageNum] }; // Outer back + front
    }
  }
  
  // Pattern 1d: Keyword hyphenated with number (e.g., "innercover-12", "inner_front-1")
  // Normalize underscores in keywords to handle variants like "inner_front"
  const normalizedForKeyword = nameWithoutExt.replace(/inner[_-]?front/gi, 'innerfront')
                                              .replace(/inner[_-]?back/gi, 'innerback')
                                              .replace(/inner[_-]?cover/gi, 'innercover');
  const keywordNumberMatch = normalizedForKeyword.match(/(innercover|innerback|innerfront|inner|back|front|cover)[_-](?:page[_-]?)?(\d+)/);
  if (keywordNumberMatch) {
    const keyword = keywordNumberMatch[1];
    const pageNum = parseInt(keywordNumberMatch[2], 10);
    
    // Check most specific first
    if (keyword === 'innerfront' || (keyword.includes('inner') && keyword.includes('front'))) {
      return { isSpread: true, pages: [-0.5, pageNum] };
    } else if (keyword === 'innerback' || keyword === 'innercover' || 
               (keyword.includes('inner') && keyword.includes('back'))) {
      return { isSpread: true, pages: [pageNum, -1] };
    } else if (keyword === 'inner') {
      return { isSpread: true, pages: [pageNum, -1] };
    } else if (keyword.includes('back')) {
      return { isSpread: true, pages: [pageNum, -2] };
    } else if (keyword.includes('front')) {
      return { isSpread: true, pages: [-2, pageNum] };
    }
  }
  
  // Pattern 2: Concatenated numbers (e.g., "page14page15", "1415")
  // Only check if filename explicitly contains "spread" OR if there are no underscores
  // between numbers (to avoid false positives like "Page_12" being treated as pages 1-2)
  const hasSpreadKeyword = nameWithoutExt.includes('spread');
  const hasHyphenBetweenNumbers = /page[_-]?\d+-\d+/.test(nameWithoutExt);
  
  if (hasSpreadKeyword || hasHyphenBetweenNumbers) {
    // First, try to find separate number groups
    const numberMatches = nameWithoutExt.matchAll(/\d+/g);
    const numbers = Array.from(numberMatches).map(m => parseInt(m[0], 10));
    
    // Look for consecutive numbers in separate groups
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i + 1] === numbers[i] + 1) {
        return { isSpread: true, pages: [numbers[i], numbers[i + 1]] };
      }
    }
    
    // Pattern 2b: Try to split a single number into two consecutive numbers
    // e.g., "1415" could be "14" and "15" (only if "spread" keyword present)
    if (hasSpreadKeyword && numbers.length === 1) {
      const numStr = numbers[0].toString();
      // Try splitting at different positions to find consecutive numbers
      for (let splitPos = 1; splitPos < numStr.length; splitPos++) {
        const first = parseInt(numStr.substring(0, splitPos), 10);
        const second = parseInt(numStr.substring(splitPos), 10);
        if (second === first + 1 && second > 0 && first > 0) {
          return { isSpread: true, pages: [first, second] };
        }
      }
    }
  }
  
  // Pattern 3: Check for concatenated numbers without separators (e.g., "page14page15", "1415")
  // Only if no underscores are present (to avoid matching "Page_12" as "1" and "2")
  if (!nameWithoutExt.includes('_')) {
    const numberMatches = nameWithoutExt.matchAll(/\d+/g);
    const numbers = Array.from(numberMatches).map(m => parseInt(m[0], 10));
    
    // Look for consecutive numbers in separate groups (e.g., "page14page15")
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i + 1] === numbers[i] + 1) {
        return { isSpread: true, pages: [numbers[i], numbers[i + 1]] };
      }
    }
    
    // Try to split a single number into two consecutive numbers (e.g., "1415" -> "14", "15")
    if (numbers.length === 1) {
      const numStr = numbers[0].toString();
      for (let splitPos = 1; splitPos < numStr.length; splitPos++) {
        const first = parseInt(numStr.substring(0, splitPos), 10);
        const second = parseInt(numStr.substring(splitPos), 10);
        if (second === first + 1 && second > 0 && first > 0) {
          return { isSpread: true, pages: [first, second] };
        }
      }
    }
  }
  
  return { isSpread: false };
}

/**
 * Parses a file and extracts page information according to naming conventions
 */
export function parseFile(file: File): ParsedFile {
  const pageNumber = extractPageNumber(file.name);
  const spreadInfo = detectSpread(file.name);
  
  return {
    file,
    pageNumber,
    isSpread: spreadInfo.isSpread,
    spreadPages: spreadInfo.pages,
    displayName: file.name,
    originalName: file.name,
  };
}

/**
 * Sorts parsed files into correct page order
 * Special keywords are handled: front comes first, then numbered pages, then back/inner/rear/last
 */
export function sortFilesByPageOrder(files: ParsedFile[]): ParsedFile[] {
  return [...files].sort((a, b) => {
    // Handle spreads - they should be placed at the first page of the spread
    const aPage = a.isSpread && a.spreadPages ? a.spreadPages[0] : a.pageNumber;
    const bPage = b.isSpread && b.spreadPages ? b.spreadPages[0] : b.pageNumber;
    
    if (aPage === null && bPage === null) {
      return a.originalName.localeCompare(b.originalName);
    }
    if (aPage === null) return 1;
    if (bPage === null) return -1;
    
    // Special handling for negative values (keywords)
    // Front (0) comes first, then positive numbers, then negative (back, inner, etc.)
    if (aPage < 0 && bPage >= 0) return 1;
    if (aPage >= 0 && bPage < 0) return -1;
    
    return aPage - bPage;
  });
}

/**
 * Parses multiple files and returns them sorted in page order
 */
export function parseAndSortFiles(files: File[]): ParsedFile[] {
  const parsed = files.map(parseFile);
  return sortFilesByPageOrder(parsed);
}
