import { A, useLocation } from "@solidjs/router";
import { For, createMemo } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { appNavigation, isAppNavItemActive } from "@/components/app/navigation";

type AppSidebarProps = {
  userEmail: string;
  userName: string | null;
};

export default function AppSidebar(props: AppSidebarProps) {
  const location = useLocation();
  const currentPath = createMemo(() => location.pathname);

  return (
    <aside class="hidden w-full max-w-[280px] shrink-0 lg:block">
      <div class="sticky top-6 rounded-[2rem] border border-zinc-200 bg-white/92 p-5 shadow-[0_28px_75px_-42px_rgba(24,24,27,0.22)]">
        <a class="flex items-center gap-3" href="/">
          <div class="flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-zinc-300 bg-white text-sm font-semibold tracking-[0.22em] text-zinc-900 shadow-[0_18px_40px_-26px_rgba(24,24,27,0.28)]">
            TL
          </div>
          <div>
            <div class="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Threadline
            </div>
            <div class="text-sm text-zinc-600">Protected workspace</div>
          </div>
        </a>

        <div class="mt-6 rounded-[1.5rem] border border-zinc-200 bg-[#f6f1e7] p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-sm font-medium text-zinc-900">
                {props.userName || "Signed in"}
              </div>
              <div class="mt-1 text-sm text-zinc-600">{props.userEmail}</div>
            </div>
            <Badge class="rounded-full px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em]" variant="secondary">
              Live
            </Badge>
          </div>
        </div>

        <nav class="mt-6 grid gap-2">
          <For each={appNavigation}>
            {(item) => (
              <A
                class="rounded-[1.35rem] border px-4 py-3 transition-colors"
                classList={{
                  "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-950":
                    !isAppNavItemActive(item, currentPath()),
                  "border-zinc-900 bg-zinc-950 text-zinc-50":
                    isAppNavItemActive(item, currentPath()),
                }}
                href={item.href}
              >
                <div class="text-sm font-medium">{item.label}</div>
                <div
                  class="mt-1 text-sm"
                  classList={{
                    "text-zinc-500": !isAppNavItemActive(item, currentPath()),
                    "text-zinc-300": isAppNavItemActive(item, currentPath()),
                  }}
                >
                  {item.description}
                </div>
              </A>
            )}
          </For>
        </nav>
      </div>
    </aside>
  );
}
