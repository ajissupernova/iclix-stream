import { Link } from "react-router-dom";
import { useLanguage } from "../context/Language";

interface Crumb {
  label: string;
  to?: string;
}

/** Jejak navigasi singkat supaya posisi halaman detail selalu jelas. */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { copy } = useLanguage();

  return (
    <nav aria-label={copy.common.breadcrumb} className="text-sm">
      <ol className="flex flex-wrap items-center">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center">
            {index > 0 && (
              <span aria-hidden="true" className="px-1.5 text-haze">
                /
              </span>
            )}
            {item.to ? (
              <Link
                to={item.to}
                className="inline-flex min-h-11 items-center text-mist transition hover:text-paper"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current="page"
                className="inline-flex min-h-11 max-w-[18rem] items-center truncate font-medium text-paper"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
