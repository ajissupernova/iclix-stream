import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "../context/Language";
import { useWatchlist } from "../context/Watchlist";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `min-h-11 rounded-full px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-haze text-paper" : "text-mist hover:bg-panel hover:text-paper"
  }`;

const LINKS = [
  { to: "/", label: "Beranda", en: "Home", end: true },
  { to: "/katalog", label: "Film", en: "Movies" },
  { to: "/serial", label: "Serial", en: "TV Series" },
  { to: "/cari", label: "Cari", en: "Search" },
  { to: "/tentang", label: "Tentang", en: "About" },
];

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -right-1 -top-1 min-w-5 rounded-full bg-clix px-1 text-center text-[10px] font-bold leading-5 text-night"
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
      {isEn ? "My List" : "Daftar Saya"}
      {items.length > 0 && (
        <span className="ml-1.5 rounded-full bg-clix px-1.5 py-0.5 text-xs font-semibold text-night">
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
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </Link>

          <Link
            to="/daftar-saya"
            aria-label={items.length > 0 ? `${isEn ? "My List" : "Daftar Saya"}, ${watchlistLabel}` : isEn ? "My List" : "Daftar Saya"}
            className="icon-btn relative lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
            {[...LINKS, { to: "/daftar-saya", label: "Daftar Saya", en: "My List" }].map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={"end" in link ? Boolean(link.end) : false}
                  className={`${linkClass} block`}
                >
                  {isEn ? link.en : link.label}
                  {link.to === "/daftar-saya" && items.length > 0 && (
                    <span className="ml-2 rounded-full bg-clix px-1.5 py-0.5 text-xs font-semibold text-night">
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
