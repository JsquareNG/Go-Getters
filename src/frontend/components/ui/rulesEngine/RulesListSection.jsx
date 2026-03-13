import React, { useEffect, useMemo, useRef, useState } from "react";
import RulesListTable from "./RulesListTable";
import RulesListHeader from "./RulesListHeader";
import RulesListFooterActions from "./RulesListFooterActions";
import ConfirmModal from "./common/ConfirmModal";
import {
  getRiskRulesByCategory,
  saveRiskRuleChanges,
} from "../../../api/riskRuleApi";

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

const NUMERIC_OPERATOR_CODES = new Set(["EQ", "NE", "GT", "GTE", "LT", "LTE"]);

function getFieldMeta(fieldName) {
  return (
    FIELD_OPTIONS.find((item) => item.value === fieldName) || FIELD_OPTIONS[0]
  );
}

function getValueTypeForCondition(condition) {
  const branchType = condition.branchType || "ELSE_IF";
  if (branchType === "ELSE") return "NONE";

  const meta = getFieldMeta(condition.field_name);

  if (meta.kind === "boolean") return "BOOLEAN";
  if (meta.kind === "list") return "LIST";
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

function serializeConditionsForSave(conditions = []) {
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
      field_name: isElse ? null : condition.field_name,
      operator: isElse ? "ELSE" : condition.operator,
      value_type: getValueTypeForCondition(condition),
      numeric_value:
        !isElse &&
        NUMERIC_OPERATOR_CODES.has((condition.operator || "").toUpperCase()) &&
        condition.numeric_value !== ""
          ? Number(condition.numeric_value)
          : null,
      string_value: null,
      boolean_value:
        !isElse && (condition.operator || "").toUpperCase() === "IS_TRUE"
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

function buildSavePayload(serverRows, workingRows) {
  const rules = [];
  const conditions = [];
  const creates = [];
  const new_conditions = [];

  const serverRuleMap = new Map(serverRows.map((rule) => [rule.rule_id, rule]));

  for (const workingRule of workingRows) {
    const serializedWorkingConditions = serializeConditionsForSave(
      workingRule.conditions || []
    );

    if (workingRule.isNew) {
      creates.push({
        rule_code: (workingRule.rule_code || "").trim(),
        rule_name: (workingRule.rule_name || "").trim(),
        category: workingRule.category,
        description: (workingRule.description || "").trim(),
        is_active: workingRule.is_active,
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
          is_active: condition.is_active,
        })),
      });
      continue;
    }

    const serverRule = serverRuleMap.get(workingRule.rule_id);
    if (!serverRule) continue;

    if (!areRulesSame(workingRule, serverRule)) {
      rules.push({
        rule_id: workingRule.rule_id,
        rule_code: workingRule.rule_code,
        rule_name: workingRule.rule_name,
        description: workingRule.description,
        is_active: workingRule.is_active,
      });
    }

    const serializedServerConditions = serializeConditionsForSave(
      serverRule.conditions || []
    );

    const serverConditionMap = new Map(
      serializedServerConditions.map((condition) => [
        condition.condition_id,
        condition,
      ])
    );

    for (const workingCondition of serializedWorkingConditions) {
      if (!workingCondition.condition_id) {
        new_conditions.push({
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
          is_active: workingCondition.is_active,
        });
        continue;
      }

      const serverCondition = serverConditionMap.get(
        workingCondition.condition_id
      );
      if (!serverCondition) continue;

      if (!areSerializedConditionsSame(workingCondition, serverCondition)) {
        conditions.push({
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
          is_active: workingCondition.is_active,
        });
      }
    }
  }

  return { rules, conditions, creates, new_conditions };
}

function validateWorkingRows(workingRows) {
  for (const rule of workingRows) {
    if (!(rule.rule_code || "").trim()) {
      return "Rule code is required.";
    }

    if (!(rule.rule_name || "").trim()) {
      return "Rule name is required.";
    }

    if (!(rule.conditions || []).length) {
      return `Rule ${
        rule.rule_code || rule.rule_name || ""
      } must have at least one condition.`;
    }

    for (const condition of rule.conditions || []) {
      if (condition.branchType !== "ELSE") {
        if (!condition.field_name) {
          return `Each condition must have a field name.`;
        }

        const fieldMeta = getFieldMeta(condition.field_name);

        if (fieldMeta.kind === "number") {
          if (
            !NUMERIC_OPERATOR_CODES.has(
              (condition.operator || "").toUpperCase()
            )
          ) {
            return `Numeric conditions must use a valid comparison operator.`;
          }

          if (
            condition.numeric_value === "" ||
            condition.numeric_value === null
          ) {
            return `Numeric conditions must have a value.`;
          }
        }

        if (fieldMeta.kind === "list") {
          if ((condition.operator || "").toUpperCase() !== "IN_LIST") {
            return `List-based conditions must use IN_LIST.`;
          }

          if (!(condition.list_name || "").trim()) {
            return `List-based conditions must select a config list.`;
          }
        }

        if (fieldMeta.kind === "boolean") {
          if ((condition.operator || "").toUpperCase() !== "IS_TRUE") {
            return `Boolean conditions must use the boolean operator.`;
          }
        }
      }

      if (condition.score === "" || condition.score === null) {
        return `Each condition must have a risk score.`;
      }
    }
  }

  return "";
}

export default function RulesListSection() {
  const [activeCategory, setActiveCategory] = useState("KYC");
  const [serverRows, setServerRows] = useState([]);
  const [workingRows, setWorkingRows] = useState([]);
  const [expandedRuleIds, setExpandedRuleIds] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const bottomRef = useRef(null);

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
    } catch (err) {
      setServerRows([]);
      setWorkingRows([]);
      setExpandedRuleIds({});
      setError(err?.response?.data?.detail || "Failed to load rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(activeCategory);
  }, [activeCategory]);

  const hasChanges = useMemo(() => {
    const payload = buildSavePayload(serverRows, workingRows);
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

      return (a.rule_code || "")
        .toLowerCase()
        .localeCompare((b.rule_code || "").toLowerCase());
    });
  }, [workingRows, committedSortedRows]);

  const handleAddRule = () => {
    const tempId = `new-rule-${Date.now()}-${Math.random()}`;

    setWorkingRows((prev) => [
      ...prev,
      {
        rule_id: null,
        __tempId: tempId,
        rule_code: "",
        rule_name: "",
        category: activeCategory,
        description: "",
        is_active: true,
        created_at: null,
        updated_at: null,
        isNew: true,
        conditions: [],
      },
    ]);

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

    setWorkingRows((prev) =>
      prev.filter((rule) => rule.__tempId !== targetRule.__tempId)
    );

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
    setWorkingRows(deepCloneRules(serverRows));
    setExpandedRuleIds({});
    setSuccess("");
    setError("");
  };

  const performSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = buildSavePayload(serverRows, workingRows);

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
      await fetchRows(activeCategory);
      setSuccess("Changes saved successfully.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const openSaveConfirm = () => {
    setConfirmState({
      open: true,
      action: "save",
    });
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
    if (confirmState.action === "save") {
      closeConfirm();
      await performSave();
      return;
    }

    if (confirmState.action === "reset") {
      performResetLocalChanges();
      closeConfirm();
    }
  };

  const handleSaveButtonClick = () => {
    const validationMessage = validateWorkingRows(workingRows);

    if (validationMessage) {
      setError(validationMessage);
      setSuccess("");
      return;
    }

    if (!hasChanges) return;
    openSaveConfirm();
  };

  const modalTitle =
    confirmState.action === "save"
      ? "Confirm Save Changes"
      : "Confirm Revert Changes";

  const modalMessage =
    confirmState.action === "save"
      ? "Are you sure you want to save these changes? Please double-check before proceeding."
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
        confirmLabel={
          confirmState.action === "save" ? "Yes, Save" : "Yes, Revert"
        }
        cancelLabel="No"
        type={confirmState.action === "save" ? "save" : "warning"}
        confirmVariant={confirmState.action === "reset" ? "danger" : "primary"}
        onConfirm={handleConfirmAction}
        onCancel={closeConfirm}
      />
    </>
  );
}