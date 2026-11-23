import type { ReactNode } from "react";

interface Props {
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="panel mt-8 px-6 py-10 text-center">
      <svg
        viewBox="0 0 48 48"
        className="mx-auto h-10 w-10 text-haze"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect x="6" y="10" width="36" height="28" rx="4" />
        <path d="M11 10v28M37 10v28M11 18h5M11 30h5M32 18h5M32 30h5" />
      </svg>
      <h2 className="mt-4 text-balance font-display text-xl font-bold text-paper">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mist">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
