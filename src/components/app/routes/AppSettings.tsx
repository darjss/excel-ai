import { createSignal } from "solid-js";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type AppSettingsProps = {
  userEmail: string;
  userName: string | null;
};

export default function AppSettings(props: AppSettingsProps) {
  const [isSigningOut, setIsSigningOut] = createSignal(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await authClient.signOut();
    window.location.assign("/");
  }

  return (
    <div class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section class="rounded-[2rem] border border-zinc-200 bg-white/92 p-6 shadow-[0_28px_75px_-42px_rgba(24,24,27,0.22)] sm:p-8">
        <div class="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-500">
          Account details
        </div>
        <h2 class="mt-4 text-3xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-4xl">
          Read-only account view
        </h2>
        <p class="mt-4 max-w-[42rem] text-base leading-relaxed text-zinc-600">
          This route exposes current user details inside the protected app shell without adding
          write APIs yet.
        </p>

        <div class="mt-8 grid gap-4">
          <div class="rounded-[1.5rem] border border-zinc-200 bg-[#f6f1e7] px-5 py-4">
            <div class="text-xs uppercase tracking-[0.22em] text-zinc-500">Name</div>
            <div class="mt-2 text-lg font-medium text-zinc-950">
              {props.userName || "Not set"}
            </div>
          </div>
          <div class="rounded-[1.5rem] border border-zinc-200 bg-white px-5 py-4">
            <div class="text-xs uppercase tracking-[0.22em] text-zinc-500">Email</div>
            <div class="mt-2 text-lg font-medium text-zinc-950">{props.userEmail}</div>
          </div>
          <div class="rounded-[1.5rem] border border-zinc-200 bg-white px-5 py-4">
            <div class="text-xs uppercase tracking-[0.22em] text-zinc-500">Profile settings</div>
            <div class="mt-2 text-sm leading-relaxed text-zinc-600">
              Profile editing, workspace preferences, and security controls can land here next.
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-[2rem] border border-zinc-200 bg-white/92 p-6 shadow-[0_24px_60px_-42px_rgba(24,24,27,0.22)] sm:p-8">
        <div class="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-500">
          Session
        </div>
        <h2 class="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">
          Session actions
        </h2>
        <p class="mt-4 text-sm leading-relaxed text-zinc-600">
          The current app slice keeps session management simple. Sign out here and return to the
          public site.
        </p>

        <div class="mt-8 rounded-[1.5rem] border border-zinc-200 bg-[#f6f1e7] px-5 py-4 text-sm text-zinc-700">
          Signed in as {props.userEmail}.
        </div>

        <Button
          class="mt-6 rounded-2xl"
          disabled={isSigningOut()}
          onClick={() => void handleSignOut()}
          variant="outline"
        >
          {isSigningOut() ? "Signing out..." : "Sign out"}
        </Button>
      </section>
    </div>
  );
}
