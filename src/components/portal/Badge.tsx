import { Show } from "solid-js";
import { shouldShowBadge } from "./badge";

export interface BadgeProps {
  rootUrl: string;
  hidden?: boolean;
}

export const PortalBadge = (props: BadgeProps) => (
  <Show when={shouldShowBadge(props.hidden)}>
    <div class="mt-16 border-t border-[var(--portal-foreground)]/10 py-6 text-center text-sm">
      <a
        class="text-[var(--portal-foreground)]/60 hover:text-[var(--portal-foreground)]"
        href={props.rootUrl}
        rel="noreferrer"
      >
        Made with Sheetstand
      </a>
    </div>
  </Show>
);
