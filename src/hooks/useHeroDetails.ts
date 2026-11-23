import { useEffect, useState } from "react";
import type { ApiLanguage } from "../api/client";
import { api } from "../api/endpoints";
import type { MovieDetail, TvDetail } from "../api/tmdbTypes";
import type { CuratedTitle } from "../api/siteConfig";
import { localizeTextFields, type TextLocaleInfo } from "../utils/localize";

export interface HeroMovie extends MovieDetail {
  mediaType: "movie";
  textLocale?: TextLocaleInfo;
}

export interface HeroTv extends TvDetail {
  mediaType: "tv";
  textLocale?: TextLocaleInfo;
}

export type HeroTitle = HeroMovie | HeroTv;

interface HeroDetailsState {
  items: HeroTitle[];
  loading: boolean;
  error: string | null;
}

/**
 * Mengambil detail (runtime, genre, tagline, trailer, logo) untuk beberapa id film
 * yang dipilih sebagai hero. Hasil per id yang gagal dilewati, bukan menggagalkan hero.
 */
export function useHeroDetails(titles: CuratedTitle[], lang: ApiLanguage): HeroDetailsState {
  const [state, setState] = useState<HeroDetailsState>({ items: [], loading: false, error: null });
  const idKey = titles.map((item) => `${item.type}:${item.id}`).join(",");

  useEffect(() => {
    if (idKey === "") {
      setState({ items: [], loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const requested = titles.map((item) => ({ id: item.id, type: item.type }));
    const localizeTitle = async (item: HeroTitle): Promise<HeroTitle> => {
      if (lang === "en-US" || (item.overview.trim() && item.tagline.trim())) return item;
      if (item.mediaType === "movie") {
        const localized = await localizeTextFields<MovieDetail>(
          item,
          () => api.movieDetailEn(item.id, controller.signal),
          controller.signal,
        );
        return { ...localized.data, mediaType: "movie", textLocale: localized.locale };
      }
      const localized = await localizeTextFields<TvDetail>(
        item,
        () => api.tvDetailEn(item.id, controller.signal),
        controller.signal,
      );
      return { ...localized.data, mediaType: "tv", textLocale: localized.locale };
    };

    void Promise.all(requested.map(async ({ id, type }) => {
      const response = type === "movie"
        ? await api.movieHero(id, controller.signal)
        : await api.tvHero(id, controller.signal);
      if (!response.ok) return null;
      return type === "movie"
        ? { ...response.data, mediaType: "movie" as const }
        : { ...response.data, mediaType: "tv" as const };
    }))
      .then((results) => Promise.all(results.filter((item): item is HeroTitle => item !== null).map(localizeTitle)))
      .then((items) => {
        if (!active) return;
        setState({
          items,
          loading: false,
          error: items.length === 0 ? "Pilihan spotlight tidak bisa dimuat." : null,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [idKey, lang]);

  return state;
}
