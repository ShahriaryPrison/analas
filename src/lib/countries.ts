export interface CountryConfig {
  code: string;          // ISO code, e.g. "IR"
  dialCode: string;      // Dialing code, e.g. "+98"
  name: string;          // Name, e.g. "Iran"
  flag: string;          // Emoji flag, e.g. "🇮🇷"
  placeholder: string;   // Placeholder text for UI
  nationalRegexString: string; // Serializable regex to validate national number (excluding leading zeroes)
}

export const ALLOWED_COUNTRIES: CountryConfig[] = [
  {
    code: "IR",
    dialCode: "+98",
    name: "Iran",
    flag: "🇮🇷",
    placeholder: "9123456789",
    nationalRegexString: "^9\\d{9}$",
  },
];

export function validatePhoneNumber(phone: string) {
  const trimmed = phone.trim();
  const matchedCountry = ALLOWED_COUNTRIES.find((c) => trimmed.startsWith(c.dialCode));
  if (!matchedCountry) {
    return { isValid: false, error: "Country not supported" };
  }

  const nationalNumber = trimmed.slice(matchedCountry.dialCode.length);
  const regex = new RegExp(matchedCountry.nationalRegexString);
  const isValid = regex.test(nationalNumber);

  return {
    isValid,
    matchedCountry,
    nationalNumber,
    error: isValid ? null : `Invalid number format for ${matchedCountry.name}.`,
  };
}
