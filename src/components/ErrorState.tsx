import { useLanguage } from "../context/Language";
import { errorMessage } from "../utils/errors";

interface Props {
  message: string;
  code?: string | null;
  onRetry?: () => void;
  compact?: boolean;
}

export default function ErrorState({ message, code, onRetry, compact = false }: Props) {
  const { lang, copy } = useLanguage();
  const text = errorMessage(lang, code, message);
  const isConfig = code === "NO_KEY" || text.includes("TMDB_API_KEY");

  return (
    <div
      role="alert"
      className={`rounded-panel border border-line bg-dusk text-center ${compact ? "px-4 py-5" : "px-6 py-10"}`}
    >
      <p className={`font-display font-bold text-paper ${compact ? "text-base" : "text-xl"}`}>
        {isConfig ? copy.errors.configTitle : copy.errors.title}
      </p>
      <p className={`mx-auto mt-2 max-w-lg leading-relaxed text-mist ${compact ? "text-xs" : "text-sm"}`}>
        {text}
      </p>
      {isConfig && !text.includes(".env.example") && (
        <p className="mx-auto mt-2 max-w-lg text-xs text-mist/80">{copy.errors.configHint}</p>
      )}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary mt-5">
          {copy.common.retry}
        </button>
      )}
    </div>
  );
}
