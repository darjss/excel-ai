import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import { api, unwrap } from "@/lib/api";

const draftKey = (jobId: string) => ["review", jobId];

export const useClaimDraft = () =>
  useMutation(() => ({
    mutationFn: async (jobId: string) => unwrap(await api.review({ jobId }).claim.post()),
  }));

export const useDraft = (jobId: () => string, enabled: () => boolean) =>
  useQuery(() => ({
    queryKey: draftKey(jobId()),
    queryFn: async () => unwrap(await api.review({ jobId: jobId() }).draft.get()),
    enabled: enabled(),
  }));

export const useFindingDecision = (jobId: () => string) => {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: async (input: { findingId: string; accepted: boolean }) =>
      unwrap(await api.review({ jobId: jobId() }).finding.post(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: draftKey(jobId()) }),
  }));
};

export const useEditBusinessName = (jobId: () => string) => {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: async (name: string) =>
      unwrap(await api.review({ jobId: jobId() }).business.post({ name })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: draftKey(jobId()) }),
  }));
};

export const usePublishPortal = (jobId: () => string) =>
  useMutation(() => ({
    mutationFn: async (slug: string) =>
      unwrap(await api.review({ jobId: jobId() }).publish.post({ slug })),
  }));

export const fetchSlugAvailability = async (slug: string) =>
  unwrap(await api.review["slug-available"].get({ query: { slug } }));
