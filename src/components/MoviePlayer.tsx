import { useLanguage } from "../context/Language";
import TmdbImage from "./TmdbImage";

interface Props {
  title: string;
  src?: string | null;
  subtitleSrc?: string | null;
  backdropSrc?: string | null;
  embedUrl?: string | null;
}

export default function MoviePlayer({ title, src, subtitleSrc, backdropSrc, embedUrl }: Props) {
  const { copy } = useLanguage();

  return (
    <section
      aria-labelledby="movie-player-heading"
      className="relative isolate mt-4 overflow-hidden py-7 sm:py-10"
    >
      {backdropSrc && (
        <div className="absolute inset-0 -z-10">
          <TmdbImage kind="backdrop" fill eager src={backdropSrc} alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-night/75 via-night/80 to-night" />
        </div>
      )}
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 id="movie-player-heading" className="mb-3 font-display text-2xl font-bold tracking-tight">
          {copy.movie.playerHeading}
        </h2>
        <div className="aspect-video overflow-hidden rounded-panel border border-line bg-black">
          {embedUrl ? (
            <iframe
              key={embedUrl}
              src={embedUrl}
              title={copy.movie.playerFor(title)}
              width="100%"
              height="100%"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="origin"
              className="h-full w-full border-0"
            />
          ) : src ? (
            <video
              key={src}
              controls
              playsInline
              preload="metadata"
              width={1280}
              height={720}
              aria-label={copy.movie.playerFor(title)}
              className="h-full w-full"
            >
              <source src={src} />
              {subtitleSrc && (
                <track
                  kind="subtitles"
                  src={subtitleSrc}
                  srcLang="id"
                  label={copy.movie.indonesianSubtitles}
                  default
                />
              )}
            </video>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-5 text-center">
              <p className="font-semibold text-paper">{copy.movie.playerUnavailable}</p>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-mist">
                {copy.movie.playerSourceNote}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}