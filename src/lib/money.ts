export function parseCnyToCents(input: string) {
  const normalized = input.replace(/[¥￥,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const sign = normalized.startsWith("-") ? -1 : 1;
  const unsigned = normalized.replace(/^-/, "");
  const [yuan, cents = ""] = unsigned.split(".");
  const amount = Number(yuan) * 100 + Number(cents.padEnd(2, "0"));

  if (!Number.isSafeInteger(amount)) {
    return null;
  }

  return sign * amount;
}

export function formatCny(cents: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function centsToInput(cents: number | null | undefined) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}
