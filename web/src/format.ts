export function money(currency: string, amount: number): string {
  return currency === "USD" ? `US$${amount}` : `${currency} ${amount}`;
}

export function day(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
