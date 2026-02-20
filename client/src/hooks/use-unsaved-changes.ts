import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useUnsavedChanges(hasUnsavedChanges: boolean) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const confirmNavigation = useCallback(
    (navigateFn: () => void) => {
      if (hasUnsavedChanges) {
        const confirmed = window.confirm(
          t("common.unsavedChangesWarning", "You have unsaved changes. Are you sure you want to leave this page?")
        );
        if (confirmed) navigateFn();
      } else {
        navigateFn();
      }
    },
    [hasUnsavedChanges, t]
  );

  return { confirmNavigation };
}
