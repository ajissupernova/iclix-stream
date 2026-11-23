import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../context/Language";
import { trailerUrl } from "../utils/trailer";

interface Props {
  trailerKey: string;
  title: string;
  className?: string;
}

/**
 * Trailer diputar di dialog native: Escape menutup, fokus terkunci di dalam
 * dialog, dan iframe dilepas saat ditutup supaya audio benar-benar berhenti.
 */
export default function TrailerButton({ trailerKey, title, className = "" }: Props) {
  const { copy } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-11 shrink-0 items-center rounded-full border border-line bg-night/70 px-5 py-2.5 text-sm font-semibold text-paper transition hover:border-lineStrong hover:bg-panel ${className}`}
      >
        {copy.common.trailer}
        <span className="sr-only"> {copy.common.trailerDialogNote}</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label={`${copy.common.trailerDialog}: ${title}`}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
        className="w-[min(56rem,calc(100vw-2rem))] rounded-panel border border-line bg-night p-4 text-paper shadow-raise"
      >
        {open && (
          <div>
            <div className="flex items-center justify-between gap-3 pb-3">
              <p className="min-w-0 truncate font-display text-base font-bold">{title}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={copy.common.close}
                className="icon-btn shrink-0"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-card bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
                title={`${copy.common.trailerDialog}: ${title}`}
                width={1280}
                height={720}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
            <a
              href={trailerUrl(trailerKey)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-mist transition hover:text-paper"
            >
              {copy.common.openYouTube}
              <span className="sr-only"> {copy.common.trailerNewTab}</span>
            </a>
          </div>
        )}
      </dialog>
    </>
  );
}
