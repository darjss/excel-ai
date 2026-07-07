import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import { api, unwrap } from "@/lib/api";
import type { EditLineInput, ManualOrderInput } from "@/server/orders/edit";
import type { OrderStatus } from "@/server/orders/order";

const ordersKey = (slug: string) => ["orders", slug];
const configKey = (slug: string) => ["supplier-config", slug];

export const useSupplierConfig = (slug: () => string) =>
  useQuery(() => ({
    queryKey: configKey(slug()),
    queryFn: async () => unwrap(await api.supplier({ slug: slug() }).config.get()),
    staleTime: 5 * 60_000,
  }));

export const useSupplierOrders = (slug: () => string) =>
  useInfiniteQuery(() => ({
    queryKey: ordersKey(slug()),
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api
          .supplier({ slug: slug() })
          .orders.get({ query: { take: 50, cursor: pageParam ?? undefined } }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  }));

export const useUpdateOrderStatus = (slug: () => string) => {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: async (input: { id: string; status: OrderStatus }) =>
      unwrap(
        await api.supplier({ slug: slug() }).orders({ id: input.id }).status.patch({
          status: input.status,
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey(slug()) }),
  }));
};

export const useEditOrderLines = (slug: () => string) => {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: async (input: { id: string; lines: EditLineInput[] }) =>
      unwrap(
        await api.supplier({ slug: slug() }).orders({ id: input.id }).lines.put({
          lines: input.lines,
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey(slug()) }),
  }));
};

export const useCreateManualOrder = (slug: () => string) => {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: async (input: ManualOrderInput) =>
      unwrap(
        await api
          .supplier({ slug: slug() })
          .orders.post({ buyer: input.buyer, lines: [...input.lines] }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey(slug()) }),
  }));
};
