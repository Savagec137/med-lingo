import { useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthSnapshot {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const SERVER_SNAPSHOT: AuthSnapshot = {
  session: null,
  user: null,
  loading: true,
};

let authSnapshot: AuthSnapshot = SERVER_SNAPSHOT;
let authStarted = false;
const authListeners = new Set<() => void>();

function publishAuthSnapshot(next: AuthSnapshot) {
  if (
    authSnapshot.session === next.session &&
    authSnapshot.user === next.user &&
    authSnapshot.loading === next.loading
  ) {
    return;
  }
  authSnapshot = next;
  authListeners.forEach((listener) => listener());
}

function startAuthStore() {
  if (authStarted || typeof window === "undefined") return;
  authStarted = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    publishAuthSnapshot({
      session,
      user: session?.user ?? null,
      loading: false,
    });
  });

  void supabase.auth.getSession().then(({ data }) => {
    publishAuthSnapshot({
      session: data.session,
      user: data.session?.user ?? null,
      loading: false,
    });
  });
}

function subscribeAuth(listener: () => void) {
  authListeners.add(listener);
  startAuthStore();
  return () => {
    authListeners.delete(listener);
  };
}

export function useAuth() {
  return useSyncExternalStore(
    subscribeAuth,
    () => authSnapshot,
    () => SERVER_SNAPSHOT,
  );
}

export async function signOut() {
  await supabase.auth.signOut();
}
