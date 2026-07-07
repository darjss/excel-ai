import { portalHref } from "./paths";

export interface PortalNavProps {
  businessName: string;
  basePath: string;
  orderCtaLabel: string;
}

export const PortalNav = (props: PortalNavProps) => (
  <nav class="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--portal-foreground)]/10 py-4">
    <a
      class="text-lg font-semibold"
      style={{ "font-family": "var(--portal-font-heading)" }}
      href={portalHref(props.basePath, "")}
    >
      {props.businessName}
    </a>
    <div class="flex items-center gap-5 text-sm">
      <a class="hover:text-[var(--portal-primary)]" href={portalHref(props.basePath, "")}>
        Home
      </a>
      <a class="hover:text-[var(--portal-primary)]" href={portalHref(props.basePath, "/catalog")}>
        Catalog
      </a>
      <a
        class="rounded-[var(--portal-radius)] bg-[var(--portal-primary)] px-4 py-2 font-medium text-[var(--portal-background)]"
        href={portalHref(props.basePath, "/order")}
      >
        {props.orderCtaLabel}
      </a>
    </div>
  </nav>
);
