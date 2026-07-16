export interface OilAllocationInput {
  id: string
  unitsSold: number
  friesGrams: number
  breadedGrams: number
  directOilMl: number
  directCostInRecipe: boolean
}

export interface OilAllocationOptions {
  totalOilSpend: number
  directOilUnitCost: number
  breadedFactor: number
}

export interface OilAllocationResultRow extends OilAllocationInput {
  directCostPerUnit: number
  fryerCostPerUnit: number
  totalOilCostPerUnit: number
  recipeAdjustmentPerUnit: number
  periodOilCost: number
}

export function calculateOilAllocation(rows: OilAllocationInput[], options: OilAllocationOptions) {
  const totalOilSpend = Math.max(0, options.totalOilSpend)
  const directOilUnitCost = Math.max(0, options.directOilUnitCost)
  const breadedFactor = Math.max(0, options.breadedFactor)

  const directOilCost = rows.reduce(
    (sum, row) => sum + Math.max(0, row.unitsSold) * Math.max(0, row.directOilMl) * directOilUnitCost,
    0,
  )
  const fryerPool = Math.max(0, totalOilSpend - directOilCost)
  const weightedFryerGrams = rows.reduce(
    (sum, row) =>
      sum +
      Math.max(0, row.unitsSold) *
        (Math.max(0, row.friesGrams) + breadedFactor * Math.max(0, row.breadedGrams)),
    0,
  )
  const friesCostPerGram = weightedFryerGrams > 0 ? fryerPool / weightedFryerGrams : 0
  const breadedCostPerGram = friesCostPerGram * breadedFactor

  const allocatedRows: OilAllocationResultRow[] = rows.map((row) => {
    const directCostPerUnit = Math.max(0, row.directOilMl) * directOilUnitCost
    const fryerCostPerUnit =
      Math.max(0, row.friesGrams) * friesCostPerGram +
      Math.max(0, row.breadedGrams) * breadedCostPerGram
    const totalOilCostPerUnit = directCostPerUnit + fryerCostPerUnit
    return {
      ...row,
      directCostPerUnit,
      fryerCostPerUnit,
      totalOilCostPerUnit,
      recipeAdjustmentPerUnit: fryerCostPerUnit + (row.directCostInRecipe ? 0 : directCostPerUnit),
      periodOilCost: Math.max(0, row.unitsSold) * totalOilCostPerUnit,
    }
  })
  const allocatedTotal = allocatedRows.reduce((sum, row) => sum + row.periodOilCost, 0)

  return {
    rows: allocatedRows,
    totalOilSpend,
    directOilUnitCost,
    breadedFactor,
    directOilCost,
    fryerPool,
    weightedFryerGrams,
    friesCostPerGram,
    breadedCostPerGram,
    allocatedTotal,
    variance: totalOilSpend - allocatedTotal,
  }
}
