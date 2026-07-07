export type AppNavItem = {
  description: string;
  href: "/" | "/billing" | "/settings";
  label: string;
  match: "exact" | "prefix";
};

export const appNavigation = [
  {
    description: "Protected overview and quick actions for the signed-in workspace.",
    href: "/",
    label: "Home",
    match: "exact",
  },
  {
    description: "Manage plan state, checkout flow, and billing portal access.",
    href: "/billing",
    label: "Billing",
    match: "prefix",
  },
  {
    description: "Review account details and session controls.",
    href: "/settings",
    label: "Settings",
    match: "prefix",
  },
] as const satisfies readonly AppNavItem[];

export function normalizeAppPath(pathname: string) {
  let nextPath = pathname.startsWith("/app") ? pathname.slice(4) || "/" : pathname;

  if (!nextPath.startsWith("/")) {
    nextPath = `/${nextPath}`;
  }

  if (nextPath.length > 1 && nextPath.endsWith("/")) {
    nextPath = nextPath.slice(0, -1);
  }

  return nextPath || "/";
}

export function isAppNavItemActive(item: AppNavItem, pathname: string) {
  const currentPath = normalizeAppPath(pathname);

  if (item.match === "exact") {
    return currentPath === item.href;
  }

  return currentPath === item.href || currentPath.startsWith(`${item.href}/`);
}

export function getAppNavItem(pathname: string) {
  return (
    appNavigation.find((item) => isAppNavItemActive(item, pathname)) ?? appNavigation[0]
  );
}
