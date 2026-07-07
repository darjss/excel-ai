export const portalHref = (basePath: string, path: string): string => {
  const joined = `${basePath}${path}`;
  return joined.length === 0 ? "/" : joined;
};

export const assertNever = (value: never): never => {
  throw new Error(`Unhandled portal section: ${String(value)}`);
};
