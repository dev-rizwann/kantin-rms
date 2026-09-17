import { DailyCashView } from "@/components/DailyCashView"

export const dynamic = "force-dynamic"

export default function ChakShahzadDaily({ searchParams }: { searchParams?: { from?: string; to?: string } }) {
  return <DailyCashView slug="chak-shahzad" searchParams={searchParams} />
}
