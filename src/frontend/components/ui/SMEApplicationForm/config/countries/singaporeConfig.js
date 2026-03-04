export const SG_CONFIG = {
  countryCode: "SG",
  currency: "SGD",
  regulators: ["MAS"],
  entityTypes: [
    "sole_proprietorship",
    "general_partnership",
    "limited_partnership",
    "llp",
    "private_limited"
  ],
  overrides: {
    requireUBOThreshold: 25,
    requireLocalDirector: true
  }
};