import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import type { Accessor } from "solid-js";
import { api, unwrap } from "@/lib/api";

const buyerLinksKey = (slug: string) => ["buyer-links", slug];

export const usePortalSlugs = () =>
  useQuery(() => ({
    queryKey: ["buyer-links", "portals"],
    queryFn: async () => unwrap(await api["buyer-links"].portals.get()),
  }));

export const useBuyerLinks = (slug: Accessor<string>) =>
  useQuery(() => ({
    queryKey: buyerLinksKey(slug()),
    queryFn: async () => unwrap(await api["buyer-links"]({ slug: slug() }).get()),
    enabled: slug().length > 0,
  }));

export const useCreateBuyerLink = (slug: Accessor<string>) => {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: async (input: { buyerName: string; contact?: string }) =>
      unwrap(await api["buyer-links"]({ slug: slug() }).post(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: buyerLinksKey(slug()) }),
  }));
};

export const useRevokeBuyerLink = (slug: Accessor<string>) => {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: async (token: string) =>
      unwrap(await api["buyer-links"]({ slug: slug() })({ token }).delete()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: buyerLinksKey(slug()) }),
  }));
};
