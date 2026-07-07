const PHONE_CHARS_RE = /^[+\d\s().-]+$/;

const unique = (values) => [...new Set(values.filter(Boolean))];

const normalizeCountryCode = (value) => {
  const digits = `${value || ''}`.replace(/\D/g, '');
  return digits ? `+${digits}` : '+420';
};

const inferCountryCode = (referenceNumber, fallback = '+420') => {
  const fallbackCode = normalizeCountryCode(fallback);
  const raw = `${referenceNumber || ''}`.trim();
  if (!raw) return fallbackCode;

  const compact = raw.replace(/[^\d+]/g, '');
  const digits = compact.replace(/\D/g, '');
  if (!digits) return fallbackCode;

  const knownCodes = ['420', '421', '44', '1', '49', '48', '43', '33', '34', '39', '31', '32', '353'];
  const code = knownCodes.find((candidate) => digits.startsWith(candidate));
  return code ? `+${code}` : fallbackCode;
};

const normalizePhoneNumber = (value, options = {}) => {
  const raw = `${value || ''}`.trim();
  if (!raw) return raw;
  if (!PHONE_CHARS_RE.test(raw)) return raw;

  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;

  if (raw.startsWith('+')) return `+${digits}`;
  if (raw.startsWith('00')) return `+${digits.slice(2)}`;

  const countryCode = inferCountryCode(options.referenceNumber, options.defaultCountryCode);
  const countryDigits = countryCode.replace(/\D/g, '');

  if (countryDigits && digits.startsWith(`0${countryDigits}`) && digits.length > countryDigits.length + 6) {
    return `+${digits.slice(1)}`;
  }

  if (countryDigits && digits.startsWith(countryDigits) && digits.length > countryDigits.length + 5) {
    return `+${digits}`;
  }

  if (countryDigits) {
    const nationalDigits = digits.startsWith('0') && countryDigits !== '1'
      ? digits.replace(/^0+/, '')
      : digits;

    if (nationalDigits.length >= 7 && nationalDigits.length <= 12) {
      return `+${countryDigits}${nationalDigits}`;
    }
  }

  return raw.replace(/\s+/g, '');
};

const getPhoneLookupValues = (value, options = {}) => {
  const raw = `${value || ''}`.trim();
  if (!raw) return [];

  const normalized = normalizePhoneNumber(raw, options);
  const compact = raw.replace(/[\s().-]/g, '');
  const digits = raw.replace(/\D/g, '');
  const values = [raw, compact, normalized];

  if (digits) values.push(digits);
  if (normalized.startsWith('+')) {
    const normalizedDigits = normalized.slice(1);
    values.push(normalizedDigits);
    values.push(`0${normalizedDigits}`);
    values.push(`00${normalizedDigits}`);

    const countryCode = inferCountryCode(options.referenceNumber, options.defaultCountryCode).replace(/\D/g, '');
    if (countryCode && normalizedDigits.startsWith(countryCode)) {
      values.push(normalizedDigits.slice(countryCode.length));
      values.push(`0${normalizedDigits.slice(countryCode.length)}`);
    }
  }

  return unique(values);
};

module.exports = {
  getPhoneLookupValues,
  normalizePhoneNumber
};
