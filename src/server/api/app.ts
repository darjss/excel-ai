import { Elysia } from "elysia";
import { auth } from "@/server/lib/auth";
import { errorPlugin } from "./errors";
import { adminRoute } from "./routes/admin";
import { agentRoute } from "./routes/agent";
import { billingRoute } from "./routes/billing";
import { buyerLinksRoute } from "./routes/buyer-links";
import { extractionRoute } from "./routes/extraction";
import { healthRoute } from "./routes/health";
import { ordersRoute } from "./routes/orders";
import { portalRoute } from "./routes/portal";
import { projectsRoute } from "./routes/projects";
import { reviewRoute } from "./routes/review";

export const app = new Elysia({ prefix: "/api", aot: false })
  .use(errorPlugin)
  .mount("/auth", auth.handler)
  .use(healthRoute)
  .use(projectsRoute)
  .use(billingRoute)
  .use(adminRoute)
  .use(agentRoute)
  .use(extractionRoute)
  .use(buyerLinksRoute)
  .use(ordersRoute)
  .use(reviewRoute)
  .use(portalRoute);

export type App = typeof app;
