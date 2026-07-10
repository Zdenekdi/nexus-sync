const {
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  parseIncompletePhoneNumber,
  parsePhoneNumberFromString
} = require('libphonenumber-js');

const DEFAULT_COUNTRY = 'CZ';
const DEFAULT_COUNTRY_CODE = '+420';
const COMMON_INTERNATIONAL_PREFIXES = ['00', '011', '0011', '001', '009', '010', '810'];
const PRIMARY_COUNTRY_BY_CALLING_CODE = {
  1: 'US',
  7: 'RU',
  44: 'GB',
  61: 'AU'
};
const COUNTRIES_BY_CALLING_CODE = getCountries().reduce((acc, country) => {
  const callingCode = getCountryCallingCode(country);
  acc[callingCode] = acc[callingCode] || [];
  acc[callingCode].push(country);
  return acc;
}, {});

const unique = (values) => [...new Set(values.filter(Boolean))];

const normalizeCountryCode = (value) => {
  const digits = `${value || ''}`.replace(/\D/g, '');
  return digits ? `+${digits}` : DEFAULT_COUNTRY_CODE;
};

const normalizeCountry = (value) => {
  const country = `${value || ''}`.trim().toUpperCase();
  return country && isSupportedCountry(country) ? country : null;
};

const countryFromCallingCode = (value) => {
  const callingCode = `${value || ''}`.replace(/\D/g, '');
  if (!callingCode) return null;
  return PRIMARY_COUNTRY_BY_CALLING_CODE[callingCode] || COUNTRIES_BY_CALLING_CODE[callingCode]?.[0] || null;
};

const compactPhoneInput = (value) => parseIncompletePhoneNumber(`${value || ''}`.trim());

const phoneDigits = (value) => compactPhoneInput(value).replace(/\D/g, '');

const isPhoneLike = (value) => {
  const raw = `${value || ''}`.trim();
  if (!raw) return false;
  if (/\p{L}/u.test(raw)) return false;
  return phoneDigits(raw).length > 0;
};

const getUsablePhone = (phone) => {
  if (!phone?.number) return null;
  if (phone.isValid?.() || phone.isPossible?.()) return phone;
  return null;
};

const tryParsePhone = (value, defaultCountry) => {
  try {
    return getUsablePhone(parsePhoneNumberFromString(value, defaultCountry || undefined));
  } catch {
    return null;
  }
};

const parseReferencePhone = (referenceNumber, defaultCountry) => {
  const compact = compactPhoneInput(referenceNumber);
  if (!compact) return null;

  const digits = compact.replace(/\D/g, '');
  const candidates = [
    compact,
    compact.startsWith('00') && digits.length > 2 ? `+${digits.slice(2)}` : null
  ];

  for (const candidate of unique(candidates)) {
    const parsed = tryParsePhone(candidate, candidate.startsWith('+') ? undefined : defaultCountry);
    if (parsed) return parsed;
  }
  return null;
};

const inferCountry = (options = {}) => {
  const explicitCountry = normalizeCountry(options.defaultCountry || options.defaultRegion);
  const referencePhone = parseReferencePhone(options.referenceNumber, explicitCountry || DEFAULT_COUNTRY);
  const explicitCodeCountry = countryFromCallingCode(options.defaultCountryCode);
  const referenceCodeCountry = countryFromCallingCode(referencePhone?.countryCallingCode);
  return referencePhone?.country || referenceCodeCountry || explicitCountry || explicitCodeCountry || DEFAULT_COUNTRY;
};

const inferCountryCode = (options = {}) => {
  const explicitCode = options.defaultCountryCode ? normalizeCountryCode(options.defaultCountryCode) : null;
  const country = inferCountry(options);
  const countryCode = country ? `+${getCountryCallingCode(country)}` : null;
  const referencePhone = parseReferencePhone(options.referenceNumber, country);
  return referencePhone?.countryCallingCode ? `+${referencePhone.countryCallingCode}` : explicitCode || countryCode || DEFAULT_COUNTRY_CODE;
};

const buildParseCandidates = (value, options = {}) => {
  const compact = compactPhoneInput(value);
  const digits = compact.replace(/\D/g, '');
  if (!digits) return [];

  const country = inferCountry(options);
  const countryDigits = inferCountryCode(options).replace(/\D/g, '');
  const candidates = [];

  if (compact.startsWith('+')) candidates.push({ value: compact });

  for (const prefix of COMMON_INTERNATIONAL_PREFIXES) {
    if (digits.startsWith(prefix) && digits.length > prefix.length + 5) {
      candidates.push({ value: `+${digits.slice(prefix.length)}` });
    }
  }

  if (countryDigits && digits.startsWith(`0${countryDigits}`) && digits.length > countryDigits.length + 6) {
    candidates.push({ value: `+${digits.slice(1)}` });
  }

  if (countryDigits && digits.startsWith(countryDigits) && digits.length > countryDigits.length + 5) {
    candidates.push({ value: `+${digits}` });
  }

  if (!compact.startsWith('+')) {
    candidates.push({ value: compact, country });
    if (digits.startsWith('0') && digits.length > 7) {
      candidates.push({ value: digits.replace(/^0+/, ''), country });
    }
    candidates.push({ value: digits, country });
  }

  return unique(candidates.map(candidate => JSON.stringify(candidate))).map(candidate => JSON.parse(candidate));
};

const parsePhone = (value, options = {}) => {
  const valid = [];
  const possible = [];

  for (const candidate of buildParseCandidates(value, options)) {
    const parsed = tryParsePhone(candidate.value, candidate.country);
    if (!parsed) continue;
    if (parsed.isValid?.()) valid.push(parsed);
    else possible.push(parsed);
  }

  return valid[0] || possible[0] || null;
};

const normalizePhoneNumber = (value, options = {}) => {
  const raw = `${value || ''}`.trim();
  if (!raw) return raw;
  if (!isPhoneLike(raw)) return raw;

  const parsed = parsePhone(raw, options);
  if (parsed?.number) return parsed.number;

  const compact = compactPhoneInput(raw);
  return compact || raw.replace(/\s+/g, '');
};

const addFormattedVariants = (values, parsed) => {
  if (!parsed?.number) return;

  values.push(parsed.number);
  values.push(parsed.formatInternational?.());
  values.push(parsed.formatNational?.());
  values.push(parsed.nationalNumber);

  const internationalDigits = parsed.number.replace(/\D/g, '');
  const nationalDigits = `${parsed.formatNational?.() || ''}`.replace(/\D/g, '') || parsed.nationalNumber;

  values.push(internationalDigits);
  values.push(nationalDigits);
  values.push(`0${nationalDigits}`);

  for (const prefix of COMMON_INTERNATIONAL_PREFIXES) {
    values.push(`${prefix}${internationalDigits}`);
  }
};

const getPhoneLookupValues = (value, options = {}) => {
  const raw = `${value || ''}`.trim();
  if (!raw) return [];

  const compact = compactPhoneInput(raw);
  const digits = phoneDigits(raw);
  const normalized = normalizePhoneNumber(raw, options);
  const values = [raw, raw.replace(/[\s().-]/g, ''), compact, normalized, digits];

  const parsed = parsePhone(normalized, options) || parsePhone(raw, options);
  addFormattedVariants(values, parsed);

  if (normalized.startsWith('+')) {
    const normalizedDigits = normalized.slice(1);
    values.push(normalizedDigits);
    values.push(`0${normalizedDigits}`);
  }

  return unique(values);
};

module.exports = {
  getPhoneLookupValues,
  normalizePhoneNumber
};
