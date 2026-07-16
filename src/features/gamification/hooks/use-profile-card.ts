import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/use-auth";
import type { ProfileCardCode } from "@/features/gamification/domain/profile-cards";
import { equipProfileCard, fetchEquippedProfileCard } from "@/features/gamification/services/profile-card-service";

export function useProfileCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["profile-card", user?.id ?? "anon"];

  const query = useQuery({
    queryKey,
    enabled: Boolean(user),
    queryFn: fetchEquippedProfileCard,
  });

  const mutation = useMutation({
    mutationFn: (code: ProfileCardCode) => equipProfileCard(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...query,
    equip: mutation.mutateAsync,
    isEquipping: mutation.isPending,
    equipError: mutation.error,
  };
}
