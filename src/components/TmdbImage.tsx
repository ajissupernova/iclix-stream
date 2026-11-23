import { useState } from "react";

export type ImageKind = "poster" | "backdrop" | "profile" | "still";

interface Props {
  kind: ImageKind;
  src: string | null;
  alt: string;
  className?: string;
  /** Gambar pertama di layar dimuat tanpa lazy agar LCP tidak tertunda. */
  eager?: boolean;
  /** Isi penuh wadah induk (untuk latar hero) tanpa rasio bawaan. */
  fill?: boolean;
  /** Versi resolusi penuh yang dipakai browser hanya pada layar lebar. */
  highResSrc?: string | null;
  /** Artwork alternatif yang dipilih khusus untuk layar kecil. */
  mobileSrc?: string | null;
  /** Lebar viewport minimum (px) untuk memakai highResSrc. */
  highResFrom?: number;
  /** Daftar kandidat gambar untuk srcset, misalnya poster w185/w342/w500. */
  srcSet?: string | null;
  /** Petunjuk lebar tampil agar browser memilih kandidat srcset yang tepat. */
  sizes?: string;
}

const KIND_STYLE: Record<ImageKind, { aspect: string; width: number; height: number }> = {
  poster: { aspect: "aspect-[2/3]", width: 500, height: 750 },
  backdrop: { aspect: "aspect-video", width: 1280, height: 720 },
  profile: { aspect: "aspect-[2/3]", width: 185, height: 278 },
  still: { aspect: "aspect-video", width: 300, height: 169 },
};

function Placeholder({ alt }: { alt: string }) {
  return (
    <div role="img" aria-label={alt} className="flex h-full w-full items-center justify-center bg-dusk">
      <svg viewBox="0 0 48 48" className="h-8 w-8 text-haze" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="8" y="12" width="32" height="24" rx="2" />
        <path d="M8 18h32M8 30h32M14 12v6M14 24v6M14 36v-6M34 12v6M34 24v6M34 36v-6" />
      </svg>
    </div>
  );
}

export default function TmdbImage({
  kind,
  src,
  alt,
  className = "",
  eager = false,
  fill = false,
  highResSrc = null,
  mobileSrc = null,
  highResFrom = 1280,
  srcSet = null,
  sizes,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const style = KIND_STYLE[kind];
  const showImage = Boolean(src) && !failed;
  const frame = fill ? "h-full w-full" : style.aspect;
  const useHighRes = Boolean(highResSrc) && highResSrc !== src;

  const image = (
    <img
      src={src as string}
      srcSet={srcSet ?? undefined}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={style.width}
      height={style.height}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );

  const responsiveImage = mobileSrc || useHighRes ? (
    <picture>
      {mobileSrc && <source media="(max-width: 639px)" srcSet={mobileSrc} />}
      {useHighRes && <source media={`(min-width: ${highResFrom}px)`} srcSet={highResSrc as string} />}
      {image}
    </picture>
  ) : image;

  return (
    <div className={`relative overflow-hidden bg-dusk ${frame} ${className}`}>
      {!showImage && <Placeholder alt={alt} />}
      {showImage && !loaded && (
        <div className="absolute inset-0 animate-pulse bg-haze/40" aria-hidden="true" />
      )}
      {showImage && responsiveImage}
    </div>
  );
}
