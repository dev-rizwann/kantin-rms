import { CostingNav } from "@/components/CostingNav"
import { requireAction } from "@/lib/server-auth"

export default async function CostingLayout({ children }: { children: React.ReactNode }) {
  await requireAction("report.view_cost", "h8")
  return <><CostingNav />{children}</>
}
