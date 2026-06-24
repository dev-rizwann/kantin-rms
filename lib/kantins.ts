import type { Dashboard } from "./data"
import h8Data from "@/data/h8/dashboard.json"

export type KantinSlug = "h8" | "chak-shahzad" | "model-town-multan"

export interface KantinMeta {
  slug: KantinSlug
  name: string
  city: string
  short: string
  fullAddress: string
  status: "live" | "coming-soon"
  data: Dashboard | null
}

export const kantins: Record<KantinSlug, KantinMeta> = {
  "h8": {
    slug: "h8",
    name: "H-8 Kantin",
    city: "Islamabad",
    short: "H-8",
    fullAddress: "H-8, Islamabad",
    status: "live",
    data: h8Data as unknown as Dashboard,
  },
  "chak-shahzad": {
    slug: "chak-shahzad",
    name: "Chak Shahzad Kantin",
    city: "Islamabad",
    short: "Chak Shahzad",
    fullAddress: "Chak Shahzad, Islamabad",
    status: "coming-soon",
    data: null,
  },
  "model-town-multan": {
    slug: "model-town-multan",
    name: "Model Town Kantin",
    city: "Multan",
    short: "Model Town",
    fullAddress: "Model Town, Multan",
    status: "coming-soon",
    data: null,
  },
}

export const kantinList: KantinMeta[] = [
  kantins["h8"],
  kantins["chak-shahzad"],
  kantins["model-town-multan"],
]

export function getKantin(slug: KantinSlug): KantinMeta {
  return kantins[slug]
}
