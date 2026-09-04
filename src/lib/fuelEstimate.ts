// 目安値（実際の燃費・単価は車種や時期により異なる）
const FUEL_EFFICIENCY_KM_PER_L = 15;
const FUEL_PRICE_PER_L = 170;
const CO2_KG_PER_L = 2.32;

export interface FuelEstimate {
  km: number;
  liters: number;
  costYen: number;
  co2Kg: number;
}

export function estimateFuelAndCO2(distanceM: number): FuelEstimate {
  const km = distanceM / 1000;
  const liters = km / FUEL_EFFICIENCY_KM_PER_L;
  return {
    km,
    liters,
    costYen: Math.round(liters * FUEL_PRICE_PER_L),
    co2Kg: Math.round(liters * CO2_KG_PER_L * 10) / 10,
  };
}
