import type { PortalConfig } from "../types";
import { bakeryConfig } from "./bakery";
import { farmCsaConfig } from "./farm-csa";
import { wholesaleConfig } from "./wholesale";

export { bakeryConfig } from "./bakery";
export { wholesaleConfig } from "./wholesale";
export { farmCsaConfig } from "./farm-csa";

export const portalConfigFixtures: Record<string, PortalConfig> = {
  bakery: bakeryConfig,
  wholesale: wholesaleConfig,
  farmCsa: farmCsaConfig,
};
