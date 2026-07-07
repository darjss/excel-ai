import { Navigate, Route, Router } from "@solidjs/router";
import SolidQueryProvider from "@/components/SolidQueryProvider";
import AppFrame from "@/components/app/AppFrame";
import AppBilling from "@/components/app/routes/AppBilling";
import AppHome from "@/components/app/routes/AppHome";
import AppSettings from "@/components/app/routes/AppSettings";
import { type BillingProductIds } from "@/lib/billing/polar";

export type AppShellProps = {
  initialPath?: string;
  productIds: BillingProductIds;
  userEmail: string;
  userName: string | null;
};

export default function AppShell(props: AppShellProps) {
  return (
    <SolidQueryProvider>
      <Router
        base="/app"
        root={(routerProps) => (
          <AppFrame
            initialPath={props.initialPath}
            userEmail={props.userEmail}
            userName={props.userName}
          >
            {routerProps.children}
          </AppFrame>
        )}
      >
        <Route
          component={() => (
            <AppHome userEmail={props.userEmail} userName={props.userName} />
          )}
          path="/"
        />
        <Route
          component={() => (
            <AppBilling
              productIds={props.productIds}
              userEmail={props.userEmail}
              userName={props.userName}
            />
          )}
          path="/billing"
        />
        <Route
          component={() => (
            <AppSettings userEmail={props.userEmail} userName={props.userName} />
          )}
          path="/settings"
        />
        <Route component={() => <Navigate href="/" />} path="*404" />
      </Router>
    </SolidQueryProvider>
  );
}
