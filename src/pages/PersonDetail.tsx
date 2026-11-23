import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { posterUrl, profileUrl } from "../api/images";
import { api } from "../api/endpoints";
import { translateToIndonesian } from "../api/translate";
import type { PersonCreditItem } from "../api/tmdbTypes";
import { useLanguage } from "../context/Language";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import Breadcrumbs from "../components/Breadcrumbs";
import TmdbImage from "../components/TmdbImage";
import { DetailSkeleton } from "../components/Skeleton";
import { errorMessage } from "../utils/errors";
import { formatDate, formatDepartment, formatJob, formatYear } from "../utils/format";
import { preferredTitle } from "../utils/title";

interface CreditEntry {
  item: PersonCreditItem;
  role: string;
  date: string;
  isJob: boolean;
}

function mergeCredits(cast: PersonCreditItem[], crew: PersonCreditItem[]): CreditEntry[] {
  return [
    ...cast.map((item) => ({
      item,
      role: item.character || "",
      date: item.release_date || item.first_air_date || "",
      isJob: false,
    })),
    ...crew.map((item) => ({
      item,
      role: item.job || "",
      date: item.release_date || item.first_air_date || "",
      isJob: true,
    })),
  ];
}

function ageFrom(birthday: string, until?: string | null): number | null {
  const start = new Date(birthday);
  const end = until ? new Date(until) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  let age = end.getFullYear() - start.getFullYear();
  const beforeBirthday =
    end.getMonth() < start.getMonth() ||
    (end.getMonth() === start.getMonth() && end.getDate() < start.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const { lang, copy } = useLanguage();
  const numericId = Number(id);
  const valid = Number.isInteger(numericId) && numericId > 0;

  const state = useApi(
    (signal) =>
      valid
        ? api.personDetail(numericId, signal)
        : Promise.resolve({
            ok: false as const,
            status: 404,
            code: "NOT_FOUND",
            message: copy.person.notFoundBody,
          }),
    [numericId, lang, valid, copy],
  );

  const person = state.data;
  useDocumentTitle(
    person?.name ?? (state.loading ? copy.person.loadingTitle : copy.person.fallbackTitle),
  );

  const movieCredits = useMemo(
    () =>
      mergeCredits(person?.movie_credits?.cast ?? [], person?.movie_credits?.crew ?? []).sort((a, b) =>
        (b.date || "").localeCompare(a.date || ""),
      ),
    [person],
  );
  const tvCredits = useMemo(
    () =>
      mergeCredits(person?.tv_credits?.cast ?? [], person?.tv_credits?.crew ?? []).sort((a, b) =>
        (b.date || "").localeCompare(a.date || ""),
      ),
    [person],
  );
  const filmography = useMemo(() => [...movieCredits, ...tvCredits], [movieCredits, tvCredits]);

  if (state.loading) return <DetailSkeleton />;

  if (state.error || !person) {
    const notFound = state.code === "NOT_FOUND";
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-extrabold">
          {notFound ? copy.person.notFoundTitle : copy.person.errorTitle}
        </h1>
        <p className="mt-3 text-mist">
          {notFound ? copy.person.notFoundBody : errorMessage(lang, state.code, state.error ?? "")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="btn-primary"
          >
            {copy.common.home}
          </Link>
          {!notFound && (
            <button
              type="button"
              onClick={state.reload}
              className="btn-secondary"
            >
              {copy.common.retry}
            </button>
          )}
        </div>
      </div>
    );
  }

  const biography = person.biography.trim();
  const age = person.birthday ? ageFrom(person.birthday, person.deathday) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        <div className="mx-auto w-48 md:mx-0 md:w-full">
          <TmdbImage
            kind="profile"
            src={profileUrl(person.profile_path)}
            alt={copy.common.photoAlt(person.name)}
            className="rounded-card ring-1 ring-paper/10 shadow-raise"
          />
        </div>

        <div>
          <Breadcrumbs
            items={[
              { label: copy.common.homeLabel, to: "/" },
              { label: person.name },
            ]}
          />
          <p className="text-sm text-mist">
            {formatDepartment(person.known_for_department)}
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {person.name}
          </h1>

          <dl className="mt-6 grid max-w-2xl gap-5 sm:grid-cols-2">
            {person.birthday && (
              <div>
                <dt className="text-sm text-mist">{copy.person.born}</dt>
                <dd className="mt-1 font-medium">
                  {formatDate(person.birthday)}
                  {person.deathday
                    ? copy.person.until(formatDate(person.deathday))
                    : age !== null
                      ? copy.person.age(age)
                      : ""}
                </dd>
              </div>
            )}
            {person.place_of_birth && (
              <div>
                <dt className="text-sm text-mist">{copy.person.placeOfBirth}</dt>
                <dd className="mt-1 font-medium">{person.place_of_birth}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-mist">{copy.person.popularity}</dt>
              <dd className="mt-1 font-medium">{person.popularity.toFixed(1)}</dd>
            </div>
          </dl>

          <section aria-label={copy.person.biography} className="mt-8 max-w-3xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">{copy.person.biography}</h2>
            <Biography id={person.id} text={biography} />
          </section>
        </div>
      </div>

      <CreditPosterRow
        title={copy.person.filmography}
        entries={filmography}
        emptyText={copy.person.noMovieCredits}
      />
    </div>
  );
}

function CreditPosterRow({
  title,
  entries,
  emptyText,
}: {
  title: string;
  entries: CreditEntry[];
  emptyText: string;
}) {
  const { copy } = useLanguage();
  const groups = new Map<string, CreditEntry[]>();
  for (const entry of entries) {
    const groupName = entry.isJob
      ? formatJob(entry.role)
      : copy.person.actingFilmography;
    groups.set(groupName, [...(groups.get(groupName) ?? []), entry]);
  }

  return (
    <section aria-label={title} className="mt-12">
      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-mist">{emptyText}</p>
      ) : (
        <>
          {Array.from(groups, ([groupName, groupEntries]) => (
            <section key={groupName} aria-label={groupName} className="mt-7">
              <h3 className="font-display text-lg font-semibold tracking-tight">{groupName}</h3>
              <ul className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
            {groupEntries.map((entry) => (
              <li key={`${entry.item.id}-${entry.role}-${entry.date}`} className="w-36 shrink-0 snap-start sm:w-44">
                <Link
                  to={entry.item.first_air_date ? `/serial/${entry.item.id}` : `/film/${entry.item.id}`}
                  className="group block min-h-11 rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <TmdbImage
                    kind="poster"
                    src={posterUrl(entry.item.poster_path)}
                    alt={copy.common.posterAlt(preferredTitle(
                      entry.item.title || entry.item.name || "",
                      entry.item.original_title || entry.item.original_name || "",
                      entry.item.original_language,
                    ))}
                    className="rounded-card ring-1 ring-paper/10 transition group-hover:ring-paper/30"
                  />
                  <span className="mt-2 block line-clamp-2 text-sm font-semibold leading-5 text-paper">
                    {preferredTitle(
                      entry.item.title || entry.item.name || "",
                      entry.item.original_title || entry.item.original_name || "",
                      entry.item.original_language,
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-mist">
                    {[formatYear(entry.date), entry.isJob ? "" : entry.role]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
            </section>
          ))}
        </>
      )}
    </section>
  );
}

/**
 * TMDb sering belum punya biografi bahasa Indonesia. Bila kosong, biografi
 * Inggris diterjemahkan otomatis. Bila terjemahan gagal, teks Inggris tetap
 * ditampilkan dengan catatan bahasanya.
 */
function Biography({ id, text }: { id: number; text: string }) {
  const { isEn, copy } = useLanguage();
  const fallback = useApi<{ text: string; locale: "translated" | "english" } | null>(
    async (signal) => {
      if (text || isEn) return { ok: true as const, data: null };
      const english = await api.personBioEn(id, signal);
      const biography = english.ok ? english.data.biography.trim() : "";
      if (!biography) return { ok: true as const, data: null };
      const translated = await translateToIndonesian(biography, signal);
      return {
        ok: true as const,
        data:
          translated.ok && translated.data
            ? { text: translated.data, locale: "translated" as const }
            : { text: biography, locale: "english" as const },
      };
    },
    [id, text, isEn],
  );

  if (text) {
    return <p className="mt-3 whitespace-pre-line leading-relaxed text-paper/90">{text}</p>;
  }
  if (!isEn && fallback.loading) {
    return (
      <p className="mt-3 text-sm text-mist" aria-live="polite">
        {copy.person.loadingBio}
      </p>
    );
  }
  if (fallback.data) {
    return (
      <>
        <p className="mt-3 whitespace-pre-line leading-relaxed text-paper/90">
          {fallback.data.text}
        </p>
        {fallback.data.locale === "english" && (
          <p className="mt-2 text-xs text-mist">{copy.common.englishTextNote}</p>
        )}
      </>
    );
  }
  return (
    <p className="mt-3 leading-relaxed text-paper/90">
      {copy.person.noBio}
    </p>
  );
}
