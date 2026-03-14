import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Save, AlertTriangle } from "lucide-react";
import ConfigListTable from "./ConfigListTable";
import {
  getRiskConfigListByListName,
  saveRiskConfigListChanges,
} from "../../../api/riskConfigListApi";

const CONFIG_TABS = [
  {
    key: "HIGH_RISK_COUNTRIES",
    label: "High Risk Countries",
    itemType: "country",
  },
  {
    key: "HIGH_RISK_INDUSTRIES",
    label: "High Risk Industries",
    itemType: "industry",
  },
  {
    key: "FATF_BLACKLIST",
    label: "FATF Blacklist",
    itemType: "country",
  },
  {
    key: "THRESHOLDS",
    label: "Thresholds",
    itemType: "threshold",
  },
];

const COUNTRY_TAB_KEYS = ["HIGH_RISK_COUNTRIES", "FATF_BLACKLIST"];

function normalizeRow(row) {
  return {
    id: row.id ?? null,
    list_name: row.list_name ?? "",
    item_value: row.item_value ?? "",
    item_label: row.item_label ?? "",
    item_type: row.item_type ?? "",
    is_active: Boolean(row.is_active),
    updated_at: row.updated_at ?? null,
    isNew: false,
  };
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  confirmVariant = "dark",
  type = "warning",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 rounded-full p-2 ${
              type === "save"
                ? "bg-blue-100 text-blue-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {type === "save" ? <Save size={18} /> : <AlertTriangle size={18} />}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${
              confirmVariant === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : confirmVariant === "primary"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-900 hover:bg-black"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfigListSection() {
  const [activeTab, setActiveTab] = useState("HIGH_RISK_COUNTRIES");
  const [serverRows, setServerRows] = useState([]);
  const [workingRows, setWorkingRows] = useState([]);
  const [crossTabRows, setCrossTabRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const bottomRef = useRef(null);

  const [confirmState, setConfirmState] = useState({
    open: false,
    action: null,
  });

  const currentTabMeta = useMemo(
    () => CONFIG_TABS.find((tab) => tab.key === activeTab),
    [activeTab]
  );

  const otherCountryTabKey =
    activeTab === "HIGH_RISK_COUNTRIES"
      ? "FATF_BLACKLIST"
      : activeTab === "FATF_BLACKLIST"
      ? "HIGH_RISK_COUNTRIES"
      : null;

  const otherCountryTabLabel =
    activeTab === "HIGH_RISK_COUNTRIES"
      ? "FATF Blacklist"
      : activeTab === "FATF_BLACKLIST"
      ? "High Risk Countries"
      : "";

  const getRowKey = (row) => row.id ?? row.__tempId;
  const normalizeText = (value) => (value || "").trim().toLowerCase();
  const normalizeCode = (value) => (value || "").trim().toUpperCase();

  const fetchRows = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const data = await getRiskConfigListByListName(activeTab);
      const normalized = (data || []).map(normalizeRow);

      setServerRows(normalized);
      setWorkingRows(normalized);
      setValidationErrors({});
    } catch (err) {
      if (err?.response?.status === 404) {
        setServerRows([]);
        setWorkingRows([]);
        setValidationErrors({});
      } else {
        setError(err?.response?.data?.detail || "Failed to load config list.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCrossTabRows = async () => {
    if (!COUNTRY_TAB_KEYS.includes(activeTab)) {
      setCrossTabRows([]);
      return;
    }

    const otherTab =
      activeTab === "HIGH_RISK_COUNTRIES"
        ? "FATF_BLACKLIST"
        : "HIGH_RISK_COUNTRIES";

    try {
      const data = await getRiskConfigListByListName(otherTab);
      const normalized = (data || []).map(normalizeRow);
      setCrossTabRows(normalized);
    } catch (err) {
      if (err?.response?.status === 404) {
        setCrossTabRows([]);
      } else {
        setCrossTabRows([]);
      }
    }
  };

  useEffect(() => {
    fetchRows();
    fetchCrossTabRows();
  }, [activeTab]);

  const hasChanges = useMemo(() => {
    const current = JSON.stringify(
      workingRows.map((r) => ({
        id: r.id,
        list_name: r.list_name,
        item_value: r.item_value,
        item_label: r.item_label,
        item_type: r.item_type,
        is_active: r.is_active,
        isNew: r.isNew,
      }))
    );

    const baseline = JSON.stringify(
      serverRows.map((r) => ({
        id: r.id,
        list_name: r.list_name,
        item_value: r.item_value,
        item_label: r.item_label,
        item_type: r.item_type,
        is_active: r.is_active,
        isNew: false,
      }))
    );

    return current !== baseline;
  }, [workingRows, serverRows]);

  const lastRevised = useMemo(() => {
    if (!serverRows.length) return null;

    const validDates = serverRows
      .map((row) => row.updated_at)
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
    if (currentTabMeta?.itemType === "threshold") {
      return [...serverRows].sort((a, b) => {
        // active first
        if (a.is_active !== b.is_active) {
          return a.is_active ? -1 : 1;
        }

        const aValue = Number(a.item_value ?? 0);
        const bValue = Number(b.item_value ?? 0);

        // then threshold value ascending
        if (aValue !== bValue) {
          return aValue - bValue;
        }

        // fallback: threshold name
        return (a.item_label || "")
          .toLowerCase()
          .localeCompare((b.item_label || "").toLowerCase());
      });
    }

    return [...serverRows].sort((a, b) => {
      // active first
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }

      // then alphabetical
      return (a.item_label || "")
        .toLowerCase()
        .localeCompare((b.item_label || "").toLowerCase());
    });
  }, [serverRows, currentTabMeta]);

  const sortedRows = useMemo(() => {
    if (currentTabMeta?.itemType === "threshold") {
      return [...workingRows].sort((a, b) => {
        // active first
        if (a.is_active !== b.is_active) {
          return a.is_active ? -1 : 1;
        }

        const aValue = Number(a.item_value ?? 0);
        const bValue = Number(b.item_value ?? 0);

        // then threshold value ascending
        if (aValue !== bValue) {
          return aValue - bValue;
        }

        // fallback: threshold name
        return (a.item_label || "")
          .toLowerCase()
          .localeCompare((b.item_label || "").toLowerCase());
      });
    }

    const committedOrderMap = new Map(
      committedSortedRows.map((row, index) => [getRowKey(row), index])
    );

    return [...workingRows].sort((a, b) => {
      const aKey = getRowKey(a);
      const bKey = getRowKey(b);

      const aHasCommittedOrder = committedOrderMap.has(aKey);
      const bHasCommittedOrder = committedOrderMap.has(bKey);

      // Existing rows keep their last committed display order
      if (aHasCommittedOrder && bHasCommittedOrder) {
        return committedOrderMap.get(aKey) - committedOrderMap.get(bKey);
      }

      // Existing rows stay above new rows
      if (aHasCommittedOrder && !bHasCommittedOrder) return -1;
      if (!aHasCommittedOrder && bHasCommittedOrder) return 1;

      // New rows: active first, then alphabetical
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }

      return (a.item_label || "")
        .toLowerCase()
        .localeCompare((b.item_label || "").toLowerCase());
    });
  }, [workingRows, committedSortedRows, currentTabMeta]);

  const isRowActivationBlocked = (targetRow) => {
    if (currentTabMeta?.itemType !== "country") return false;
    if (targetRow.is_active) return false;
    if (!COUNTRY_TAB_KEYS.includes(activeTab)) return false;
    if (!otherCountryTabKey) return false;

    const targetLabel = normalizeText(targetRow.item_label);
    const targetCode = normalizeCode(targetRow.item_value);

    return crossTabRows.some((row) => {
      if (!row.is_active) return false;

      const sameLabel =
        targetLabel && normalizeText(row.item_label) === targetLabel;
      const sameCode =
        targetCode && normalizeCode(row.item_value) === targetCode;

      return sameLabel || sameCode;
    });
  };

  const getRowActivationBlockReason = (targetRow) => {
    if (!isRowActivationBlocked(targetRow)) return "";
    return `Deactivate it in ${otherCountryTabLabel} tab to make this active.`;
  };

  const handleToggleActive = (targetRow) => {
    const tryingToActivate = !targetRow.is_active;

    if (tryingToActivate && isRowActivationBlocked(targetRow)) {
      return;
    }

    setWorkingRows((prev) =>
      prev.map((row) => {
        const isMatch =
          (!row.isNew && row.id === targetRow.id) ||
          (row.isNew && row.__tempId === targetRow.__tempId);

        if (!isMatch) return row;
        return { ...row, is_active: !row.is_active };
      })
    );

    const rowKey = getRowKey(targetRow);
    setValidationErrors((prev) => {
      if (!prev[rowKey]) return prev;
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  };

  const handleFieldChange = (targetRow, field, value) => {
    setWorkingRows((prev) =>
      prev.map((row) => {
        const isMatch =
          (!row.isNew && row.id === targetRow.id) ||
          (row.isNew && row.__tempId === targetRow.__tempId);

        if (!isMatch) return row;

        let nextValue = value;

        if (field === "item_value" && row.item_type === "country") {
          nextValue = value.toUpperCase();
        }

        if (row.item_type === "threshold" && field === "item_value") {
          nextValue = value.replace(/[^\d]/g, "");
        }

        return { ...row, [field]: nextValue };
      })
    );

    const rowKey = getRowKey(targetRow);

    setValidationErrors((prev) => {
      if (!prev[rowKey]) return prev;

      const next = { ...prev };
      const nextRowErrors = { ...next[rowKey] };
      delete nextRowErrors[field];

      if (Object.keys(nextRowErrors).length === 0) {
        delete next[rowKey];
      } else {
        next[rowKey] = nextRowErrors;
      }

      return next;
    });
  };

  const handleAddRow = () => {
    const tempId = `new-${Date.now()}-${Math.random()}`;

    setWorkingRows((prev) => [
      ...prev,
      {
        id: null,
        __tempId: tempId,
        list_name: activeTab,
        item_value: "",
        item_label: "",
        item_type: currentTabMeta.itemType,
        is_active: true,
        updated_at: null,
        isNew: true,
      },
    ]);

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 100);
  };

  const handleRemoveNewRow = (targetRow) => {
    if (!targetRow.isNew) return;

    setWorkingRows((prev) =>
      prev.filter((row) => row.__tempId !== targetRow.__tempId)
    );

    const rowKey = targetRow.__tempId;
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  };

  const validateRows = () => {
    const errors = {};

    workingRows.forEach((row) => {
      const rowKey = getRowKey(row);
      const rowErrors = {};

      if (row.item_type === "threshold") {
        if (!row.item_label?.trim()) {
          rowErrors.item_label = "Threshold name is required.";
        }

        const rawValue = String(row.item_value ?? "").trim();
        const numericValue = Number(rawValue);

        if (!rawValue) {
          rowErrors.item_value = "Threshold value is required.";
        } else if (Number.isNaN(numericValue)) {
          rowErrors.item_value = "Threshold value must be a valid number.";
        } else if (numericValue <= 0) {
          rowErrors.item_value = "Threshold value must be greater than 0.";
        }
      } else {
        if (!row.item_label?.trim()) {
          rowErrors.item_label =
            row.item_type === "industry"
              ? "Industry Name is required."
              : "Country Name is required.";
        }

        if (row.item_type !== "industry" && !row.item_value?.trim()) {
          rowErrors.item_value = "ISO Country Code is required.";
        }
      }

      if (Object.keys(rowErrors).length > 0) {
        errors[rowKey] = rowErrors;
      }
    });

    if (currentTabMeta?.itemType === "industry") {
      const seenIndustryLabels = new Map();

      workingRows.forEach((row) => {
        const labelKey = normalizeText(row.item_label);
        if (!labelKey) return;

        if (!seenIndustryLabels.has(labelKey)) {
          seenIndustryLabels.set(labelKey, []);
        }
        seenIndustryLabels.get(labelKey).push(row);
      });

      for (const [, rows] of seenIndustryLabels.entries()) {
        if (rows.length > 1) {
          rows.forEach((row) => {
            const rowKey = getRowKey(row);
            errors[rowKey] = {
              ...(errors[rowKey] || {}),
              item_label:
                "Industry already exists in this list, remove one to continue.",
            };
          });
        }
      }
    }

    if (currentTabMeta?.itemType === "country") {
      const seenLabels = new Map();
      const seenCodes = new Map();

      workingRows.forEach((row) => {
        const labelKey = normalizeText(row.item_label);
        const codeKey = normalizeCode(row.item_value);

        if (labelKey) {
          if (!seenLabels.has(labelKey)) seenLabels.set(labelKey, []);
          seenLabels.get(labelKey).push(row);
        }

        if (codeKey) {
          if (!seenCodes.has(codeKey)) seenCodes.set(codeKey, []);
          seenCodes.get(codeKey).push(row);
        }
      });

      for (const [, rows] of seenLabels.entries()) {
        if (rows.length > 1) {
          rows.forEach((row) => {
            const rowKey = getRowKey(row);
            errors[rowKey] = {
              ...(errors[rowKey] || {}),
              item_label:
                "Country already exists in this list, remove one to continue.",
            };
          });
        }
      }

      for (const [, rows] of seenCodes.entries()) {
        if (rows.length > 1) {
          rows.forEach((row) => {
            const rowKey = getRowKey(row);
            errors[rowKey] = {
              ...(errors[rowKey] || {}),
              item_value:
                "ISO country code already exists in this list, remove one to continue.",
            };
          });
        }
      }

      const activeCrossTabRows = crossTabRows.filter((row) => row.is_active);

      const crossLabels = new Set(
        activeCrossTabRows
          .map((row) => normalizeText(row.item_label))
          .filter(Boolean)
      );

      const crossCodes = new Set(
        activeCrossTabRows
          .map((row) => normalizeCode(row.item_value))
          .filter(Boolean)
      );

      workingRows.forEach((row) => {
        if (!row.is_active) return;

        const rowKey = getRowKey(row);
        const labelKey = normalizeText(row.item_label);
        const codeKey = normalizeCode(row.item_value);

        const alreadyHasSameTabLabelError = Boolean(errors[rowKey]?.item_label);
        const alreadyHasSameTabCodeError = Boolean(errors[rowKey]?.item_value);

        if (!alreadyHasSameTabLabelError && labelKey && crossLabels.has(labelKey)) {
          errors[rowKey] = {
            ...(errors[rowKey] || {}),
            item_label: `Country already exists as an active record in ${otherCountryTabLabel}, remove/deactivate one to continue.`,
          };
        }

        if (!alreadyHasSameTabCodeError && codeKey && crossCodes.has(codeKey)) {
          errors[rowKey] = {
            ...(errors[rowKey] || {}),
            item_value: `ISO Country Code already exists as an active record in ${otherCountryTabLabel}, remove/deactivate one to continue.`,
          };
        }
      });
    }

    if (currentTabMeta?.itemType === "threshold") {
      const seenThresholdNames = new Map();

      workingRows.forEach((row) => {
        const labelKey = normalizeText(row.item_label);
        if (!labelKey) return;

        if (!seenThresholdNames.has(labelKey)) {
          seenThresholdNames.set(labelKey, []);
        }

        seenThresholdNames.get(labelKey).push(row);
      });

      for (const [, rows] of seenThresholdNames.entries()) {
        if (rows.length > 1) {
          rows.forEach((row) => {
            const rowKey = getRowKey(row);
            errors[rowKey] = {
              ...(errors[rowKey] || {}),
              item_label:
                "Threshold name already exists in this list, remove one to continue.",
            };
          });
        }
      }
    }

    return errors;
  };

  const performSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const updates = [];
      const creates = [];

      for (const row of workingRows) {
        if (row.isNew) {
          creates.push({
            list_name: row.list_name,
            item_value:
              row.item_type === "country"
                ? row.item_value.trim().toUpperCase()
                : row.item_type === "threshold"
                ? row.item_value.trim()
                : row.item_label.trim().toUpperCase(),
            item_label: row.item_label.trim(),
            item_type: row.item_type,
            is_active: row.is_active,
          });
          continue;
        }

        const original = serverRows.find((r) => r.id === row.id);
        if (!original) continue;

        const normalizedLabel = row.item_label.trim();
        const normalizedItemValue =
          row.item_type === "country"
            ? row.item_value.trim().toUpperCase()
            : row.item_type === "threshold"
            ? row.item_value.trim()
            : row.item_label.trim().toUpperCase();

        const changed =
          original.item_value !== normalizedItemValue ||
          original.item_label !== normalizedLabel ||
          original.item_type !== row.item_type ||
          original.is_active !== row.is_active ||
          original.list_name !== row.list_name;

        if (changed) {
          updates.push({
            id: row.id,
            list_name: row.list_name,
            item_value: normalizedItemValue,
            item_label: normalizedLabel,
            item_type: row.item_type,
            is_active: row.is_active,
          });
        }
      }

      const payload = {};
      if (updates.length) payload.updates = updates;
      if (creates.length) payload.creates = creates;

      if (!updates.length && !creates.length) {
        setSuccess("No changes to save.");
        return;
      }

      await saveRiskConfigListChanges(payload);
      await fetchRows();
      await fetchCrossTabRows();
      setSuccess("Changes saved successfully.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const performResetLocalChanges = () => {
    setWorkingRows(serverRows);
    setValidationErrors({});
    setSuccess("");
    setError("");
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
    const errors = validateRows();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSuccess("");
      return;
    }

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

  const descriptionText =
    currentTabMeta?.itemType === "threshold"
      ? "Manage compliance thresholds for this list."
      : "Manage configuration records for this list.";

  const shouldShowAddRow = true

  return (
    <>
      <div className="mb-5 flex gap-2 border-b border-gray-200">
        {CONFIG_TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-t-xl px-4 py-2 text-sm font-medium transition ${
                active
                  ? "border border-b-white border-red-400 bg-white text-red-600"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {currentTabMeta?.label}
          </h2>
          <p className="text-sm text-gray-500">{descriptionText}</p>
          <p className="mt-1 text-xs text-gray-500">
            Last updated: {formattedLastRevised}
          </p>
        </div>

        {shouldShowAddRow && (
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            <Plus size={16} />
            Add Row
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <ConfigListTable
        rows={sortedRows}
        loading={loading}
        itemType={currentTabMeta.itemType}
        validationErrors={validationErrors}
        isToggleDisabled={isRowActivationBlocked}
        getToggleDisabledReason={getRowActivationBlockReason}
        onToggleActive={handleToggleActive}
        onFieldChange={handleFieldChange}
        onRemoveNewRow={handleRemoveNewRow}
        bottomRef={bottomRef}
      />

      <div className="sticky bottom-0 z-20 -mx-6 mt-6 border-t border-gray-200 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3">
          <button
            type="button"
            onClick={openResetConfirm}
            disabled={!hasChanges || saving}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              hasChanges && !saving
                ? "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                : "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
            }`}
          >
            Revert
          </button>

          <button
            type="button"
            onClick={handleSaveButtonClick}
            disabled={!hasChanges || saving}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
              hasChanges && !saving
                ? "bg-gray-900 text-white hover:bg-black"
                : "cursor-not-allowed bg-gray-300 text-gray-500"
            }`}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
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