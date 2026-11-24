export type SpotlightMode = "popular" | "trending" | "random" | "manual";
export type HomeSectionKey =
  | "trending"
  | "popular-movies"
  | "top-rated"
  | "now-playing"
  | "upcoming"
  | "popular-tv"
  | "trending-tv"
  | "top-rated-tv";

export interface CuratedTitle {
  id: number;
  type: "movie" | "tv";
  watchOrder?: string;
  label?: string;
  /** Path poster TMDb, disimpan agar admin dan halaman publik tetap menampilkan poster tanpa permintaan ulang. */
  posterPath?: string;
  desktopBackdropPath?: string;
  mobileBackdropPath?: string;
  desktopBackdropCrop?: { x: number; y: number };
  mobileBackdropCrop?: { x: number; y: number };
}

export type CollectionSectionKind = "watch-order" | "titles" | "text";

export interface CollectionSection {
  id: string;
  title: string;
  kind: CollectionSectionKind;
  description?: string;
  titleIds?: CuratedTitle[];
}

/** Satu baris geser berisi beberapa koleksi thumbnail, tampil sebagai satu section di beranda. */
export interface CollectionGroup {
  id: string;
  title: string;
  collectionIds: string[];
}

export interface CuratedCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  logoUrl: string;
  backdropUrl: string;
  homeStyle: "banner" | "tile";
  homeCrop: { x: number; y: number };
  pageCrop: { x: number; y: number };
  showOnHome: boolean;
  titleIds: CuratedTitle[];
  sections: CollectionSection[];
}

export interface HomeSection {
  id: string;
  kind: "catalog" | "collection" | "collection-group";
  key?: HomeSectionKey;
  collectionId?: string;
  groupId?: string;
  title?: string;
  visible: boolean;
}

export interface SiteContent {
  spotlight: { mode: SpotlightMode; titleIds: CuratedTitle[] };
  homeSections: HomeSection[];
  collections: CuratedCollection[];
  collectionGroups: CollectionGroup[];
  announcement: { enabled: boolean; text: string };
  updatedAt: string | null;
}

export interface SiteContentEnvelope {
  published: SiteContent;
  draft: SiteContent;
  history: Array<{ savedAt: string; label: string }>;
  configured: boolean;
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  spotlight: { mode: "trending", titleIds: [] },
  homeSections: [
    { id: "trending", kind: "catalog", key: "trending", visible: true },
    { id: "popular-movies", kind: "catalog", key: "popular-movies", visible: true },
    { id: "top-rated", kind: "catalog", key: "top-rated", visible: true },
    { id: "now-playing", kind: "catalog", key: "now-playing", visible: true },
    { id: "upcoming", kind: "catalog", key: "upcoming", visible: true },
    { id: "popular-tv", kind: "catalog", key: "popular-tv", visible: true },
    { id: "trending-tv", kind: "catalog", key: "trending-tv", visible: true },
    { id: "top-rated-tv", kind: "catalog", key: "top-rated-tv", visible: true },
  ],
  collections: [],
  collectionGroups: [],
  announcement: { enabled: false, text: "" },
  updatedAt: null,
};
