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
  });
}

export function useGameInventory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["game-inventory", user?.id ?? "anon"],
    enabled: Boolean(user),
    queryFn: fetchGameInventory,
  });
}

export function useInvalidateGameEconomy() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["game-currency"] });
    queryClient.invalidateQueries({ queryKey: ["game-inventory"] });
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };
}
