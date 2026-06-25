import { useFinance } from "../context/FinanceContext";
import DashboardHome from "./DashboardHome";
import DashboardBusinessContinuous from "./DashboardBusinessContinuous";
import DashboardBusinessProductive from "./DashboardBusinessProductive";

export default function Dashboard() {
  const { activeProfile } = useFinance();

  if (activeProfile?.profile_type === "business_continuous") {
    return <DashboardBusinessContinuous />;
  }

 if (activeProfile?.profile_type === "business_productive") {
  return <DashboardBusinessProductive />;
}
  return <DashboardHome />;
}
