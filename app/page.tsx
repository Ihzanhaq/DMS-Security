import { HrmsApp } from "@/components/layout/hrms-app";
import { PayrollProvider } from "@/components/shared/payroll-context";

export default function Home() {
  return <PayrollProvider><HrmsApp /></PayrollProvider>;
}
