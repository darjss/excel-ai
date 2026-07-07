import { type ParentProps } from "solid-js";
import AppSidebar from "@/components/app/AppSidebar";
import AppTopbar from "@/components/app/AppTopbar";

type AppFrameProps = ParentProps<{
  initialPath?: string;
  userEmail: string;
  userName: string | null;
}>;

export default function AppFrame(props: AppFrameProps) {
  return (
    <div class="min-h-[100dvh] bg-[linear-gradient(180deg,#f5f1e8_0%,#f8f7f4_44%,#ffffff_100%)] text-zinc-950">
      <div class="mx-auto flex max-w-[1320px] gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <AppSidebar userEmail={props.userEmail} userName={props.userName} />

        <div class="min-w-0 flex-1">
          {/*<AppTopbar
            initialPath={props.initialPath}
            userEmail={props.userEmail}
            userName={props.userName}
          />*/}

          <main class="mt-6">{props.children}</main>
        </div>
      </div>
    </div>
  );
}
