/** Coarse license family used for client-side filtering of Wikimedia Commons results. */
export type LabsWikimediaLicenseFilter = 'any' | 'pd' | 'cc-by' | 'cc-by-sa';

/** Classify a Wikimedia `LicenseShortName` string into a coarse family for client-side filtering. */
export function classifyWikimediaLicense(licenseShortName: string): LabsWikimediaLicenseFilter | 'other' {
  const value = licenseShortName.toLowerCase();
  if (value.includes('cc0') || value.includes('public domain') || value.includes('pd-')) return 'pd';
  if (value.includes('cc by-sa') || value.includes('cc-by-sa') || value.includes('attribution-sharealike')) {
    return 'cc-by-sa';
  }
  if (value.includes('cc by') || value.includes('cc-by') || value.startsWith('attribution')) return 'cc-by';
  return 'other';
}
