export const assertSlugOwnership = async (userId: string, slug: string): Promise<void> => {
  // TODO(#9/#24): enforce that `userId` owns `slug` via the portal_draft slug↔user
  // mapping once that D1 table lands. Until then, any authenticated user may act on
  // any slug; the seam stays here so ownership plugs in without touching callers.
  void userId;
  void slug;
};
