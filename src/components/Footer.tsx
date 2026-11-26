import { Link } from "react-router-dom";
import { useLanguage } from "../context/Language";

export default function Footer() {
  const { copy } = useLanguage();

  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-sm">
          <img src="/brand/logoiclix.webp" alt="iClix" className="h-6 w-auto" />
          <p className="mt-2 text-sm leading-relaxed text-mist">{copy.footer.tagline}</p>
        </div>
        <nav aria-label={copy.footer.navLabel} className="flex flex-wrap gap-2">
          <Link to="/daftar-saya" className="btn-secondary">
            {copy.footer.myList}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
