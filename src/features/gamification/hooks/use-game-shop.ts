import { useQuery } from "@tanstack/react-query";
import { fetchGameShop } from "@/features/gamification/services/game-service";

export function useGameShop() {
  return useQuery({ queryKey: ["game-shop"], queryFn: fetchGameShop, staleTime: 5 * 60 * 1000 });
}
