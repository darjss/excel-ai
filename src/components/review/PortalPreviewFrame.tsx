import { Show } from "solid-js";
import { PortalHome } from "@/components/portal/PortalHome";
import { portalThemeStyleAttr } from "@/components/portal/theme";
import type { PortalConfig } from "@/portal-config";

export interface PortalPreviewFrameProps {
  config: PortalConfig;
  watermark?: boolean;
}

export const PortalPreviewFrame = (props: PortalPreviewFrameProps) => (
  <div class="relative overflow-hidden rounded-xl border">
    <div
      class="pointer-events-none max-h-[70vh] overflow-y-auto bg-[var(--portal-background)] px-6 text-[var(--portal-foreground)]"
      style={`${portalThemeStyleAttr(props.config.style.theme)};font-family:var(--portal-font-body)`}
    >
      <PortalHome config={props.config} basePath="" />
    </div>
    <Show when={props.watermark}>
      <div class="pointer-events-none absolute inset-0 flex items-start justify-center pt-16">
        <span class="rotate-[-6deg] rounded-full bg-black/75 px-6 py-2 text-lg font-semibold tracking-wide text-white shadow-lg">
          Preview — publish to go live
        </span>
      </div>
    </Show>
  </div>
);
