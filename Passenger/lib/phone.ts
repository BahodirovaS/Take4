
export const isE164 = (value: string): boolean => /^\+\d{7,15}$/.test(value);

export const toE164 = (input: string, defaultCountry = "+1"): string | null => {
  if (!input) return null;
  const trimmed = input.trim();

  if (isE164(trimmed)) return trimmed;

  if (trimmed.startsWith("+")) {
    const normalized = "+" + trimmed.replace(/[^\d]/g, "");
    return isE164(normalized) ? normalized : null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `${defaultCountry}${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return null;
};


export const e164ToUSDashed = (e164?: string | null): string => {
  if (!e164) return "";
  const m = e164.match(/^\+1(\d{10})$/);
  if (!m) return e164; // non-US: show as-is (E.164)
  const d = m[1];
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
};


export const formatPhoneInput = (value: string): string => {
  if (!value) return "";
  const trimmed = value.trim();

  if (trimmed.startsWith("+")) {
    return "+" + trimmed.replace(/[^\d]/g, "");
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};
