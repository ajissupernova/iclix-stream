import { useEffect } from "react";

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title.trim() === "" ? "iClix" : `${title.trim()} · iClix`;
  }, [title]);
}
