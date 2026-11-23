import { Link } from "react-router-dom";
import { profileUrl } from "../api/images";
import type { CastMember } from "../api/tmdbTypes";
import { useLanguage } from "../context/Language";
import TmdbImage from "./TmdbImage";

export default function CastCard({ person }: { person: CastMember }) {
  const { copy } = useLanguage();

  return (
    <li>
      <Link to={`/orang/${person.id}`} className="group block rounded-lg">
        <TmdbImage
          kind="profile"
          src={profileUrl(person.profile_path)}
          alt={copy.common.photoAlt(person.name)}
          className="rounded-card ring-1 ring-paper/10 transition-transform duration-200 focus-visible:-translate-y-1 group-hover:-translate-y-1 group-hover:ring-paper/30"
        />
        <p className="mt-2 text-sm font-semibold text-paper">{person.name}</p>
        {person.character && (
          <p className="mt-0.5 line-clamp-2 text-xs text-mist">{copy.common.castAs(person.character)}</p>
        )}
      </Link>
    </li>
  );
}
