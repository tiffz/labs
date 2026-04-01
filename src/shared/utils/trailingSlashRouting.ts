export function buildAppBasePathsFromEntryPaths(entryPaths: string[], srcRoot: string): Set<string> {
  const normalizedRoot = normalizePath(srcRoot);
  const routes = entryPaths
    .map((entryPath) => {
      const normalizedEntry = normalizePath(entryPath);
      if (!normalizedEntry.startsWith(normalizedRoot)) return null;
      const relativePath = normalizedEntry.slice(normalizedRoot.length).replace(/^\/+/, '');
      const dirPath = relativePath.replace(/\/index\.html$/, '').replace(/\/+$/, '');
      return dirPath ? `/${dirPath}` : '/';
    })
    .filter((route): route is string => Boolean(route))
    .filter((route) => route !== '/');
  return new Set(routes);
}

export function getCanonicalTrailingSlashRedirect(
  url: string | undefined,
  appBasePaths: Set<string>
): string | null {
  if (!url) return null;
  const [pathname, queryString = ''] = url.split('?');
  if (!pathname || pathname === '/' || pathname.endsWith('/')) return null;
  if (!appBasePaths.has(pathname)) return null;
  return `${pathname}/${queryString ? `?${queryString}` : ''}`;
}

function normalizePath(input: string): string {
  return input.replace(/\\/g, '/');
}
