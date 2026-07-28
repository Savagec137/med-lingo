import { useQuery } from "@tanstack/react-query";
import { fetchGameShop } from "@/features/gamification/services/game-service";

export function useGameShop() {
  return useQuery({
    queryKey: ["game-shop"],
    queryFn: fetchGameShop,
    staleTime: 24 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
  });
}
