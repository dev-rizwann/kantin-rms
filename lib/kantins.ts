export type KantinSlug = "h8" | "chak-shahzad" | "kashmir"

export interface KantinMeta {
  slug: KantinSlug
  name: string
  city: string
  short: string
  fullAddress: string
  status: "live" | "setup"
}

export const kantins: Record<KantinSlug, KantinMeta> = {
  "h8": { slug: "h8", name: "H-8 Kantin", city: "Islamabad", short: "H-8", fullAddress: "H-8, Islamabad", status: "live" },
  "chak-shahzad": { slug: "chak-shahzad", name: "Chak Shahzad Kantin", city: "Islamabad", short: "Chak Shahzad", fullAddress: "Chak Shahzad, Islamabad", status: "live" },
  "kashmir": { slug: "kashmir", name: "Muzaffarabad (AJK)", city: "AJK", short: "Muzaffarabad (AJK)", fullAddress: "Muzaffarabad, Azad Jammu & Kashmir", status: "setup" },
}

export const kantinList: KantinMeta[] = [kantins["h8"], kantins["chak-shahzad"], kantins["kashmir"]]

export function getKantin(slug: KantinSlug): KantinMeta {
  return kantins[slug]
}
