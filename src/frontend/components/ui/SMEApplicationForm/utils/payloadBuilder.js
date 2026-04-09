import {
  FORM_META_KEYS_TO_REMOVE,
  normalizeFormData,
} from "./formDataHelpers";
import {
  mapIndividualsDynamic,
  mapNonIndividualRepeatableData,
  stripIndividualLikeFieldsFromRoot,
  stripNonIndividualRepeatableFieldsFromRoot
} from "./repeatableMappingHelpers";

export const buildDynamicPayload = ({
  rawFormData,
  config,
  providerSessionId = null,
}) => {
  const normalizedData = normalizeFormData(rawFormData);

  const individuals = mapIndividualsDynamic(normalizedData, config);
  const nonIndividualRepeatables = mapNonIndividualRepeatableData(
    normalizedData,
    config,
  );

  let payload = {
    ...normalizedData,
    ...nonIndividualRepeatables,
    individuals,
    provider_session_id: providerSessionId,
    businessName: normalizedData.businessName || normalizedData.business_name || "",
    businessType: normalizedData.businessType || normalizedData.business_type || null,
    businessCountry:
      normalizedData.businessCountry ||
      normalizedData.business_country ||
      normalizedData.country ||
      null,
  };

  FORM_META_KEYS_TO_REMOVE.forEach((key) => {
    delete payload[key];
  });

  payload = stripIndividualLikeFieldsFromRoot(payload, normalizedData, config);
  payload = stripNonIndividualRepeatableFieldsFromRoot(payload, normalizedData, config);

  delete payload.formData;
  delete payload.form_data;
  delete payload.current_status;
  delete payload.previous_status;
  delete payload.email;
  delete payload.first_name;
  delete payload.user_id;
  delete payload.last_saved_step;

  return payload;
};