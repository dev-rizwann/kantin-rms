import { DailyCashView } from "@/components/DailyCashView"
import { ExportExcel } from "@/components/ExportExcel"

export const dynamic = "force-dynamic"

export default function DailyCashPage({ searchParams }: { searchParams?: { from?: string; to?: string } }) {
  return <DailyCashView slug="h8" searchParams={searchParams} headerRight={<ExportExcel />} />
}
