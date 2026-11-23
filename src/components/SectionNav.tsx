interface Item {
  id: string;
  label: string;
}

/**
 * Navigasi bagian untuk halaman detail yang panjang. Tautan memakai jangkar
 * nyata ke id yang ada, jadi tetap berfungsi tanpa JavaScript tambahan.
 */
export default function SectionNav({ items, label }: { items: Item[]; label: string }) {
  return (
    <nav
      aria-label={label}
      className="sticky top-[4.25rem] z-20 border-y border-line bg-night/95 backdrop-blur"
    >
      <ul className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-1.5 sm:px-6">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium text-mist transition hover:bg-panel hover:text-paper"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
