import React from "react";
import RuleTableRow from "./RuleTableRow";
import RuleConditionsPanel from "./RuleConditionsPanel";

function getFieldMeta(fieldOptions, fieldName, condition = null) {
  const found = fieldOptions.find((item) => item.value === fieldName);
  if (found) return found;

  if (fieldName) {
    const operator = (condition?.operator || "").toUpperCase();
    const valueType = (condition?.value_type || "").toUpperCase();

    if (operator === "IS_TRUE" || operator === "IS_FALSE" || valueType === "BOOLEAN") {
      return {
        value: fieldName,
        label: fieldName,
        kind: "boolean",
        isLegacy: true,
      };
    }

    if (valueType === "STRING") {
      return {
        value: fieldName,
        label: fieldName,
        kind: "string",
        isLegacy: true,
      };
    }

    if (operator === "IN_LIST" || valueType === "LIST") {
      return {
        value: fieldName,
        label: fieldName,
        kind: "list",
        isLegacy: true,
      };
    }

    return {
      value: fieldName,
      label: fieldName,
      kind: "number",
      isLegacy: true,
    };
  }

  return null;
}

function getDefaultOperatorForField(fieldOptions, fieldName, branchType = "ELSE_IF") {
  if (branchType === "ELSE") return "ELSE";
  if (!fieldName) return "";

  const meta = getFieldMeta(fieldOptions, fieldName);

  if (!meta) return "";
  if (meta.kind === "boolean") return "IS_TRUE";
  if (meta.kind === "list") return "IN_LIST";
  return "EQ";
}

function getConditionKey(condition) {
  return condition.condition_id ?? condition.__tempId;
}

function getRuleKey(rule) {
  return rule.rule_id ?? rule.__tempId;
}

function buildEmptyCondition(fieldOptions, isFirst = false, mode = "BRANCH", firstFieldName = "") {
  const fallbackField = fieldOptions[0]?.value || "";

  const defaultField = isFirst
    ? fallbackField
    : mode === "AND"
    ? ""
    : firstFieldName || fallbackField;

  const defaultMeta = defaultField ? getFieldMeta(fieldOptions, defaultField) : null;

  return {
    condition_id: null,
    __tempId: `new-condition-${Date.now()}-${Math.random()}`,
    condition_group: isFirst ? 1 : null,
    order_no: isFirst ? 1 : null,
    field_name: defaultField,
    operator: getDefaultOperatorForField(
      fieldOptions, 
      defaultField,
      isFirst ? "IF" : "ELSE_IF"
    ),
    value_type:
      defaultMeta?.kind === "boolean"
        ? "BOOLEAN"
        : defaultMeta?.kind === "list"
        ? "LIST"
        : defaultMeta?.kind === "string"
        ? "STRING"
        : defaultField
        ? "NUMBER"
        : "",
    numeric_value: "",
    string_value: "",
    boolean_value: true,
    list_name: "",
    score: "",
    trigger_description: "",
    is_active: true,
    isNew: true,
    uiConnector: isFirst ? null : mode === "AND" ? "AND" : "NEW_GROUP",
    branchType: isFirst ? "IF" : mode === "AND" ? null : "ELSE_IF",
  };
}

function getRuleFlowMode(conditions = []) {
  if (conditions.length <= 1) return null;
  const second = conditions[1];
  if (!second) return null;
  return second.uiConnector === "AND" ? "AND" : "BRANCH";
}

function getUsedAndFieldNames(conditions = [], excludeConditionKey = null) {
  return conditions
    .filter(
      (condition, index) =>
        condition.field_name &&
        (index === 0 || condition.uiConnector === "AND") &&
        getConditionKey(condition) !== excludeConditionKey
    )
    .map((condition) => condition.field_name);
}

function isNumericOperator(operator = "") {
  return ["EQ", "NE", "GT", "GTE", "LT", "LTE"].includes(
    (operator || "").toUpperCase()
  );
}

function normalizeConditionByFieldKind(fieldOptions, condition, fieldName, branchType = "ELSE_IF") {
  const meta = getFieldMeta(fieldOptions, fieldName, condition);

  if (!meta) {
    return {
      ...condition,
      field_name: fieldName,
      operator: "",
      value_type: "",
      numeric_value: "",
      string_value: "",
      boolean_value: true,
      list_name: "",
    };
  }

  if (branchType === "ELSE") {
    return {
      ...condition,
      field_name: fieldName,
      operator: "ELSE",
    };
  }

  if (meta.kind === "number") {
    const currentOperator = (condition.operator || "").toUpperCase();

    return {
      ...condition,
      field_name: fieldName,
      operator: isNumericOperator(currentOperator) ? currentOperator : "EQ",
      value_type: "NUMBER",
      numeric_value: condition.numeric_value ?? "",
      string_value: "",
      boolean_value: true,
      list_name: "",
    };
  }

  if (meta.kind === "boolean") {
    const currentOperator = (condition.operator || "").toUpperCase();
    const nextBooleanOperator =
      currentOperator === "IS_TRUE" || currentOperator === "IS_FALSE"
        ? currentOperator
        : "IS_TRUE";

    return {
      ...condition,
      field_name: fieldName,
      operator: nextBooleanOperator,
      value_type: "BOOLEAN",
      numeric_value: "",
      string_value: "",
      list_name: "",
      boolean_value:
        typeof condition.boolean_value === "boolean"
          ? condition.boolean_value
          : nextBooleanOperator === "IS_TRUE",
    };
  }

  if (meta.kind === "list") {
    return {
      ...condition,
      field_name: fieldName,
      operator: "IN_LIST",
      value_type: "LIST",
      numeric_value: "",
      string_value: "",
      boolean_value: null,
      list_name: condition.list_name || "",
    };
  }

  if (meta.kind === "string") {
    const currentOperator = (condition.operator || "").toUpperCase();
    const nextOperator =
      currentOperator === "EQ" || currentOperator === "NE"
        ? currentOperator
        : "EQ";

    return {
      ...condition,
      field_name: fieldName,
      operator: nextOperator,
      value_type: "STRING",
      numeric_value: "",
      string_value: condition.string_value ?? "",
      boolean_value: null,
      list_name: "",
    };
  }

  return condition;
}

export default function RulesListTable({
  rows,
  loading,
  expandedRuleIds,
  onToggleExpand,
  onRulesChange,
  onRemoveNewRule,
  bottomRef,
  validationErrors,
  showValidation,
  fieldOptions = [], 
}) {
  const handleToggleRuleActive = (ruleKey) => {
    const nextRows = rows.map((rule) => {
      const currentKey = getRuleKey(rule);
      if (currentKey !== ruleKey) return rule;

      const nextRuleActive = !rule.is_active;
      const allConditionsInactive = (rule.conditions || []).every(
        (condition) => !condition.is_active
      );

      return {
        ...rule,
        is_active: nextRuleActive,
        conditions: (rule.conditions || []).map((condition) => ({
          ...condition,
          is_active: nextRuleActive
            ? allConditionsInactive
              ? true
              : condition.is_active
            : false,
        })),
      };
    });

    onRulesChange(nextRows);
  };

  const handleRuleFieldChange = (ruleKey, field, value) => {
    const nextRows = rows.map((rule) => {
      const currentKey = getRuleKey(rule);
      if (currentKey !== ruleKey) return rule;
      return { ...rule, [field]: value };
    });

    onRulesChange(nextRows);
  };

  const handleAddCondition = (ruleKey) => {
    const nextRows = rows.map((rule) => {
      const currentKey = getRuleKey(rule);
      if (currentKey !== ruleKey) return rule;

      const conditions = rule.conditions || [];

      if (!conditions.length) {
        return {
          ...rule,
          conditions: [buildEmptyCondition(fieldOptions, true)],
        };
      }

      const lastCondition = conditions[conditions.length - 1];
      if (lastCondition?.branchType === "ELSE") {
        return rule;
      }

      const flowMode = getRuleFlowMode(conditions) || "BRANCH";
      const firstFieldName = conditions[0]?.field_name || "";

      return {
        ...rule,
        conditions: [
          ...conditions,
          buildEmptyCondition(fieldOptions, false, flowMode, firstFieldName),
        ],
      };
    });

    onRulesChange(nextRows);
  };

  const handleRemoveCondition = (ruleKey, conditionKey) => {
    const nextRows = rows.map((rule) => {
      const currentKey = getRuleKey(rule);
      if (currentKey !== ruleKey) return rule;

      const nextConditions = (rule.conditions || []).filter(
        (condition) => getConditionKey(condition) !== conditionKey
      );

      if (!nextConditions.length) {
        return { ...rule, conditions: [] };
      }

      const flowMode = getRuleFlowMode(nextConditions);
      const firstFieldName = nextConditions[0]?.field_name || "";

      const normalized = nextConditions.map((condition, index) => {
        if (index === 0) {
          return {
            ...condition,
            uiConnector: null,
            branchType: "IF",
          };
        }

        if (flowMode === "AND") {
          const nextFieldName =
            condition.field_name === firstFieldName ? "" : condition.field_name;

          return normalizeConditionByFieldKind(
            fieldOptions,
            {
              ...condition,
              uiConnector: "AND",
              branchType: null,
            },
            nextFieldName,
            "ELSE_IF"
          );
        }

        if (condition.branchType === "ELSE") {
          return {
            ...condition,
            uiConnector: "NEW_GROUP",
            branchType: "ELSE",
            field_name: firstFieldName,
            operator: "ELSE",
          };
        }

        return normalizeConditionByFieldKind(
          fieldOptions,
          {
            ...condition,
            uiConnector: "NEW_GROUP",
            branchType: "ELSE_IF",
          },
          firstFieldName,
          "ELSE_IF"
        );
      });

      return {
        ...rule,
        conditions: normalized,
      };
    });

    onRulesChange(nextRows);
  };

  const handleToggleConditionActive = (conditionKey) => {
    const nextRows = rows.map((rule) => {
      const nextConditions = (rule.conditions || []).map((condition) =>
        getConditionKey(condition) === conditionKey
          ? { ...condition, is_active: !condition.is_active }
          : condition
      );

      const changed = nextConditions.some(
        (condition, index) => condition !== (rule.conditions || [])[index]
      );

      if (!changed) return rule;

      const hasAnyActiveCondition = nextConditions.some(
        (condition) => condition.is_active
      );

      return {
        ...rule,
        conditions: nextConditions,
        is_active: hasAnyActiveCondition,
      };
    });

    onRulesChange(nextRows);
  };

  const handleConditionFieldChange = (conditionKey, field, value) => {
    const nextRows = rows.map((rule) => {
      const conditions = rule.conditions || [];
      const targetIndex = conditions.findIndex(
        (condition) => getConditionKey(condition) === conditionKey
      );

      if (targetIndex === -1) return rule;

      const oldFirstFieldName = conditions[0]?.field_name || "";

      const nextConditions = conditions.map((condition) => {
        if (getConditionKey(condition) !== conditionKey) return condition;

        if (field === "field_name") {
          const nextField = value;

          const usedFields = getUsedAndFieldNames(conditions, conditionKey);
          if (usedFields.includes(nextField)) {
            return condition;
          }

          return normalizeConditionByFieldKind(
            fieldOptions,
            condition,
            nextField,
            condition.branchType || "ELSE_IF"
          );
        }

        if (field === "operator") {
          return {
            ...condition,
            operator: value,
          };
        }

        if (field === "numeric_value" || field === "score") {
          return {
            ...condition,
            [field]: value === "" ? "" : Number(value),
          };
        }

        if (field === "string_value") {
          return {
            ...condition,
            string_value: value,
          };
        }

        if (field === "boolean_value") {
          return {
            ...condition,
            boolean_value: value === "true",
          };
        }

        return {
          ...condition,
          [field]: value,
        };
      });

      const newFirstFieldName = nextConditions[0]?.field_name || "";
      const firstFieldChanged = oldFirstFieldName !== newFirstFieldName;

      const syncedConditions = nextConditions.map((condition, index, arr) => {
        if (index === 0) return condition;

        if (condition.uiConnector === "AND") {
          const previousUsedFields = arr
            .slice(0, index)
            .filter((item, idx) => idx === 0 || item.uiConnector === "AND")
            .map((item) => item.field_name)
            .filter(Boolean);

          if (
            condition.field_name &&
            previousUsedFields.includes(condition.field_name)
          ) {
            return {
              ...condition,
              field_name: "",
              operator: "",
              numeric_value: "",
              string_value: "",
              list_name: "",
            };
          }

          return condition;
        }

        if (condition.branchType === "ELSE") {
          return {
            ...condition,
            field_name: newFirstFieldName,
            operator: "ELSE",
          };
        }

        if (firstFieldChanged) {
          return normalizeConditionByFieldKind(
            fieldOptions,
            condition,
            newFirstFieldName,
            condition.branchType || "ELSE_IF"
          );
        }

        return {
          ...condition,
          field_name: newFirstFieldName || condition.field_name,
        };
      });

      return {
        ...rule,
        conditions: syncedConditions,
      };
    });

    onRulesChange(nextRows);
  };

  const handleConditionTypeChange = (conditionKey, value) => {
    const nextRows = rows.map((rule) => {
      const conditions = rule.conditions || [];
      const targetIndex = conditions.findIndex(
        (condition) => getConditionKey(condition) === conditionKey
      );

      if (targetIndex === -1) return rule;
      if (value === "ELSE" && targetIndex !== conditions.length - 1) return rule;

      const firstFieldName = conditions[0]?.field_name || "";

      const nextConditions = conditions.map((condition, index) => {
        if (index === 0) return condition;
        if (index < targetIndex) return condition;

        if (index === targetIndex) {
          if (value === "AND") {
            const nextFieldName =
              condition.field_name === firstFieldName ? "" : condition.field_name;

            return normalizeConditionByFieldKind(
              fieldOptions,
              {
                ...condition,
                uiConnector: "AND",
                branchType: null,
              },
              nextFieldName,
              "ELSE_IF"
            );
          }

          if (value === "ELSE") {
            return {
              ...condition,
              uiConnector: "NEW_GROUP",
              branchType: "ELSE",
              field_name: firstFieldName,
              operator: "ELSE",
            };
          }

          return normalizeConditionByFieldKind(
            fieldOptions,
            {
              ...condition,
              uiConnector: "NEW_GROUP",
              branchType: "ELSE_IF",
            },
            firstFieldName,
            "ELSE_IF"
          );
        }

        if (value === "AND") {
          const nextFieldName =
            condition.field_name === firstFieldName ? "" : condition.field_name;

          return normalizeConditionByFieldKind(
            fieldOptions,
            {
              ...condition,
              uiConnector: "AND",
              branchType: null,
            },
            nextFieldName,
            "ELSE_IF"
          );
        }

        if (condition.branchType === "ELSE") {
          return {
            ...condition,
            uiConnector: "NEW_GROUP",
            branchType: "ELSE",
            field_name: firstFieldName,
            operator: "ELSE",
          };
        }

        return normalizeConditionByFieldKind(
          fieldOptions,
          {
            ...condition,
            uiConnector: "NEW_GROUP",
            branchType: "ELSE_IF",
          },
          firstFieldName,
          "ELSE_IF"
        );
      });

      return {
        ...rule,
        conditions: nextConditions,
      };
    });

    onRulesChange(nextRows);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Loading rules...
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
        No rules found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="max-h-[820px] overflow-x-auto overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-700">
            <tr>
              <th className="w-14 px-4 py-3 font-medium"></th>
              <th className="px-4 py-3 font-medium">Rule Code</th>
              <th className="px-4 py-3 font-medium">Rule Name</th>
              <th className="min-w-[320px] px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-center">Active</th>
              <th className="px-4 py-3 font-medium text-center">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((row) => {
              const rowKey = getRuleKey(row);
              const expanded = Boolean(expandedRuleIds[rowKey]);
              const conditions = row.conditions || [];

              const ruleErrors = validationErrors?.rules?.[rowKey] || {};
              const hasRuleError = Object.values(ruleErrors).some(Boolean);

              const hasConditionError = conditions.some((condition) => {
                const conditionKey = getConditionKey(condition);
                const conditionErrorObj = validationErrors?.conditions?.[conditionKey] || {};
                return Object.values(conditionErrorObj).some(Boolean);
              });

              const hasAnyErrors = showValidation && (hasRuleError || hasConditionError);

              return (
                <React.Fragment key={rowKey}>
                  <RuleTableRow
                    row={row}
                    rowKey={rowKey}
                    expanded={expanded}
                    onToggleExpand={onToggleExpand}
                    onRuleFieldChange={handleRuleFieldChange}
                    onToggleRuleActive={handleToggleRuleActive}
                    onRemoveNewRule={onRemoveNewRule}
                    ruleErrors={validationErrors?.rules?.[rowKey] || {}}
                    showValidation={showValidation}
                    hasAnyErrors={hasAnyErrors}
                    hasConditionError={showValidation && hasConditionError}
                  />

                  {expanded && (
                    <RuleConditionsPanel
                      rowKey={rowKey}
                      conditions={conditions}
                      onAddCondition={handleAddCondition}
                      onConditionTypeChange={handleConditionTypeChange}
                      onConditionFieldChange={handleConditionFieldChange}
                      onToggleConditionActive={handleToggleConditionActive}
                      onRemoveCondition={handleRemoveCondition}
                      ruleErrors={validationErrors?.rules?.[rowKey] || {}}
                      conditionErrors={validationErrors?.conditions || {}}
                      showValidation={showValidation}
                      fieldOptions={fieldOptions}
                    />
                  )}
                </React.Fragment>
              );
            })}

            <tr ref={bottomRef} />
          </tbody>
        </table>
      </div>
    </div>
  );
}