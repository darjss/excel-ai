import BillingDashboard from "@/components/BillingDashboard";
import { type BillingProductIds } from "@/lib/billing/polar";

type AppBillingProps = {
  productIds: BillingProductIds;
  userEmail: string;
  userName: string | null;
};

export default function AppBilling(props: AppBillingProps) {
  return (
    <BillingDashboard
      productIds={props.productIds}
      userEmail={props.userEmail}
      userName={props.userName}
    />
  );
}
