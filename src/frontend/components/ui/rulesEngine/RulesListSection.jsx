import React, { useEffect, useMemo, useRef, useState } from "react";
import RulesListTable from "./RulesListTable";
import RulesListHeader from "./RulesListHeader";
import RulesListFooterActions from "./RulesListFooterActions";
import ConfirmModal from "./common/ConfirmModal";
import {
  getRiskRulesByCategory,
  saveRiskRuleChanges,
  getBasicComplianceCategories,
  getRuleFieldOptions,
} from "../../../api/riskRuleApi";
import {
  validateRulesListRows,
  hasValidationErrors,
} from "./ruleValidation";

const NUMERIC_OPERATOR_CODES = new Set(["EQ", "NE", "GT", "GTE", "LT", "LTE"]);

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

    if (operator === "IN_LIST"  || valueType === "LIST") {
      return {
        value: fieldName,
        label: fieldName,
        kind: "list",
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

    return {
      value: fieldName,
      label: fieldName,
      kind: "number",
      isLegacy: true,
    };
  }

  return null;
}

function getValueTypeForCondition(fieldOptions, condition) {
  const branchType = condition.branchType || "ELSE_IF";
  if (branchType === "ELSE") return "NONE";

  const meta = getFieldMeta(fieldOptions, condition.field_name, condition);

  if (meta?.kind === "boolean") return "BOOLEAN";
  if (meta?.kind === "list") return "LIST";
  if (meta?.kind === "string") return "STRING";
  return "NUMBER";
}

function normalizeRule(rule) {
  const sortedConditions = [...(rule.conditions || [])].sort((a, b) => {
    if ((a.condition_group ?? 0) !== (b.condition_group ?? 0)) {
      return (a.condition_group ?? 0) - (b.condition_group ?? 0);
    }

    if ((a.order_no ?? 0) !== (b.order_no ?? 0)) {
      return (a.order_no ?? 0) - (b.order_no ?? 0);
    }

    return (a.field_name || "")
      .toLowerCase()
      .localeCompare((b.field_name || "").toLowerCase());
  });

  let previousGroup = null;

  return {
    rule_id: rule.rule_id ?? rule.id,
    __tempId: null,
    __clientOrder: null,
    rule_code: rule.rule_code ?? "",
    rule_name: rule.rule_name ?? "",
    category: rule.category ?? "",
    description: rule.description ?? "",
    is_active: Boolean(rule.is_active),
    created_at: rule.created_at ?? null,
    updated_at: rule.updated_at ?? null,
    isNew: false,
    conditions: sortedConditions.map((condition, index) => {
      const currentGroup = condition.condition_group ?? 1;
      const sameGroupAsPrevious =
        index > 0 && previousGroup != null && currentGroup === previousGroup;

      const operator = (condition.operator || "").toUpperCase();

      const normalized = {
        condition_id: condition.condition_id ?? condition.id,
        __tempId: null,
        condition_group: currentGroup,
        order_no: condition.order_no ?? 1,
        field_name: condition.field_name ?? "years_incorporated",
        operator: operator || "EQ",
        value_type: condition.value_type ?? "",
        numeric_value: condition.numeric_value ?? "",
        string_value: condition.string_value ?? null,
        boolean_value:
          typeof condition.boolean_value === "boolean"
            ? condition.boolean_value
            : true,
        list_name: condition.list_name ?? "",
        score: condition.score ?? "",
        trigger_description: condition.trigger_description ?? "",
        is_active: Boolean(condition.is_active),
        isNew: false,
        uiConnector:
          index === 0 ? null : sameGroupAsPrevious ? "AND" : "NEW_GROUP",
        branchType:
          index === 0
            ? "IF"
            : sameGroupAsPrevious
            ? null
            : operator === "ELSE"
            ? "ELSE"
            : "ELSE_IF",
      };

      previousGroup = currentGroup;
      return normalized;
    }),
  };
}

function deepCloneRules(rows) {
  return rows.map((rule) => ({
    ...rule,
    conditions: (rule.conditions || []).map((condition) => ({ ...condition })),
  }));
}

function getRuleKey(rule) {
  return rule.rule_id ?? rule.__tempId;
}

function serializeConditionsForSave(fieldOptions, conditions = []) {
  let currentGroup = 1;
  let currentOrder = 1;

  return conditions.map((condition, index) => {
    if (index === 0) {
      currentGroup = 1;
      currentOrder = 1;
    } else if (condition.uiConnector === "AND") {
      currentOrder += 1;
    } else {
      currentGroup += 1;
      currentOrder = 1;
    }

    const branchType =
      index === 0
        ? "IF"
        : condition.uiConnector === "AND"
        ? null
        : condition.branchType || "ELSE_IF";

    const isElse = branchType === "ELSE";

    return {
      condition_id: condition.condition_id,
      condition_group: currentGroup,
      order_no: currentOrder,
      field_name: condition.field_name || null,
      operator: isElse ? "ELSE" : condition.operator,
      value_type: getValueTypeForCondition(fieldOptions, condition),
      numeric_value:
        !isElse &&
        NUMERIC_OPERATOR_CODES.has((condition.operator || "").toUpperCase()) &&
        condition.numeric_value !== ""
          ? Number(condition.numeric_value)
          : null,
      string_value: condition.string_value,
      boolean_value:
        !isElse &&
        ["IS_TRUE", "IS_FALSE"].includes((condition.operator || "").toUpperCase())
          ? Boolean(condition.boolean_value)
          : null,
      list_name:
        !isElse && (condition.operator || "").toUpperCase() === "IN_LIST"
          ? condition.list_name || null
          : null,
      score: condition.score === "" ? 0 : Number(condition.score),
      trigger_description: condition.trigger_description || "",
      is_active: Boolean(condition.is_active),
    };
  });
}

function areRulesSame(a, b) {
  return (
    JSON.stringify({
      rule_id: a.rule_id,
      rule_name: a.rule_name,
      description: a.description,
      is_active: a.is_active,
      rule_code: a.rule_code,
    }) ===
    JSON.stringify({
      rule_id: b.rule_id,
      rule_name: b.rule_name,
      description: b.description,
      is_active: b.is_active,
      rule_code: b.rule_code,
    })
  );
}

function areSerializedConditionsSame(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildSavePayload(serverRows, workingRows, fieldOptions) {
  const payload = {
    // Existing rules that were edited
    rules: [],

    // Existing conditions that were edited
    conditions: [],

    // Brand new rules, each with their own initial conditions
    creates: [],

    // Brand new conditions added under existing rules
    new_conditions: [],
  };

  // Map existing server rules by rule_id for comparison
  const serverRuleMap = new Map(serverRows.map((rule) => [rule.rule_id, rule]));

  for (const workingRule of workingRows) {
    // Serialize current working conditions into backend-ready format
    // This computes:
    // - condition_group
    // - order_no
    // - field_name / operator / value_type / values
    const serializedWorkingConditions = serializeConditionsForSave(
      fieldOptions,
      workingRule.conditions || []
    );

    // =========================================================
    // CASE 1: BRAND NEW RULE
    // =========================================================
    // New rule should go into `creates`
    // together with ALL of its conditions.
    if (workingRule.isNew) {
      payload.creates.push({
        rule_code: (workingRule.rule_code || "").trim(),
        rule_name: (workingRule.rule_name || "").trim(),
        category: workingRule.category,
        description: (workingRule.description || "").trim(),
        is_active: Boolean(workingRule.is_active),

        conditions: serializedWorkingConditions.map((condition) => ({
          condition_group: condition.condition_group,
          order_no: condition.order_no,
          field_name: condition.field_name,
          operator: condition.operator,
          value_type: condition.value_type,
          numeric_value: condition.numeric_value,
          string_value: condition.string_value,
          boolean_value: condition.boolean_value,
          list_name: condition.list_name,
          score: condition.score,
          trigger_description: condition.trigger_description,
          is_active: Boolean(condition.is_active),
        })),
      });

      continue;
    }

    // =========================================================
    // CASE 2: EXISTING RULE
    // =========================================================
    const serverRule = serverRuleMap.get(workingRule.rule_id);

    // safety guard
    if (!serverRule) continue;

    // ---------------------------------------------------------
    // 2A. Check if existing RULE fields changed
    // ---------------------------------------------------------
    // Only push into `rules` if the actual editable rule fields changed.
    const ruleChanged =
      (workingRule.rule_code || "").trim() !==
        (serverRule.rule_code || "").trim() ||
      (workingRule.rule_name || "").trim() !==
        (serverRule.rule_name || "").trim() ||
      (workingRule.description || "").trim() !==
        (serverRule.description || "").trim() ||
      Boolean(workingRule.is_active) !== Boolean(serverRule.is_active);

    if (ruleChanged) {
      payload.rules.push({
        rule_id: workingRule.rule_id,
        rule_code: (workingRule.rule_code || "").trim(),
        rule_name: (workingRule.rule_name || "").trim(),
        description: (workingRule.description || "").trim(),
        is_active: Boolean(workingRule.is_active),
      });
    }

    // ---------------------------------------------------------
    // 2B. Compare existing CONDITIONS
    // ---------------------------------------------------------
    // Serialize server conditions into the same shape as working conditions
    // so comparisons are apples-to-apples.
    const serializedServerConditions = serializeConditionsForSave(
      fieldOptions,
      serverRule.conditions || []
    );

    const serverConditionMap = new Map(
      serializedServerConditions.map((condition) => [
        condition.condition_id,
        condition,
      ])
    );

    for (const workingCondition of serializedWorkingConditions) {
      // -------------------------------------------------------
      // NEW CONDITION under EXISTING rule
      // -------------------------------------------------------
      if (!workingCondition.condition_id) {
        payload.new_conditions.push({
          rule_id: workingRule.rule_id,
          condition_group: workingCondition.condition_group,
          order_no: workingCondition.order_no,
          field_name: workingCondition.field_name,
          operator: workingCondition.operator,
          value_type: workingCondition.value_type,
          numeric_value: workingCondition.numeric_value,
          string_value: workingCondition.string_value,
          boolean_value: workingCondition.boolean_value,
          list_name: workingCondition.list_name,
          score: workingCondition.score,
          trigger_description: workingCondition.trigger_description,
          is_active: Boolean(workingCondition.is_active),
        });

        continue;
      }

      // -------------------------------------------------------
      // EXISTING CONDITION that may have been edited
      // -------------------------------------------------------
      const serverCondition = serverConditionMap.get(
        workingCondition.condition_id
      );

      if (!serverCondition) continue;

      const conditionChanged =
        workingCondition.condition_group !== serverCondition.condition_group ||
        workingCondition.order_no !== serverCondition.order_no ||
        workingCondition.field_name !== serverCondition.field_name ||
        workingCondition.operator !== serverCondition.operator ||
        workingCondition.value_type !== serverCondition.value_type ||
        workingCondition.numeric_value !== serverCondition.numeric_value ||
        workingCondition.string_value !== serverCondition.string_value ||
        workingCondition.boolean_value !== serverCondition.boolean_value ||
        workingCondition.list_name !== serverCondition.list_name ||
        workingCondition.score !== serverCondition.score ||
        (workingCondition.trigger_description || "") !==
          (serverCondition.trigger_description || "") ||
        Boolean(workingCondition.is_active) !==
          Boolean(serverCondition.is_active);

      if (conditionChanged) {
        payload.conditions.push({
          condition_id: workingCondition.condition_id,
          condition_group: workingCondition.condition_group,
          order_no: workingCondition.order_no,
          field_name: workingCondition.field_name,
          operator: workingCondition.operator,
          value_type: workingCondition.value_type,
          numeric_value: workingCondition.numeric_value,
          string_value: workingCondition.string_value,
          boolean_value: workingCondition.boolean_value,
          list_name: workingCondition.list_name,
          score: workingCondition.score,
          trigger_description: workingCondition.trigger_description,
          is_active: Boolean(workingCondition.is_active),
        });
      }
    }
  }

  return payload;
}

function getRuleKeysWithErrors(rows, validationErrors) {
  const invalidRuleKeys = new Set();

  rows.forEach((rule) => {
    const ruleKey = getRuleKey(rule);
    const ruleErrorObj = validationErrors?.rules?.[ruleKey] || {};
    const hasRuleError = Object.values(ruleErrorObj).some(Boolean);

    const hasConditionError = (rule.conditions || []).some((condition) => {
      const conditionKey = condition.condition_id ?? condition.__tempId;
      const conditionErrorObj = validationErrors?.conditions?.[conditionKey] || {};
      return Object.values(conditionErrorObj).some(Boolean);
    });

    if (hasRuleError || hasConditionError) {
      invalidRuleKeys.add(ruleKey);
    }
  });

  return invalidRuleKeys;
}

export default function RulesListSection() {
  const [activeCategory, setActiveCategory] = useState("BASIC");
  const [serverRows, setServerRows] = useState([]);
  const [workingRows, setWorkingRows] = useState([]);
  const [expandedRuleIds, setExpandedRuleIds] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [displayValidationErrors, setDisplayValidationErrors] = useState({
    rules: {},
    conditions: {},
  });
  const [basicComplianceFilter, setBasicComplianceFilter] = useState("");
  const [basicComplianceCategories, setBasicComplianceCategories] = useState([]);
  const [fieldOptions, setFieldOptions] = useState([]);
  const bottomRef = useRef(null);
  const effectiveCategory =
  activeCategory === "BASIC" ? basicComplianceFilter : activeCategory;

  const [confirmState, setConfirmState] = useState({
    open: false,
    action: null,
  });

  const fetchRows = async (category) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const data = await getRiskRulesByCategory(category);
      const normalized = (data || []).map(normalizeRule);

      setServerRows(normalized);
      setWorkingRows(deepCloneRules(normalized));
      setExpandedRuleIds({});
      setDisplayValidationErrors({ rules: {}, conditions: {} });
      setShowValidation(false);
    } catch (err) {
      setServerRows([]);
      setWorkingRows([]);
      setExpandedRuleIds({});
      setDisplayValidationErrors({ rules: {}, conditions: {} });
      setShowValidation(false);
      setError(err?.response?.data?.detail || "Failed to load rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCategory === "BASIC") {
      if (basicComplianceFilter) {
        fetchRows(basicComplianceFilter);
      }
      return;
    }

    fetchRows(activeCategory);
  }, [activeCategory, basicComplianceFilter]);

  useEffect(() => {
    const fetchBasicCategories = async () => {
      try {
        const categories = await getBasicComplianceCategories();
        setBasicComplianceCategories(categories);

        if (categories.length) {
          setBasicComplianceFilter(categories[0]);
        } else {
          setBasicComplianceFilter("");
        }
      } catch (err) {
        console.error("Failed to load basic compliance categories", err);
      }
    };

    if (activeCategory === "BASIC") {
      fetchBasicCategories();
    }
  }, [activeCategory]);

  useEffect(() => {
    const fetchFieldOptions = async () => {
      try {
        if (!effectiveCategory) {
          setFieldOptions([]);
          return;
        }

        const data = await getRuleFieldOptions(effectiveCategory);
        console.log("effectiveCategory:", effectiveCategory);
        console.log("field options response:", data);
        setFieldOptions(data || []);
      } catch (err) {
        console.error("Failed to load field options", err);
        setFieldOptions([]);
      }
    };

    fetchFieldOptions();
  }, [effectiveCategory]);

  const hasChanges = useMemo(() => {
    const payload = buildSavePayload(serverRows, workingRows, fieldOptions);
    return (
      payload.rules.length > 0 ||
      payload.conditions.length > 0 ||
      payload.creates.length > 0 ||
      payload.new_conditions.length > 0
    );
  }, [serverRows, workingRows]);

  const lastRevised = useMemo(() => {
    if (!serverRows.length) return null;

    const validDates = serverRows
      .map((rule) => rule.updated_at || rule.created_at)
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()));

    if (!validDates.length) return null;

    return new Date(Math.max(...validDates.map((date) => date.getTime())));
  }, [serverRows]);

  const formattedLastRevised = useMemo(() => {
    if (!lastRevised) return "No revisions yet";

    return new Intl.DateTimeFormat("en-SG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(lastRevised);
  }, [lastRevised]);

  const committedSortedRows = useMemo(() => {
    return [...serverRows].sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }

      return (a.rule_code || "")
        .toLowerCase()
        .localeCompare((b.rule_code || "").toLowerCase());
    });
  }, [serverRows]);

  const sortedRows = useMemo(() => {
    const committedOrderMap = new Map(
      committedSortedRows.map((row, index) => [row.rule_id, index])
    );

    return [...workingRows].sort((a, b) => {
      const aHasCommittedOrder =
        a.rule_id != null && committedOrderMap.has(a.rule_id);
      const bHasCommittedOrder =
        b.rule_id != null && committedOrderMap.has(b.rule_id);

      if (aHasCommittedOrder && bHasCommittedOrder) {
        return committedOrderMap.get(a.rule_id) - committedOrderMap.get(b.rule_id);
      }

      if (aHasCommittedOrder && !bHasCommittedOrder) return -1;
      if (!aHasCommittedOrder && bHasCommittedOrder) return 1;

      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }

      const aClientOrder = a.__clientOrder ?? 0;
      const bClientOrder = b.__clientOrder ?? 0;

      if (aClientOrder !== bClientOrder) {
        return aClientOrder - bClientOrder;
      }

      return (a.rule_code || "")
        .toLowerCase()
        .localeCompare((b.rule_code || "").toLowerCase());
    });
  }, [workingRows, committedSortedRows]);

  const handleAddRule = () => {
    const tempId = `new-rule-${Date.now()}-${Math.random()}`;

    const nextRows = [
    ...workingRows,
    {
      rule_id: null,
      __tempId: tempId,
      __clientOrder: Date.now() + Math.random(),
      rule_code: "",
      rule_name: "",
      category: activeCategory === "BASIC" ? basicComplianceFilter : activeCategory,
      description: "",
      is_active: true,
      created_at: null,
      updated_at: null,
      isNew: true,
      conditions: [],
    },
  ];

    setWorkingRows(nextRows);
    setExpandedRuleIds((prev) => ({
      ...prev,
      [tempId]: true,
    }));
    setSuccess("");
    setError("");

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 100);
  };

  const handleRemoveNewRule = (targetRule) => {
    if (!targetRule.isNew) return;

    const nextRows = workingRows.filter(
      (rule) => rule.__tempId !== targetRule.__tempId
    );

    setWorkingRows(nextRows);
    setExpandedRuleIds((prev) => {
      const next = { ...prev };
      delete next[targetRule.__tempId];
      return next;
    });
    setSuccess("");
    setError("");
  };

  const handleToggleExpand = (ruleKey) => {
    setExpandedRuleIds((prev) => ({
      ...prev,
      [ruleKey]: !prev[ruleKey],
    }));
  };

  const handleExpandAll = () => {
    const next = {};
    sortedRows.forEach((row) => {
      next[getRuleKey(row)] = true;
    });
    setExpandedRuleIds(next);
  };

  const handleCollapseAll = () => {
    setExpandedRuleIds({});
  };

  const handleRulesChange = (nextRows) => {
    setWorkingRows(nextRows);
    setSuccess("");
    setError("");
  };

  const performResetLocalChanges = () => {
    const resetRows = deepCloneRules(serverRows);
    setWorkingRows(resetRows);
    setExpandedRuleIds({});
    setDisplayValidationErrors({ rules: {}, conditions: {} });
    setShowValidation(false);
    setSuccess("");
    setError("");
  };

  const performSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = buildSavePayload(serverRows, workingRows, fieldOptions);

      console.log("SAVE PAYLOAD:", payload);
      console.log(
        "STRING VALUES:",
        payload.conditions?.map((c) => ({
          operator: c.operator,
          value_type: c.value_type,
          string_value: c.string_value,
        }))
      );

      if (
        !payload.rules.length &&
        !payload.conditions.length &&
        !payload.creates.length &&
        !payload.new_conditions.length
      ) {
        setSuccess("No changes to save.");
        return;
      }

      await saveRiskRuleChanges(payload);

      if (activeCategory === "BASIC") {
        await fetchRows(basicComplianceFilter);
      } else {
        await fetchRows(activeCategory);
      }

      setSuccess("Changes saved successfully.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const openResetConfirm = () => {
    setConfirmState({
      open: true,
      action: "reset",
    });
  };

  const closeConfirm = () => {
    setConfirmState({
      open: false,
      action: null,
    });
  };

  const handleConfirmAction = async () => {
    if (confirmState.action === "reset") {
      performResetLocalChanges();
      closeConfirm();
      return;
    }

    if (confirmState.action === "save") {
      closeConfirm();
      await performSave();
    }
  };

  // const handleSaveButtonClick = async () => {
  //   const nextValidationErrors = validateRulesListRows(workingRows);
  //   setDisplayValidationErrors(nextValidationErrors);
  //   setShowValidation(true);

  //   if (hasValidationErrors(nextValidationErrors)) {
  //     setError("Please resolve the validation errors before saving.");
  //     setSuccess("");
  //     return;
  //   }

  //   if (!hasChanges) return;

  //   setConfirmState({
  //     open: true,
  //     action: "save",
  //   });
  // };
  const handleSaveButtonClick = async () => {
    const nextValidationErrors = validateRulesListRows(workingRows);
    setDisplayValidationErrors(nextValidationErrors);
    setShowValidation(true);

    if (hasValidationErrors(nextValidationErrors)) {
      const invalidRuleKeys = getRuleKeysWithErrors(workingRows, nextValidationErrors);

      setExpandedRuleIds((prev) => {
        const next = { ...prev };
        invalidRuleKeys.forEach((ruleKey) => {
          next[ruleKey] = true;
        });
        return next;
      });

      setError("Please resolve the validation errors before saving.");
      setSuccess("");
      return;
    }

    if (!hasChanges) return;

    setConfirmState({
      open: true,
      action: "save",
    });
  };

  const isSaveConfirm = confirmState.action === "save";

  const modalTitle = isSaveConfirm
    ? "Confirm Save Changes"
    : "Confirm Revert Changes";

  const modalMessage = isSaveConfirm
    ? "Are you sure you want to save your changes? This will update the rules configuration."
    : "Are you sure you want to revert your unsaved changes? This action will discard your current edits.";
    
  return (
    <>
      <div className="space-y-4 pb-28">
        <RulesListHeader
          activeCategory={activeCategory}
          formattedLastRevised={formattedLastRevised}
          onCategoryChange={setActiveCategory}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onAddRule={handleAddRule}
          basicComplianceCategories={basicComplianceCategories}
          basicComplianceFilter={basicComplianceFilter}
          onBasicComplianceFilterChange={setBasicComplianceFilter}
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <RulesListTable
          rows={sortedRows}
          loading={loading}
          expandedRuleIds={expandedRuleIds}
          onToggleExpand={handleToggleExpand}
          onRulesChange={handleRulesChange}
          onRemoveNewRule={handleRemoveNewRule}
          bottomRef={bottomRef}
          validationErrors={displayValidationErrors}
          showValidation={showValidation}
          fieldOptions={fieldOptions}
        />

        <RulesListFooterActions
          hasChanges={hasChanges}
          saving={saving}
          onRevert={openResetConfirm}
          onSave={handleSaveButtonClick}
        />
      </div>

      <ConfirmModal
        open={confirmState.open}
        title={modalTitle}
        message={modalMessage}
        confirmLabel={isSaveConfirm ? "Yes, Save" : "Yes, Revert"}
        cancelLabel="No"
        type={isSaveConfirm ? "save" : "warning"}
        confirmVariant={isSaveConfirm ? "primary" : "danger"}
        onConfirm={handleConfirmAction}
        onCancel={closeConfirm}
      />
    </>
  );
}