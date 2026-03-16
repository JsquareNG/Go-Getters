function getRuleKey(rule) {
  return rule.rule_id ?? rule.__tempId;
}

function getConditionKey(condition) {
  return condition.condition_id ?? condition.__tempId;
}

export function validateRulesListRows(rows = []) {
  const errors = {
    rules: {},
    conditions: {},
  };

  const normalizedRuleCodes = new Map();
  const normalizedRuleNames = new Map();

  rows.forEach((rule) => {
    const ruleKey = getRuleKey(rule);
    const code = (rule.rule_code || "").trim().toLowerCase();
    const name = (rule.rule_name || "").trim().toLowerCase();

    errors.rules[ruleKey] = {
      rule_code: "",
      rule_name: "",
      description: "",
      conditions: "",
    };

    if (code) {
      if (!normalizedRuleCodes.has(code)) {
        normalizedRuleCodes.set(code, []);
      }
      normalizedRuleCodes.get(code).push(ruleKey);
    }

    if (name) {
      if (!normalizedRuleNames.has(name)) {
        normalizedRuleNames.set(name, []);
      }
      normalizedRuleNames.get(name).push(ruleKey);
    }
  });

  rows.forEach((rule) => {
    const ruleKey = getRuleKey(rule);

    if (!(rule.rule_code || "").trim()) {
      errors.rules[ruleKey].rule_code = "Rule code is required.";
    }

    if (!(rule.rule_name || "").trim()) {
      errors.rules[ruleKey].rule_name = "Rule name is required.";
    }

    if (!(rule.description || "").trim()) {
      errors.rules[ruleKey].description = "Rule description is required.";
    }

    if (!(rule.conditions || []).length) {
      errors.rules[ruleKey].conditions =
        "At least one condition is required for this rule.";
    }
  });

  normalizedRuleCodes.forEach((ruleKeys) => {
    if (ruleKeys.length > 1) {
      ruleKeys.forEach((ruleKey) => {
        errors.rules[ruleKey].rule_code =
          "Rule code already exists in this category.";
      });
    }
  });

  normalizedRuleNames.forEach((ruleKeys) => {
    if (ruleKeys.length > 1) {
      ruleKeys.forEach((ruleKey) => {
        errors.rules[ruleKey].rule_name =
          "Rule name already exists in this category.";
      });
    }
  });

  rows.forEach((rule) => {
    const conditions = rule.conditions || [];

    conditions.forEach((condition) => {
      const conditionKey = getConditionKey(condition);
      const isElse = condition.branchType === "ELSE";

      errors.conditions[conditionKey] = {
        field_name: "",
        numeric_value: "",
        string_value: "",
        list_name: "",
        score: "",
        trigger_description: "",
      };

      if (!isElse && !condition.field_name) {
        errors.conditions[conditionKey].field_name = "Field name is required.";
      }

      if (!isElse) {
        const operator = (condition.operator || "").toUpperCase();
        const valueType = (condition.value_type || "").toUpperCase();

        if (operator === "IN_LIST") {
          if (!(condition.list_name || "").trim()) {
            errors.conditions[conditionKey].list_name =
              "Config list selection is required.";
          }
        } else if (operator === "IS_TRUE" || operator === "IS_FALSE") {
          // no extra value validation needed for boolean conditions
        } else if (valueType === "STRING") {
          if (!(condition.string_value || "").trim()) {
            errors.conditions[conditionKey].string_value =
              "A text value is required.";
          }
        } else {
          if (
            condition.numeric_value === "" ||
            condition.numeric_value === null ||
            Number.isNaN(Number(condition.numeric_value))
          ) {
            errors.conditions[conditionKey].numeric_value =
              "A numeric value is required.";
          }
        }
      }

      if (
        condition.score === "" ||
        condition.score === null ||
        Number(condition.score) === 0
      ) {
        errors.conditions[conditionKey].score =
          "Value must be greater than 0.";
      }

      if (!(condition.trigger_description || "").trim()) {
        errors.conditions[conditionKey].trigger_description =
          "Trigger description is required.";
      }
    });
  });

  return errors;
}

export function hasValidationErrors(validationErrors) {
  if (!validationErrors) return false;

  const hasRuleErrors = Object.values(validationErrors.rules || {}).some(
    (ruleError) => Object.values(ruleError || {}).some(Boolean)
  );

  const hasConditionErrors = Object.values(
    validationErrors.conditions || {}
  ).some((conditionError) => Object.values(conditionError || {}).some(Boolean));

  return hasRuleErrors || hasConditionErrors;
}
