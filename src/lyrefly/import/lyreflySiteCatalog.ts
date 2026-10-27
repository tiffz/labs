/**
 * Read a comics website built with Gatsby into a neutral catalog the importer can plan from.
 *
 * Both of the owner's sites publish their data as `page-data/…/page-data.json` with
 * `access-control-allow-origin: *`, so this runs in the browser with no server. Two layouts are
 * known: one YAML entry per comic (`allComicsYaml`, tiffatiel.com) and one folder per issue
 * (`allMetadataYaml` + `allFile`, slantofrain.com). Anything else is reported as unreadable, never
 * as an empty catalog.
 */
import { classifyLyreflyLink } from '../utils/lyreflyAccountUrl';

export type CatalogAccountOwner = { kind: 'persona' } | { kind: 'series'; seriesKey: string };

export type CatalogAccount = { platform: string; handle: string; url: string; owner: CatalogAccountOwner };

export type CatalogPublication = { url: string; platform: string; publishedAt: string };

export type CatalogPage = {
  /** File name the page parser understands (`outer-front.png`, `Page_10-11.png`). */
  fileName: string;
  imageUrl: string;
  altText?: string;
};

export type CatalogComic = {
  /** `host:slug` — the stable import key. */
  key: string;
  title: string;
  description?: string;
  contentWarnings?: string[];
  seriesKey?: string;
  publications: CatalogPublication[];
  /** Absent when the site lists pages on a separate page not yet fetched. */
  pages?: CatalogPage[];
  /** Where to fetch the pages from, when `pages` is absent. */
  pagesSource?: string;
};

export type SiteCatalog = {
  siteUrl: string;
  host: string;
  /** Pen name the site credits, when it says; the user confirms it before import. */
  personaName?: string;
  series: { key: string; title: string }[];
  accounts: CatalogAccount[];
  comics: CatalogComic[];
};

type GatsbyImage = { childImageSharp?: { gatsbyImageData?: { images?: { fallback?: { src?: string } } } } };

function imageSrc(image: GatsbyImage | null | undefined): string | undefined {
  return image?.childImageSharp?.gatsbyImageData?.images?.fallback?.src;
}

function absolute(siteUrl: string, path: string): string {
  return new URL(path, siteUrl).href;
}

function basename(path: string): string {
  return path.split('/').pop() ?? path;
}

/** Pen name from "Comics by X" in the description, else the name in the footer's © line. */
export function readPersonaNameFromHtml(html: string): string | undefined {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute('content') ??
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ??
    '';
  const by = /\bby\s+([^.,]+)/i.exec(description)?.[1]?.trim();
  if (by) return by;
  const footer = doc.querySelector('footer')?.textContent?.replace(/\s+/g, ' ') ?? '';
  return /©\s*\d{4}\s+([^·|]+?)\s*(?:[·|]|$)/.exec(footer)?.[1]?.trim() || undefined;
}

function readFooterAccounts(html: string): CatalogAccount[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const accounts: CatalogAccount[] = [];
  for (const a of doc.querySelectorAll('footer a[href]')) {
    const link = classifyLyreflyLink(a.getAttribute('href') ?? '');
    if (link?.kind === 'account') accounts.push({ ...link, owner: { kind: 'persona' } });
  }
  return accounts;
}

function siteTitleFromHtml(html: string): string | undefined {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.querySelector('title')?.textContent?.trim() || undefined;
}

type ComicsYamlNode = {
  name: string;
  slug: string;
  year?: number;
  description?: string;
  links?: Record<string, string | null>;
};

/** tiffatiel.com: one YAML entry per comic; pages live on each comic's own page-data. */
function readComicsYamlSite(siteUrl: string, host: string, nodes: ComicsYamlNode[], html: string): SiteCatalog {
  const series: SiteCatalog['series'] = [];
  const accounts = readFooterAccounts(html);
  const comics: CatalogComic[] = [];

  for (const node of nodes) {
    const key = `${host}:${node.slug}`;
    const pageUrl = absolute(siteUrl, `/comics/${node.slug}/`);
    // A year is all this site says. Unknown day stays unknown: '' rather than a made-up Jan 1.
    const publishedAt = '';
    const publications: CatalogPublication[] = [{ url: pageUrl, platform: 'Website', publishedAt }];
    const seriesAccounts: CatalogAccount[] = [];

    for (const [platformKey, url] of Object.entries(node.links ?? {})) {
      if (!url) continue;
      const hint = platformKey.charAt(0).toUpperCase() + platformKey.slice(1);
      const link = classifyLyreflyLink(url, hint);
      if (!link) continue;
      if (link.kind === 'post') publications.push({ url, platform: link.platform, publishedAt });
      else seriesAccounts.push({ ...link, owner: { kind: 'series', seriesKey: key } });
    }

    // A comic whose links are accounts (Between Walks) is an ongoing series with its own presence.
    let seriesKey: string | undefined;
    if (seriesAccounts.length > 0) {
      seriesKey = key;
      series.push({ key, title: node.name });
      accounts.push(...seriesAccounts);
    }

    comics.push({
      key,
      title: node.name,
      description: node.description?.trim() || undefined,
      seriesKey,
      publications,
      pagesSource: absolute(siteUrl, `/page-data/comics/${node.slug}/page-data.json`),
    });
  }

  accounts.unshift({ platform: 'Website', handle: host, url: absolute(siteUrl, '/'), owner: { kind: 'persona' } });
  return { siteUrl, host, personaName: readPersonaNameFromHtml(html), series, accounts, comics };
}

/** Pages of one tiffatiel.com comic, in reading order as the page parser sorts them. */
export function readComicsYamlPages(siteUrl: string, pageData: unknown): CatalogPage[] {
  const comic = (pageData as { result?: { data?: { comicsYaml?: Record<string, unknown> } } })?.result?.data
    ?.comicsYaml;
  if (!comic) return [];
  const pages: CatalogPage[] = [];
  const cover = (comic.cover ?? {}) as Record<string, GatsbyImage>;
  const front = imageSrc(cover.outerFront);
  if (front) pages.push({ fileName: basename(front), imageUrl: absolute(siteUrl, front) });
  for (const page of (comic.pages ?? []) as (GatsbyImage & { name?: string })[]) {
    const src = imageSrc(page);
    if (src) pages.push({ fileName: basename(src), imageUrl: absolute(siteUrl, src) });
  }
  const back = imageSrc(cover.outerBack);
  if (back) pages.push({ fileName: basename(back), imageUrl: absolute(siteUrl, back) });
  return pages;
}

type FileGroup = { fieldValue: string; nodes: (GatsbyImage & { name: string })[] };
type IssueMetadata = {
  title: string;
  description?: string | null;
  contentWarnings?: string[] | null;
  publishDate?: string | null;
  parent: { relativeDirectory: string };
};
type AltText = { filename: string; alt: string; parent: { relativeDirectory: string } };

/** slantofrain.com: one folder per issue, every page and its alt text on the index. */
function readIssueFolderSite(
  siteUrl: string,
  host: string,
  data: { allFile: { group: FileGroup[] }; allMetadataYaml: { nodes: IssueMetadata[] }; allAltTextYaml?: { nodes: AltText[] } },
  html: string,
): SiteCatalog {
  const title = (siteTitleFromHtml(html) ?? host).replace(/\s+Comics$/i, '');
  const seriesKey = `${host}:site`;
  const alt = new Map((data.allAltTextYaml?.nodes ?? []).map((a) => [`${a.parent.relativeDirectory}/${a.filename}`, a.alt]));
  const groups = new Map(data.allFile.group.map((g) => [g.fieldValue, g.nodes]));

  const comics: CatalogComic[] = data.allMetadataYaml.nodes.map((issue) => {
    const dir = issue.parent.relativeDirectory;
    const issueNumber = /^(\d+)-/.exec(dir)?.[1];
    const pages = (groups.get(dir) ?? []).flatMap((node) => {
      const src = imageSrc(node);
      if (!src) return [];
      const ext = /\.[a-z0-9]+$/i.exec(src)?.[0] ?? '.png';
      return [{ fileName: `${node.name}${ext}`, imageUrl: absolute(siteUrl, src), altText: alt.get(`${dir}/${node.name}`) }];
    });
    const publishedAt = issue.publishDate ? `${issue.publishDate}T12:00:00.000Z` : '';
    return {
      key: `${host}:${dir}`,
      title: issue.title,
      description: issue.description?.trim() || undefined,
      contentWarnings: issue.contentWarnings ?? undefined,
      seriesKey,
      publications: issueNumber
        ? [{ url: absolute(siteUrl, `/${issueNumber}`), platform: 'Website', publishedAt }]
        : [],
      pages,
    };
  });

  return {
    siteUrl,
    host,
    personaName: readPersonaNameFromHtml(html),
    series: [{ key: seriesKey, title }],
    accounts: [{ platform: 'Website', handle: host, url: absolute(siteUrl, '/'), owner: { kind: 'series', seriesKey } }],
    comics,
  };
}

export class SiteCatalogError extends Error {}

/** Parse a site's index page-data plus its home page HTML. Throws {@link SiteCatalogError} if unrecognised. */
export function readSiteCatalog(siteUrl: string, indexPageData: unknown, homeHtml: string): SiteCatalog {
  const host = new URL(siteUrl).hostname.replace(/^www\./i, '');
  const data = (indexPageData as { result?: { data?: Record<string, unknown> } })?.result?.data;
  const comicsYaml = data?.allComicsYaml as { nodes?: ComicsYamlNode[] } | undefined;
  if (Array.isArray(comicsYaml?.nodes)) return readComicsYamlSite(siteUrl, host, comicsYaml.nodes, homeHtml);
  if (data?.allMetadataYaml && data.allFile) {
    return readIssueFolderSite(siteUrl, host, data as Parameters<typeof readIssueFolderSite>[2], homeHtml);
  }
  throw new SiteCatalogError(`${host} does not look like a comics site Lyrefly can read.`);
}

/** Fetch and read a site. Network and format failures throw; they never come back as an empty catalog. */
export async function fetchSiteCatalog(rawUrl: string, fetchImpl: typeof fetch = fetch): Promise<SiteCatalog> {
  const siteUrl = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`).origin + '/';
  const [indexRes, homeRes] = await Promise.all([
    fetchImpl(new URL('/page-data/index/page-data.json', siteUrl)),
    fetchImpl(siteUrl),
  ]);
  if (!indexRes.ok) throw new SiteCatalogError(`Could not read ${siteUrl} (HTTP ${indexRes.status}).`);
  const catalog = readSiteCatalog(siteUrl, await indexRes.json(), homeRes.ok ? await homeRes.text() : '');
  for (const comic of catalog.comics) {
    if (comic.pages || !comic.pagesSource) continue;
    const res = await fetchImpl(comic.pagesSource);
    if (!res.ok) throw new SiteCatalogError(`Could not read the pages of ${comic.title} (HTTP ${res.status}).`);
    comic.pages = readComicsYamlPages(siteUrl, await res.json());
  }
  return catalog;
}
