import { useLanguage } from "../context/Language";
import TmdbImage from "./TmdbImage";

interface Props {
  title: string;
  src?: string | null;
  subtitleSrc?: string | null;
  subtitleLabel?: string;
  backdropSrc?: string | null;
  embedUrl?: string | null;
}

export default function MoviePlayer({
  title,
  src,
  subtitleSrc,
  subtitleLabel,
  backdropSrc,
  embedUrl,
}: Props) {
  const { copy } = useLanguage();
  const iframeUrl = embedUrl
    ? new URL(embedUrl)
    : null;

  if (iframeUrl) {
    iframeUrl.searchParams.set("skin", "onyx");
    iframeUrl.searchParams.set("welcome_page", "off");
    iframeUrl.searchParams.set("autoplay", "off");
    if (subtitleSrc) {
      iframeUrl.searchParams.append("sub_url[]", subtitleSrc);
      iframeUrl.searchParams.append("sub_label[]", subtitleLabel || copy.movie.indonesianSubtitles);
    }
  }

  return (
    <section
      id="movie-player"
      aria-label={copy.movie.playerHeading}
      className="relative isolate overflow-hidden py-4 sm:py-8"
    >
      {backdropSrc && (
        <div className="absolute inset-0 -z-10">
          <TmdbImage kind="backdrop" fill eager src={backdropSrc} alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-night/75 via-night/80 to-night" />
        </div>
      )}
      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        <div className="aspect-video overflow-hidden rounded-panel border border-line bg-black">
          {embedUrl ? (
            <iframe
              key={iframeUrl?.toString()}
              src={iframeUrl?.toString()}
              title={copy.movie.playerFor(title)}
              width="100%"
              height="100%"
              allow="fullscreen *; picture-in-picture *; encrypted-media *"
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
