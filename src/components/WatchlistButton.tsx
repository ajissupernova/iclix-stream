import { useLanguage } from "../context/Language";
import { useToast } from "../context/Toast";
import { useWatchlist, type WatchItem } from "../context/Watchlist";

interface Props {
  item: WatchItem;
  /** Judul asli dari TMDb, untuk label aksesibel tombol. */
  title: string;
  /** "icon" untuk tombol bulat di kartu, "full" untuk tombol berteks. */
  variant?: "icon" | "full";
  className?: string;
}

export default function WatchlistButton({ item, title, variant = "full", className = "" }: Props) {
  const { copy } = useLanguage();
  const { notify } = useToast();
  const { has, toggle } = useWatchlist();
  const saved = has(item);
  const label = saved ? copy.watchlist.removeLabel(title) : copy.watchlist.addLabel(title);
  const titleText = saved ? copy.watchlist.remove : copy.watchlist.add;

  const onClick = () => {
    notify(saved ? copy.watchlist.removed(title) : copy.watchlist.added(title));
    toggle(item);
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={label}
        title={titleText}
        className={`flex h-11 w-11 items-center justify-center rounded-full border transition duration-150 active:scale-95 ${
          saved
            ? "border-clix bg-clix text-night hover:bg-clixDeep"
            : "border-line bg-night/80 text-paper hover:border-lineStrong hover:bg-panel"
        } ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {saved ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 5v14M5 12h14" />}
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition duration-150 active:scale-[0.98] ${
        saved
          ? "border-clix bg-clix/15 text-paper hover:bg-clix/25"
          : "border-line bg-dusk text-paper hover:border-lineStrong hover:bg-panel"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {saved ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 5v14M5 12h14" />}
      </svg>
      {saved ? copy.watchlist.saved : copy.watchlist.add}
    </button>
  );
}
