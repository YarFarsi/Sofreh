export function employeePrice(price: number, subsidy: number): number {
  return Math.max(0, price - subsidy);
}

export function formatRial(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount) + " ریال";
}

export type CostSnapshot = {
  price: number;
  subsidy: number;
  employeePrice: number;
};

export function snapshotCosts(input: {
  price: number;
  subsidy: number;
  employeePrice?: number;
}): CostSnapshot {
  const price = input.price;
  const subsidy = input.subsidy;
  return {
    price,
    subsidy,
    employeePrice:
      input.employeePrice !== undefined
        ? input.employeePrice
        : employeePrice(price, subsidy),
  };
}
