import { useLanguage } from "../context/Language";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import TmdbLogo from "../components/TmdbLogo";

export default function About() {
  const { copy } = useLanguage();
  useDocumentTitle(copy.about.title);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {copy.about.title}
      </h1>

      <section aria-label={copy.about.featuresHeading} className="mt-8">
        <h2 className="text-balance font-display text-xl font-bold sm:text-2xl">
          {copy.about.featuresHeading}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-paper/90">
          {copy.about.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section aria-label={copy.about.dataHeading} className="panel mt-8 p-5 sm:p-6">
        <h2 className="text-balance font-display text-xl font-bold sm:text-2xl">
          {copy.about.dataHeading}
        </h2>
        <p className="mt-3 leading-relaxed text-paper/90">{copy.about.dataBody}</p>
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={copy.footer.tmdbLink}
          className="mt-4 inline-flex min-h-11 items-center rounded-md"
        >
          <TmdbLogo />
        </a>
      </section>

      <section aria-label={copy.about.privacyHeading} className="mt-8">
        <h2 className="text-balance font-display text-xl font-bold sm:text-2xl">
          {copy.about.privacyHeading}
        </h2>
        <p className="mt-3 leading-relaxed text-paper/90">{copy.about.privacyBody}</p>
      </section>

    </div>
  );
}
