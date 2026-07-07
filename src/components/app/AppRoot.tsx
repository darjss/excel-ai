import { Route, Router } from "@solidjs/router";
import { QueryClientProvider } from "@tanstack/solid-query";
import { Toaster } from "solid-sonner";
import { queryClient } from "@/lib/query-client";
import { AppLayout } from "./AppLayout";
import { AdminPage } from "./routes/AdminPage";
import { BillingPage } from "./routes/BillingPage";
import { BuyerLinksPage } from "./routes/BuyerLinksPage";
import { OrdersLanding } from "./routes/OrdersLanding";
import { OrdersPage } from "./routes/OrdersPage";
import { ProjectsPage } from "./routes/ProjectsPage";
import { ReviewPage } from "./routes/ReviewPage";
import { SettingsPage } from "./routes/SettingsPage";

export const AppRoot = () => (
  <QueryClientProvider client={queryClient}>
    <Router base="/app" root={AppLayout}>
      <Route path="/" component={ProjectsPage} />
      <Route path="/buyer-links" component={BuyerLinksPage} />
      <Route path="/orders" component={OrdersLanding} />
      <Route path="/orders/:slug" component={OrdersPage} />
      <Route path="/review/:jobId" component={ReviewPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/admin" component={AdminPage} />
    </Router>
    <Toaster richColors />
  </QueryClientProvider>
);
