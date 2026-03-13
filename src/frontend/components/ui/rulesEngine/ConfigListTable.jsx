import React from "react";
import { Trash2 } from "lucide-react";

function Toggle({ checked, onChange, disabled = false, title = "" }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      title={disabled ? title : ""}
      aria-disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-green-600" : "bg-gray-300"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

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
  const isIndustry = itemType === "industry";
  const isThreshold = itemType === "threshold";

  const columnCount = isIndustry ? 4 : 5;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
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
                    {isIndustry ? "Industry" : "Country Name"}
                  </th>

                  {!isIndustry && (
                    <th className="px-4 py-3 font-medium">ISO Country Code</th>
                  )}

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
                  colSpan={isThreshold ? 6 : columnCount}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={isThreshold ? 6 : columnCount}
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
                            <p className="mt-1 break-words whitespace-normal text-xs text-red-600">
                              {rowErrors.item_label}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center align-middle">
                        <span className="text-lg font-semibold text-gray-500">=</span>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div>
                          <input
                            type="number"
                            value={row.item_value}
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
                            <p className="mt-1 break-words whitespace-normal text-xs text-red-600">
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
                        <div className="flex items-center justify-center">
                          <Toggle
                            checked={row.is_active}
                            disabled={toggleDisabled}
                            title={toggleReason}
                            onChange={() => onToggleActive(row)}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {row.isNew ? (
                          <button
                            type="button"
                            onClick={() => onRemoveNewRow(row)}
                            className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50"
                            title="Remove new row"
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

                return (
                  <tr key={rowKey} className={row.isNew ? "bg-blue-50/40" : ""}>
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
                          placeholder={
                            isIndustry ? "Enter Industry" : "Enter Country Name"
                          }
                        />
                        {rowErrors.item_label && (
                          <p className="mt-1 break-words whitespace-normal text-xs text-red-600">
                            {rowErrors.item_label}
                          </p>
                        )}
                      </div>
                    </td>

                    {!isIndustry && (
                      <td className="px-4 py-3 align-top">
                        <div>
                          <input
                            type="text"
                            value={row.item_value}
                            onChange={(e) =>
                              onFieldChange(row, "item_value", e.target.value)
                            }
                            className={`w-full rounded-lg border px-3 py-2 uppercase outline-none focus:border-gray-900 ${
                              rowErrors.item_value
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="e.g. SG, US or JP"
                            maxLength={3}
                          />
                          {rowErrors.item_value && (
                            <p className="mt-1 break-words whitespace-normal text-xs text-red-600">
                              {rowErrors.item_value}
                            </p>
                          )}
                        </div>
                      </td>
                    )}

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
                      <div className="flex items-center justify-center">
                        <Toggle
                          checked={row.is_active}
                          disabled={toggleDisabled}
                          title={toggleReason}
                          onChange={() => onToggleActive(row)}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {row.isNew ? (
                        <button
                          type="button"
                          onClick={() => onRemoveNewRow(row)}
                          className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50"
                          title="Remove new row"
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