import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Save } from "lucide-react";
import ConfigListTable from "./ConfigListTable";
import {
  getRiskConfigListByListName,
  saveRiskConfigListChanges,
  getAllRiskConfigListNames,
} from "../../../api/riskConfigListApi";
import ConfirmModal from "./common/ConfirmModal";

const COUNTRY_TAB_KEYS = ["HIGH_RISK_COUNTRIES", "FATF_BLACKLIST"];
const CONFIG_TAB_STORAGE_KEY = "rules-engine-config-active-tab";
const CONFIG_RELOAD_FLAG_KEY = "rules-engine-config-preserve-on-reload";

function normalizeRow(row) {
  return {
    id: row.id ?? null,
    __tempId: row.__tempId ?? null,
    __clientOrder: null,
    list_name: row.list_name ?? "",
    item_value: row.item_value ?? null,
    item_label: row.item_label ?? "",
    item_type: row.item_type ?? "",
    is_active: Boolean(row.is_active),
    updated_at: row.updated_at ?? null,
    isNew: false,
  };
}

function formatConfigTabLabel(name) {
  if (!name) return "";

  const specialWords = {
    FATF: "FATF",
    SG: "Singapore",
  };

  return name
    .split("_")
    .map(
      (part) =>
        specialWords[part] || part.charAt(0) + part.slice(1).toLowerCase()
    )
    .join(" ");
}

function getItemTypeFromListName(name) {
  if (name === "THRESHOLDS") return "threshold";
  if (name.includes("COUNTRIES") || name.includes("BLACKLIST")) return "country";
  if (name.includes("INDUSTRIES")) return "industry";
  if (name.includes("ENTITY_TYPES")) return "entity_type";

  return "industry";
}

export default function ConfigListSection() {
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem(CONFIG_TAB_STORAGE_KEY) || "";
  });
  const [serverRows, setServerRows] = useState([]);
  const [workingRows, setWorkingRows] = useState([]);
  const [crossTabRows, setCrossTabRows] = useState([]);
  const [removedRowIds, setRemovedRowIds] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [configTabs, setConfigTabs] = useState([]);
  const [baseVersion, setBaseVersion] = useState(null);
  const bottomRef = useRef(null);

  const [confirmState, setConfirmState] = useState({
    open: false,
    action: null,
  });

  useEffect(() => {
    const fetchConfigTabs = async () => {
      try {
        const names = await getAllRiskConfigListNames();

        const tabs = (names || [])
          .map((name) => ({
            key: name,
            label: formatConfigTabLabel(name),
            itemType: getItemTypeFromListName(name),
          }))
          .sort((a, b) => {
            if (a.key === "THRESHOLDS") return -1;
            if (b.key === "THRESHOLDS") return 1;
            return a.label.localeCompare(b.label);
          });

        setConfigTabs(tabs);

        if (tabs.length) {
          const savedTab = sessionStorage.getItem(CONFIG_TAB_STORAGE_KEY);
          const isSavedTabValid = tabs.some((tab) => tab.key === savedTab);

          if (isSavedTabValid) {
            setActiveTab(savedTab);
          } else if (!activeTab || !tabs.some((tab) => tab.key === activeTab)) {
            setActiveTab(tabs[0].key);
          }
        }
      } catch (err) {
        console.error("Failed to load config tabs", err);
        setConfigTabs([]);
      }
    };

    fetchConfigTabs();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab) {
      sessionStorage.setItem(CONFIG_TAB_STORAGE_KEY, activeTab);
    } else {
      sessionStorage.removeItem(CONFIG_TAB_STORAGE_KEY);
    }
  }, [activeTab]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem(CONFIG_RELOAD_FLAG_KEY, "1");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    sessionStorage.removeItem(CONFIG_RELOAD_FLAG_KEY);
  }, []);

  useEffect(() => {
    return () => {
      const preserveOnReload =
        sessionStorage.getItem(CONFIG_RELOAD_FLAG_KEY) === "1";

      if (!preserveOnReload) {
        sessionStorage.removeItem(CONFIG_TAB_STORAGE_KEY);
      }
    };
  }, []);

  const currentTabMeta = useMemo(
    () => configTabs.find((tab) => tab.key === activeTab),
    [configTabs, activeTab]
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

  const fetchRows = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await getRiskConfigListByListName(activeTab);
      const normalized = (response?.rows || []).map(normalizeRow);

      setServerRows(normalized);
      setWorkingRows(normalized);
      setRemovedRowIds([]);
      setBaseVersion(response?.version ?? 1);
      setValidationErrors({});
    } catch (err) {
      if (err?.response?.status === 404) {
        setServerRows([]);
        setWorkingRows([]);
        setRemovedRowIds([]);
        setValidationErrors({});
        setBaseVersion(null);
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
      const response = await getRiskConfigListByListName(otherTab);
      const normalized = (response?.rows || []).map(normalizeRow);
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
    if (!activeTab) return;

    fetchRows();
    fetchCrossTabRows();
  }, [activeTab]);

  const hasChanges = useMemo(() => {
    const current = JSON.stringify(
      workingRows.map((r) => ({
        id: r.id,
        list_name: r.list_name,
        item_value: r.item_type === "threshold" ? r.item_value : null,
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
        item_value: r.item_type === "threshold" ? r.item_value : null,
        item_label: r.item_label,
        item_type: r.item_type,
        is_active: r.is_active,
        isNew: false,
      }))
    );

    return current !== baseline || removedRowIds.length > 0;
  }, [workingRows, serverRows, removedRowIds]);

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
        if (a.is_active !== b.is_active) {
          return a.is_active ? -1 : 1;
        }

        const aValue = Number(a.item_value ?? 0);
        const bValue = Number(b.item_value ?? 0);

        if (aValue !== bValue) {
          return aValue - bValue;
        }

        return (a.item_label || "")
          .toLowerCase()
          .localeCompare((b.item_label || "").toLowerCase());
      });
    }

    return [...serverRows].sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }

      return (a.item_label || "")
        .toLowerCase()
        .localeCompare((b.item_label || "").toLowerCase());
    });
  }, [serverRows, currentTabMeta]);

  const sortedRows = useMemo(() => {
    const committedOrderMap = new Map(
      committedSortedRows.map((row, index) => [getRowKey(row), index])
    );

    return [...workingRows].sort((a, b) => {
      const aKey = getRowKey(a);
      const bKey = getRowKey(b);

      const aHasCommittedOrder = committedOrderMap.has(aKey);
      const bHasCommittedOrder = committedOrderMap.has(bKey);

      if (aHasCommittedOrder && bHasCommittedOrder) {
        return committedOrderMap.get(aKey) - committedOrderMap.get(bKey);
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

      if (currentTabMeta?.itemType === "threshold") {
        const aValue = Number(a.item_value ?? 0);
        const bValue = Number(b.item_value ?? 0);

        if (aValue !== bValue) {
          return aValue - bValue;
        }
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

    return crossTabRows.some((row) => {
      if (!row.is_active) return false;
      return targetLabel && normalizeText(row.item_label) === targetLabel;
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
    const clientOrder = Date.now() + Math.random();
    const itemType = currentTabMeta?.itemType || "industry";

    setWorkingRows((prev) => [
      ...prev,
      {
        id: null,
        __tempId: tempId,
        __clientOrder: clientOrder,
        list_name: activeTab,
        item_value: itemType === "threshold" ? "" : null,
        item_label: "",
        item_type: itemType,
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

  const handleRemoveRow = (targetRow) => {
    const rowKey = getRowKey(targetRow);

    if (!targetRow.isNew && targetRow.id) {
      setRemovedRowIds((prev) =>
        prev.includes(targetRow.id) ? prev : [...prev, targetRow.id]
      );
    }

    setWorkingRows((prev) =>
      prev.filter((row) => getRowKey(row) !== rowKey)
    );

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
          rowErrors.item_label = "Value is required.";
        }
      }

      if (Object.keys(rowErrors).length > 0) {
        errors[rowKey] = rowErrors;
      }
    });

    if (currentTabMeta?.itemType !== "threshold") {
      const seenLabels = new Map();

      workingRows.forEach((row) => {
        const labelKey = normalizeText(row.item_label);
        if (!labelKey) return;

        if (!seenLabels.has(labelKey)) {
          seenLabels.set(labelKey, []);
        }

        seenLabels.get(labelKey).push(row);
      });

      for (const [, rows] of seenLabels.entries()) {
        if (rows.length > 1) {
          rows.forEach((row) => {
            const rowKey = getRowKey(row);
            errors[rowKey] = {
              ...(errors[rowKey] || {}),
              item_label:
                "Value already exists in this list, remove one to continue.",
            };
          });
        }
      }
    }

    if (currentTabMeta?.itemType === "country") {
      const activeCrossTabRows = crossTabRows.filter((row) => row.is_active);

      const crossLabels = new Set(
        activeCrossTabRows
          .map((row) => normalizeText(row.item_label))
          .filter(Boolean)
      );

      workingRows.forEach((row) => {
        if (!row.is_active) return;

        const rowKey = getRowKey(row);
        const labelKey = normalizeText(row.item_label);
        const alreadyHasSameTabLabelError = Boolean(errors[rowKey]?.item_label);

        if (!alreadyHasSameTabLabelError && labelKey && crossLabels.has(labelKey)) {
          errors[rowKey] = {
            ...(errors[rowKey] || {}),
            item_label: `Country already exists as an active record in ${otherCountryTabLabel}, remove/deactivate one to continue.`,
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
      const deletes = [...removedRowIds];

      for (const row of workingRows) {
        if (row.isNew) {
          creates.push({
            list_name: row.list_name,
            item_value:
              row.item_type === "threshold" ? row.item_value?.trim() || "" : null,
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
          row.item_type === "threshold" ? row.item_value?.trim() || "" : null;

        const originalComparableValue =
          original.item_type === "threshold" ? original.item_value ?? "" : null;

        const changed =
          originalComparableValue !== normalizedItemValue ||
          (original.item_label ?? "") !== normalizedLabel ||
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

      const payload = {
        list_name: activeTab,
        base_version: baseVersion,
      };

      if (updates.length) payload.updates = updates;
      if (creates.length) payload.creates = creates;
      if (deletes.length) payload.deletes = deletes;

      if (!updates.length && !creates.length && !deletes.length) {
        setSuccess("No changes to save.");
        return;
      }

      await saveRiskConfigListChanges(payload);
      await fetchRows();
      await fetchCrossTabRows();
      setSuccess("Changes saved successfully.");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      if (err?.response?.status === 409) {
        setError(
          "This config list was updated by another user. Please refresh and try again."
        );
        setSuccess("");
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
        return;
      }

      setError(err?.response?.data?.detail || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const performResetLocalChanges = () => {
    setWorkingRows(serverRows);
    setRemovedRowIds([]);
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
      setError("Please resolve the validation errors before saving.");
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

  const shouldShowAddRow = currentTabMeta?.itemType !== "threshold";

  return (
    <>
      <div className="mb-5 flex gap-2 border-b border-gray-200">
        {configTabs.map((tab) => {
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
        itemType={currentTabMeta?.itemType || "industry"}
        validationErrors={validationErrors}
        isToggleDisabled={isRowActivationBlocked}
        getToggleDisabledReason={getRowActivationBlockReason}
        onToggleActive={handleToggleActive}
        onFieldChange={handleFieldChange}
        onRemoveRow={handleRemoveRow}
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