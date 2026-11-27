import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "../context/Language";
import { useWatchlist } from "../context/Watchlist";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-haze text-paper" : "text-mist hover:bg-panel hover:text-paper"
  }`;

type IconName = "home" | "movies" | "series" | "search" | "list";

const ICONS: Record<IconName, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z" />,
  movies: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7.5 4v16M16.5 4v16M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21" />
    </>
  ),
  series: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M9 21h6M12 17v4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  list: <path d="M6 4h12v16l-6-4-6 4z" />,
};

function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

const LINKS: { to: string; label: string; en: string; icon: IconName; end?: boolean }[] = [
  { to: "/", label: "Beranda", en: "Home", icon: "home", end: true },
  { to: "/katalog", label: "Film", en: "Movies", icon: "movies" },
  { to: "/serial", label: "Serial", en: "TV Series", icon: "series" },
  { to: "/cari", label: "Cari", en: "Search", icon: "search" },
];

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -right-1 -top-1 min-w-5 rounded-full bg-clix px-1 text-center text-[10px] font-bold leading-5 text-paper"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Navbar() {
  const { items } = useWatchlist();
  const { isEn, lang, copy, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const listLink = (
    <NavLink to="/daftar-saya" className={linkClass}>
      <NavIcon name="list" />
      {isEn ? "My List" : "Daftar Saya"}
      {items.length > 0 && (
        <span className="ml-1.5 rounded-full bg-clix px-1.5 py-0.5 text-xs font-semibold text-paper">
          {items.length}
        </span>
      )}
    </NavLink>
  );

  const watchlistLabel = copy.watchlist.countLabel(items.length);

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-colors duration-200 ${
        scrolled ? "border-line bg-night/95 backdrop-blur" : "border-transparent bg-night/60"
      }`}
    >
      <nav
        aria-label={isEn ? "Main navigation" : "Navigasi utama"}
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
      >
        <Link to="/" className="inline-flex min-h-11 items-center">
          <img src="/brand/logoiclix.webp" alt="iClix" className="h-8 w-auto sm:h-9" />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              <NavIcon name={link.icon} />
              {isEn ? link.en : link.label}
            </NavLink>
          ))}
          {listLink}
        </div>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label={isEn ? "Language" : "Bahasa"}
            className="flex rounded-full border border-line p-0.5"
          >
            {(["id-ID", "en-US"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`min-h-11 rounded-full px-3.5 text-xs font-semibold transition ${
                  lang === code ? "bg-haze text-paper" : "text-mist hover:text-paper"
                }`}
              >
                {code === "id-ID" ? "ID" : "EN"}
              </button>
            ))}
          </div>

          <Link
            to="/cari"
            aria-label={isEn ? "Search" : "Cari"}
            className="icon-btn lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </Link>

          <Link
            to="/daftar-saya"
            aria-label={items.length > 0 ? `${isEn ? "My List" : "Daftar Saya"}, ${watchlistLabel}` : isEn ? "My List" : "Daftar Saya"}
            className="icon-btn relative max-[360px]:hidden lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 4h12v16l-6-4-6 4z" />
            </svg>
            <CountBadge count={items.length} />
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-mobil"
            aria-label={open ? (isEn ? "Close menu" : "Tutup menu") : isEn ? "Open menu" : "Buka menu"}
            className="icon-btn lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div id="menu-mobil" className="border-t border-line bg-night px-4 pb-4 pt-2 sm:px-6 lg:hidden">
          <ul className="flex flex-col gap-1">
            {[...LINKS, { to: "/daftar-saya", label: "Daftar Saya", en: "My List", icon: "list" as const }].map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={"end" in link ? Boolean(link.end) : false}
                  className={`${linkClass} w-full`}
                >
                  <NavIcon name={link.icon} />
                  {isEn ? link.en : link.label}
                  {link.to === "/daftar-saya" && items.length > 0 && (
                    <span className="ml-2 rounded-full bg-clix px-1.5 py-0.5 text-xs font-semibold text-paper">
                      {items.length}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
