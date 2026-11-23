import { Link } from "react-router-dom";
import { useLanguage } from "../context/Language";
import TmdbLogo from "./TmdbLogo";

export default function Footer() {
  const { copy } = useLanguage();

  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-sm">
          <p className="font-display text-lg font-bold text-paper">
            <span className="text-brand">i</span>Clix
          </p>
          <p className="mt-2 text-sm leading-relaxed text-mist">{copy.footer.tagline}</p>
        </div>
        <nav aria-label={copy.footer.navLabel} className="flex flex-wrap gap-2">
          <Link to="/daftar-saya" className="btn-secondary">
            {copy.footer.myList}
          </Link>
          <Link to="/tentang" className="btn-secondary">
            {copy.footer.about}
          </Link>
        </nav>
      </div>
      <div className="border-t border-line/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs leading-relaxed text-mist">{copy.footer.attribution}</p>
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={copy.footer.tmdbLink}
            className="inline-flex min-h-11 items-center self-start rounded-md opacity-80 transition hover:opacity-100 sm:self-auto"
          >
            <TmdbLogo />
          </a>
        </div>
      </div>
    </footer>
  );
}
