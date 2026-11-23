import { useMemo, useState } from "react";
import { logoUrl } from "../api/images";
import type { ImageAsset } from "../api/tmdbTypes";
import { pickTitleLogo } from "../utils/artwork";

interface Props {
  logos: ImageAsset[] | undefined;
  title: string;
  className?: string;
}

/** Logo judul resmi dari TMDb, dengan teks judul sebagai cadangan bila logo tidak tersedia. */
export default function TitleLogo({ logos, title, className = "" }: Props) {
  const logo = useMemo(() => pickTitleLogo(logos), [logos]);
  const [failed, setFailed] = useState(false);

  if (!logo || failed) return <>{title}</>;

  return (
    <img
      src={logoUrl(logo.file_path) ?? undefined}
      alt={title}
      width={logo.width}
      height={logo.height}
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
      className={`block h-auto w-auto max-w-full object-contain object-left ${className}`}
    />
  );
}
