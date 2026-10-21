import { DailyCashView } from "@/components/DailyCashView"

export const dynamic = "force-dynamic"

export default function KashmirDaily({ searchParams }: { searchParams?: { from?: string; to?: string } }) {
  return <DailyCashView slug="kashmir" searchParams={searchParams} />
}
