import React, { useEffect } from "react";
import { Button } from "@/components/ui";
import FieldRenderer from "./FieldRenderer";
import ConditionalFieldsRenderer from "./ConditionalFieldsRenderer";
import {
  buildEmptyRow,
  getRowsFromStorage,
  updateRowField,
} from "./formEngineUtils";

/**
 * Handles repeatable fields
 * includes button for users to add more entries accordingly
 */
const RepeatableSectionRenderer = ({
  sectionKey,
  sectionConfig,
  formData,
  onFormDataChange,
  disabled = false,
  context = {},
}) => {
  const storageKey = sectionConfig.storage || sectionKey;
  //   const rows = getRowsFromStorage(formData, storageKey);
  const allRows = getRowsFromStorage(formData, storageKey);
  const rowTypeField = sectionConfig.rowTypeField;
  const rowTypeValue = sectionConfig.rowTypeValue;

  const belongsToSection = (row) => {
    if (!rowTypeField || !rowTypeValue) return true;
    return row?.[rowTypeField] === rowTypeValue;
  };

  const sectionRowIndexes = allRows.reduce((acc, row, index) => {
    if (belongsToSection(row)) acc.push(index);
    return acc;
  }, []);

  //   const sectionRows = sectionRowIndexes.map((i) => allRows[i]);
  const sectionRows = sectionRowIndexes.map((i) => allRows[i]).filter(Boolean);

  const min = sectionConfig.min ?? 0;
  const max = sectionConfig.max ?? Infinity;

  useEffect(() => {
    if (sectionRows.length >= min) return;

    const missingCount = min - sectionRows.length;
    const additionalRows = Array.from({ length: missingCount }, () => {
      const row = buildEmptyRow(sectionConfig.fields);

      if (rowTypeField && rowTypeValue) {
        row[rowTypeField] = rowTypeValue;
      }

      return row;
    });

    onFormDataChange({
      ...formData,
      [storageKey]: [...allRows, ...additionalRows],
    });
  }, [sectionRows.length, min]);

  const handleAddRow = () => {
    const newRow = buildEmptyRow(sectionConfig.fields);

    if (rowTypeField && rowTypeValue) {
      newRow[rowTypeField] = rowTypeValue;
    }

    onFormDataChange({
      ...formData,
      [storageKey]: [...allRows, newRow],
    });
  };

  const handleRemoveRow = (sectionRowIndex) => {
    const actualIndex = sectionRowIndexes[sectionRowIndex];

    onFormDataChange({
      ...formData,
      [storageKey]: allRows.filter((_, i) => i !== actualIndex),
    });
  };

  const handleRowFieldChange = (sectionRowIndex, fieldName, value) => {
    // const updatedRows = updateRowField(rows, rowIndex, fieldName, value);
    const actualIndex = sectionRowIndexes[sectionRowIndex];
    const updatedRows = updateRowField(allRows, actualIndex, fieldName, value);

    onFormDataChange({
      ...formData,
      [storageKey]: updatedRows,
    });
    console.log("ROW CHANGE", { sectionRowIndex, fieldName, value });
  };

  return (
    <div className="space-y-4 mt-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{sectionConfig.label}</h3>

        {sectionRows.length < max && (
          <Button
            type="button"
            variant="outline"
            onClick={handleAddRow}
            disabled={disabled}
          >
            Add {sectionConfig.label}
          </Button>
        )}
      </div>

      {sectionRows.map((row, rowIndex) => {
        // give each repeatable row its own unique prefix for field keys and context
        const rowContext = {
          ...context,
          rowData: row,
          rowPrefix: `${storageKey}.${sectionRowIndexes[rowIndex]}`,
        };

        return (
          <div
            key={`${sectionKey}-${rowIndex}`}
            className="rounded-xl border p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {sectionConfig.label} #{rowIndex + 1}
              </p>

              {sectionRows.length > min && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleRemoveRow(rowIndex)}
                  disabled={disabled}
                >
                  Remove
                </Button>
              )}
            </div>

            {Object.entries(sectionConfig.fields).map(
              ([fieldKey, fieldConfig]) => {
                const value = row?.[fieldKey] ?? fieldConfig?.value ?? "";

                if (fieldConfig?.conditionalFields) {
                  return (
                    <ConditionalFieldsRenderer
                      key={fieldKey}
                      fieldKey={fieldKey}
                      fieldConfig={fieldConfig}
                      value={value}
                      rowData={row}
                      onChange={(name, nextValue) =>
                        handleRowFieldChange(rowIndex, name, nextValue)
                      }
                      disabled={disabled}
                      context={rowContext}
                    />
                  );
                }

                return (
                  <FieldRenderer
                    key={fieldKey}
                    fieldKey={fieldKey}
                    fieldConfig={fieldConfig}
                    value={value}
                    onChange={(name, nextValue) =>
                      handleRowFieldChange(rowIndex, name, nextValue)
                    }
                    disabled={disabled}
                    context={rowContext}
                  />
                );
              },
            )}
          </div>
        );
      })}

      {/* {rows.map((row, rowIndex) => (
        <div
          key={`${sectionKey}-${rowIndex}`}
          className="rounded-xl border p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="font-medium">
              {sectionConfig.label} #{rowIndex + 1}
            </p>

            {rows.length > min && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleRemoveRow(rowIndex)}
                disabled={disabled}
              >
                Remove
              </Button>
            )}
          </div>

          {Object.entries(sectionConfig.fields).map(
            ([fieldKey, fieldConfig]) => {
              const value = row?.[fieldKey] ?? fieldConfig?.value ?? "";

              if (fieldConfig?.conditionalFields) {
                return (
                  <ConditionalFieldsRenderer
                    key={fieldKey}
                    fieldKey={fieldKey}
                    fieldConfig={fieldConfig}
                    value={value}
                    rowData={row}
                    onChange={(name, nextValue) =>
                      handleRowFieldChange(rowIndex, name, nextValue)
                    }
                    disabled={disabled}
                    // context={rowContext}
                    context={{
                      ...context,
                      rowData: row,
                      rowPrefix: `${storageKey}.${rowIndex}`,
                    }}
                  />
                );
              }

              return (
                <FieldRenderer
                  key={fieldKey}
                  fieldKey={fieldKey}
                  fieldConfig={fieldConfig}
                  value={value}
                  onChange={(name, nextValue) =>
                    handleRowFieldChange(rowIndex, name, nextValue)
                  }
                  disabled={disabled}
                //   context={rowContext}
                    context={{
                      ...context,
                      rowData: row,
                      rowPrefix: `${storageKey}.${rowIndex}`,
                    }}
                />
              );
            },
          )}
        </div>
      ))} */}
    </div>
  );
};

export default RepeatableSectionRenderer;
