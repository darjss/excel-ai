import { A, useLocation } from "@solidjs/router";
import { For, createMemo } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { appNavigation, getAppNavItem } from "@/components/app/navigation";

type AppTopbarProps = {
  initialPath?: string;
  userEmail: string;
  userName: string | null;
};

export default function AppTopbar(props: AppTopbarProps) {
  const location = useLocation();
  const activeItem = createMemo(() =>
    getAppNavItem(location.pathname || props.initialPath || "/"),
  );

  return (
    <div class="rounded-[2rem] border border-zinc-200 bg-white/92 p-5 shadow-[0_24px_60px_-42px_rgba(24,24,27,0.22)]">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            {activeItem().label}
          </div>
          <h1 class="mt-3 text-3xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-4xl">
            {activeItem().label === "Home" ? "App workspace" : activeItem().label}
          </h1>
          <p class="mt-3 max-w-[42rem] text-sm leading-relaxed text-zinc-600 sm:text-base">
            {activeItem().description}
          </p>
        </div>

        <div class="rounded-[1.4rem] border border-zinc-200 bg-[#f6f1e7] px-4 py-3">
          <div class="flex items-center gap-3">
            <Badge class="rounded-full px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em]" variant="outline">
              Authenticated
            </Badge>
            <div>
              <div class="text-sm font-medium text-zinc-900">
                {props.userName || "Threadline member"}
              </div>
              <div class="text-sm text-zinc-600">{props.userEmail}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5 flex gap-2 overflow-x-auto lg:hidden">
        <For each={appNavigation}>
          {(item) => (
            <A
              class="whitespace-nowrap rounded-full border px-3 py-2 text-sm transition-colors"
              classList={{
                "border-zinc-300 bg-white text-zinc-700":
                  activeItem().href !== item.href,
                "border-zinc-900 bg-zinc-950 text-zinc-50":
                  activeItem().href === item.href,
              }}
              href={item.href}
            >
              {item.label}
            </A>
          )}
        </For>
      </div>
    </div>
  );
}
