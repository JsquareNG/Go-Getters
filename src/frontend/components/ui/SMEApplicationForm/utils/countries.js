import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

// Register English locale
countries.registerLocale(enLocale);

/**
 * Returns an array of all countries in { label, value } format
 */
export const getAllCountries = () => {
  return Object.entries(countries.getNames("en")).map(([code, name]) => ({
    label: name,
    value: code
  }));
};