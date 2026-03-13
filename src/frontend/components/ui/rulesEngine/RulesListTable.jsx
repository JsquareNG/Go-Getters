import React from "react";
import { Plus } from "lucide-react";
import ConditionCard from "./ConditionCard";
import RuleTableRow from "./RuleTableRow";
import RuleConditionsPanel from "./RuleConditionsPanel";

function getFieldMeta(fieldName) {
  const FIELD_OPTIONS = [
    { value: "years_incorporated", label: "years_incorporated", kind: "number" },
    { value: "ownership_pct", label: "ownership_pct", kind: "number" },
    { value: "is_signatory", label: "is_signatory", kind: "boolean" },
    {
      value: "country_of_incorporation",
      label: "country_of_incorporation",
      kind: "list",
    },
    { value: "business_country", label: "business_country", kind: "list" },
    { value: "industry", label: "industry", kind: "list" },
  ];

  return FIELD_OPTIONS.find((item) => item.value === fieldName) || null;
}

function getDefaultOperatorForField(fieldName, branchType = "ELSE_IF") {
  if (branchType === "ELSE") return "ELSE";
  if (!fieldName) return "";

  const meta = getFieldMeta(fieldName);

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

function buildEmptyCondition(isFirst = false, mode = "BRANCH", firstFieldName = "") {
  const defaultField = isFirst
    ? "years_incorporated"
    : mode === "AND"
    ? ""
    : firstFieldName || "years_incorporated";

  return {
    condition_id: null,
    __tempId: `new-condition-${Date.now()}-${Math.random()}`,
    condition_group: isFirst ? 1 : null,
    order_no: isFirst ? 1 : null,
    field_name: defaultField,
    operator: getDefaultOperatorForField(defaultField, isFirst ? "IF" : "ELSE_IF"),
    value_type: defaultField ? "NUMBER" : "",
    numeric_value: "",
    string_value: null,
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

export default function RulesListTable({
  rows,
  loading,
  expandedRuleIds,
  onToggleExpand,
  onRulesChange,
  onRemoveNewRule,
  bottomRef,
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
          conditions: [buildEmptyCondition(true)],
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
          buildEmptyCondition(false, flowMode, firstFieldName),
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
          return {
            ...condition,
            uiConnector: "AND",
            branchType: null,
            field_name:
              condition.field_name === firstFieldName ? "" : condition.field_name,
            operator: getDefaultOperatorForField(
              condition.field_name === firstFieldName ? "" : condition.field_name,
              "ELSE_IF"
            ),
          };
        }

        return {
          ...condition,
          uiConnector: "NEW_GROUP",
          branchType:
            condition.branchType && condition.branchType !== "IF"
              ? condition.branchType
              : "ELSE_IF",
          field_name: firstFieldName,
          operator:
            condition.branchType === "ELSE"
              ? "ELSE"
              : getDefaultOperatorForField(firstFieldName, "ELSE_IF"),
        };
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

      const nextConditions = conditions.map((condition) => {
        if (getConditionKey(condition) !== conditionKey) return condition;

        if (field === "field_name") {
          const nextField = value;

          const usedFields = getUsedAndFieldNames(conditions, conditionKey);
          if (usedFields.includes(nextField)) {
            return condition;
          }

          const meta = getFieldMeta(nextField);

          return {
            ...condition,
            field_name: nextField,
            operator: getDefaultOperatorForField(nextField, "ELSE_IF"),
            numeric_value: meta?.kind === "number" ? "" : "",
            boolean_value: meta?.kind === "boolean" ? true : false,
            list_name: meta?.kind === "list" ? "" : "",
          };
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
              list_name: "",
            };
          }

          return condition;
        }

        return {
          ...condition,
          field_name: nextConditions[0]?.field_name || condition.field_name,
          operator:
            condition.branchType === "ELSE"
              ? "ELSE"
              : getDefaultOperatorForField(
                  nextConditions[0]?.field_name || condition.field_name,
                  condition.branchType || "ELSE_IF"
                ),
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

      if (value === "ELSE" && targetIndex !== conditions.length - 1) {
        return rule;
      }

      const firstFieldName = conditions[0]?.field_name || "";

      const nextConditions = conditions.map((condition, index) => {
        if (index === 0) return condition;
        if (index < targetIndex) return condition;

        if (index === targetIndex) {
          if (value === "AND") {
            return {
              ...condition,
              uiConnector: "AND",
              branchType: null,
              field_name:
                condition.field_name === firstFieldName ? "" : condition.field_name,
              operator: getDefaultOperatorForField(
                condition.field_name === firstFieldName ? "" : condition.field_name,
                "ELSE_IF"
              ),
            };
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

          return {
            ...condition,
            uiConnector: "NEW_GROUP",
            branchType: "ELSE_IF",
            field_name: firstFieldName,
            operator: getDefaultOperatorForField(firstFieldName, "ELSE_IF"),
          };
        }

        if (value === "AND") {
          return {
            ...condition,
            uiConnector: "AND",
            branchType: null,
            field_name:
              condition.field_name === firstFieldName ? "" : condition.field_name,
            operator: getDefaultOperatorForField(
              condition.field_name === firstFieldName ? "" : condition.field_name,
              "ELSE_IF"
            ),
          };
        }

        return {
          ...condition,
          uiConnector: "NEW_GROUP",
          branchType: condition.branchType === "ELSE" ? "ELSE" : "ELSE_IF",
          field_name: firstFieldName,
          operator:
            condition.branchType === "ELSE"
              ? "ELSE"
              : getDefaultOperatorForField(firstFieldName, "ELSE_IF"),
        };
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

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="max-h-[620px] overflow-x-auto overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-700">
            <tr>
              <th className="w-14 px-4 py-3 font-medium"></th>
              <th className="px-4 py-3 font-medium">Rule Code</th>
              <th className="px-4 py-3 font-medium">Rule Name</th>
              <th className="px-4 py-3 font-medium">Description</th>
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