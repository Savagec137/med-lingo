import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/use-auth";

type ProfileCosmetics = {
  avatarCode: string | null;
  badgeCode: string | null;
};

const DEFAULT_SELECTION: ProfileCosmetics = {
  avatarCode: null,
  badgeCode: null,
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function useProfileCosmetics() {
  const { user } = useAuth();
  const storageKey = useMemo(
    () => `medlingo:profile-cosmetics:${user?.id ?? "guest"}`,
    [user?.id],
  );
  const [selection, setSelection] = useState<ProfileCosmetics>(DEFAULT_SELECTION);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!isBrowser()) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setSelection(DEFAULT_SELECTION);
        setHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<ProfileCosmetics>;
      setSelection({
        avatarCode: typeof parsed.avatarCode === "string" ? parsed.avatarCode : null,
        badgeCode: typeof parsed.badgeCode === "string" ? parsed.badgeCode : null,
      });
    } catch {
      setSelection(DEFAULT_SELECTION);
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  const updateSelection = useCallback(
    (partial: Partial<ProfileCosmetics>) => {
      setSelection((current) => {
        const next = { ...current, ...partial };
        if (isBrowser()) {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        }
        return next;
      });
    },
    [storageKey],
  );

  return {
    ...selection,
    hydrated,
    equipAvatar: (avatarCode: string | null) => updateSelection({ avatarCode }),
    equipBadge: (badgeCode: string | null) => updateSelection({ badgeCode }),
  };
}
