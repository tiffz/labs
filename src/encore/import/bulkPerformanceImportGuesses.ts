import { calendarDateFromIsoTimestamp, guessIsoDateFromFreeText } from './guessIsoDateFromFreeText';

/** @deprecated Use {@link guessIsoDateFromFreeText} — alias kept for existing imports. */
export const guessDateFromImportText = guessIsoDateFromFreeText;

export { calendarDateFromIsoTimestamp, guessIsoDateFromFreeText } from './guessIsoDateFromFreeText';

export function performanceCalendarDateForBulkRow(opts: {
  fileName: string;
  matchHaystack: string;
  driveCreatedTime?: string;
  driveModifiedTime?: string;
}): string {
  return (
    guessIsoDateFromFreeText(opts.fileName) ??
    guessIsoDateFromFreeText(opts.matchHaystack) ??
    (opts.driveCreatedTime?.trim()
      ? calendarDateFromIsoTimestamp(opts.driveCreatedTime)
      : null) ??
    (opts.driveModifiedTime?.trim()
      ? calendarDateFromIsoTimestamp(opts.driveModifiedTime)
      : null) ??
    calendarDateFromIsoTimestamp(undefined)
  );
}
