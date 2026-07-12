import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LanguageIcon from '@mui/icons-material/Language';
import PublicIcon from '@mui/icons-material/Public';
import RedditIcon from '@mui/icons-material/Reddit';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import type { SvgIconComponent } from '@mui/icons-material';

const PLATFORM_ICONS: Readonly<Record<string, SvgIconComponent>> = {
  Tapas: PublicIcon,
  WEBTOON: PublicIcon,
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
  X: XIcon,
  Twitter: XIcon,
  YouTube: YouTubeIcon,
  Reddit: RedditIcon,
  Tumblr: PublicIcon,
  TikTok: PublicIcon,
  Patreon: PublicIcon,
  'itch.io': LanguageIcon,
  Gumroad: LanguageIcon,
  Substack: LanguageIcon,
  Bluesky: PublicIcon,
  Threads: InstagramIcon,
  pixiv: LanguageIcon,
  DeviantArt: LanguageIcon,
  Mastodon: PublicIcon,
  'Ko-fi': LanguageIcon,
};

export function publishPlatformIcon(platform: string): SvgIconComponent {
  return PLATFORM_ICONS[platform] ?? LanguageIcon;
}

export function formatPublicationLinkLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    const label = `${host}${path}`;
    return label.length > 42 ? `${label.slice(0, 40)}…` : label;
  } catch {
    return url.length > 42 ? `${url.slice(0, 40)}…` : url;
  }
}
