import { useState } from "react";

/** Logo resmi dari halaman atribusi TMDb. */
const TMDB_LOGO =
  "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg";

/**
 * Bila aset TMDb diblokir jaringan, teks nama sumber tetap tampil
 * supaya atribusi tidak hilang.
 */
export default function TmdbLogo({ className = "" }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <p className={`font-display text-sm font-bold text-paper ${className}`}>
        The Movie Database
      </p>
    );
  }

  return (
    <img
      src={TMDB_LOGO}
      alt="The Movie Database (TMDb) logo"
      width={280}
      height={39}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`h-8 w-auto ${className}`}
    />
  );
}
