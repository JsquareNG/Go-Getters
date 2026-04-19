import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { countries as nationalities } from "country-data";


countries.registerLocale(enLocale);

export const COUNTRIES = () => {
  return Object.entries(countries.getNames("en")).map(([code, name]) => ({
    label: name,
    value: name, 
    code
  }));
};



export const mapIsoToNationalityOption = (code) => {
  if (!code) return null;

  return COUNTRIES().find((n) => n.code === code) || null;
};
