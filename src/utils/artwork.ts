import type { ImageAsset } from "../api/tmdbTypes";

/**
 * Logo judul di TMDb tercatat per bahasa. Versi Inggris paling sering tersedia dan
 * paling setia pada artwork rilis, jadi urutannya: Inggris, netral bahasa, lalu sisanya.
 */
export function pickTitleLogo(logos: ImageAsset[] | undefined): ImageAsset | null {
  const usable = (logos ?? []).filter((logo) => /\.(png|webp)$/i.test(logo.file_path));
  if (usable.length === 0) return null;

  const languageRank = (logo: ImageAsset) => (logo.iso_639_1 === "en" ? 0 : logo.iso_639_1 ? 2 : 1);
  return [...usable].sort(
    (a, b) => languageRank(a) - languageRank(b) || b.vote_average - a.vote_average,
  )[0];
}
