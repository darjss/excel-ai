interface CacheRule {
  pattern: RegExp;
  sMaxAge: number;
}

export const cacheRules: CacheRule[] = [
  { pattern: /^\/$/, sMaxAge: 300 },
  { pattern: /^\/pricing\/?$/, sMaxAge: 300 },
];

export const cacheRuleFor = (pathname: string) =>
  cacheRules.find((rule) => rule.pattern.test(pathname));
