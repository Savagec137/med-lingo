import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/use-auth";
import {
  fetchGameCurrency,
  fetchGameInventory,
} from "@/features/gamification/services/game-service";

export function useGameCurrency() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["game-currency", user?.id ?? "anon"],
    enabled: Boolean(user),
    queryFn: fetchGameCurrency,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useGameInventory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["game-inventory", user?.id ?? "anon"],
    enabled: Boolean(user),
    queryFn: fetchGameInventory,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useInvalidateGameEconomy() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["game-currency"] });
    queryClient.invalidateQueries({ queryKey: ["game-inventory"] });
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["home-dashboard"] });
  };
}
