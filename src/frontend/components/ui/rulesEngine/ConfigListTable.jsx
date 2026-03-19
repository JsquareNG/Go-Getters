import React from "react";
import { Trash2 } from "lucide-react";
import Toggle from "./common/Toggle";

export default function ConfigListTable({
  rows,
  loading,
  itemType,
  validationErrors,
  isToggleDisabled,
  getToggleDisabledReason,
  onToggleActive,
  onFieldChange,
  onRemoveNewRow,
  bottomRef,
}) {
  const isThreshold = itemType === "threshold";

  const columnCount = isThreshold ? 6 : 4;

  const getMainColumnLabel = () => {
    if (itemType === "country") return "Country Name";
    if (itemType === "industry") return "Industry";
    if (itemType === "entity_type") return "Entity Type";
    return "Value";
  };

  const getMainPlaceholder = () => {
    if (itemType === "country") return "Enter Country Name";
    if (itemType === "industry") return "Enter Industry";
    if (itemType === "entity_type") return "Enter Entity Type";
    return "Enter Value";
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="max-h-[820px] overflow-x-auto overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-700">
            <tr>
              {isThreshold ? (
                <>
                  <th className="px-4 py-3 font-medium">Threshold Name</th>
                  <th className="px-4 py-3 font-medium text-center"> </th>
                  <th className="px-4 py-3 font-medium">Threshold Value</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Active</th>
                  <th className="px-4 py-3 font-medium text-center">Action</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 font-medium">
                    {getMainColumnLabel()}
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Active</th>
                  <th className="px-4 py-3 font-medium text-center">Action</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowKey = row.id ?? row.__tempId;
                const rowErrors = validationErrors?.[rowKey] || {};

                const toggleDisabled =
                  typeof isToggleDisabled === "function"
                    ? isToggleDisabled(row)
                    : false;

                const toggleReason =
                  typeof getToggleDisabledReason === "function"
                    ? getToggleDisabledReason(row)
                    : "";

                // =====================
                // THRESHOLD ROW
                // =====================
                if (isThreshold) {
                  return (
                    <tr
                      key={rowKey}
                      className={row.isNew ? "bg-blue-50/40" : ""}
                    >
                      <td className="px-4 py-3 align-top">
                        <div>
                          <input
                            type="text"
                            value={row.item_label}
                            onChange={(e) =>
                              onFieldChange(row, "item_label", e.target.value)
                            }
                            className={`w-full rounded-lg border px-3 py-2 outline-none focus:border-gray-900 ${
                              rowErrors.item_label
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="Enter Threshold Name"
                          />

                          {rowErrors.item_label && (
                            <p className="mt-1 text-xs text-red-600">
                              {rowErrors.item_label}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center align-middle">
                        <span className="text-lg font-semibold text-gray-500">
                          =
                        </span>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div>
                          <input
                            type="number"
                            value={row.item_value ?? ""}
                            onChange={(e) =>
                              onFieldChange(row, "item_value", e.target.value)
                            }
                            className={`w-full rounded-lg border px-3 py-2 outline-none focus:border-gray-900 ${
                              rowErrors.item_value
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="e.g. 30"
                            min="1"
                          />
                          {rowErrors.item_value && (
                            <p className="mt-1 text-xs text-red-600">
                              {rowErrors.item_value}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            row.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {row.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <Toggle
                          checked={row.is_active}
                          disabled={toggleDisabled}
                          title={toggleReason}
                          onChange={() => onToggleActive(row)}
                        />
                      </td>

                      <td className="px-4 py-3 text-center">
                        {row.isNew ? (
                          <button
                            type="button"
                            onClick={() => onRemoveNewRow(row)}
                            className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                }

                // =====================
                // ALL OTHER TABS (NO "=")
                // =====================
                return (
                  <tr
                    key={rowKey}
                    className={row.isNew ? "bg-blue-50/40" : ""}
                  >
                    <td className="px-4 py-3 align-top">
                      <div>
                        <input
                          type="text"
                          value={row.item_label}
                          onChange={(e) =>
                            onFieldChange(row, "item_label", e.target.value)
                          }
                          className={`w-full rounded-lg border px-3 py-2 outline-none focus:border-gray-900 ${
                            rowErrors.item_label
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder={getMainPlaceholder()}
                        />
                        {rowErrors.item_label && (
                          <p className="mt-1 text-xs text-red-600">
                            {rowErrors.item_label}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          row.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <Toggle
                        checked={row.is_active}
                        disabled={toggleDisabled}
                        title={toggleReason}
                        onChange={() => onToggleActive(row)}
                      />
                    </td>

                    <td className="px-4 py-3 text-center">
                      {row.isNew ? (
                        <button
                          type="button"
                          onClick={() => onRemoveNewRow(row)}
                          className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
            <tr ref={bottomRef} />
          </tbody>
        </table>
      </div>
    </div>
  );
}