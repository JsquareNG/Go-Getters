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
  const rows = getRowsFromStorage(formData, storageKey);

  const min = sectionConfig.min ?? 0;
  const max = sectionConfig.max ?? Infinity;

  useEffect(() => {
    if (rows.length >= min) return;

    const missingCount = min - rows.length;
    const additionalRows = Array.from({ length: missingCount }, () =>
      buildEmptyRow(sectionConfig.fields),
    );

    onFormDataChange({
      ...formData,
      [storageKey]: [...rows, ...additionalRows],
    });
  }, [rows, min, sectionConfig.fields, storageKey, formData, onFormDataChange]);

  const handleAddRow = () => {
    const newRow = buildEmptyRow(sectionConfig.fields);
    onFormDataChange({
      ...formData,
      [storageKey]: [...rows, newRow],
    });
  };

  const handleRemoveRow = (rowIndex) => {
    onFormDataChange({
      ...formData,
      [storageKey]: rows.filter((_, i) => i !== rowIndex),
    });
  };

  const handleRowFieldChange = (rowIndex, fieldName, value) => {
    const updatedRows = updateRowField(rows, rowIndex, fieldName, value);
    onFormDataChange({
      ...formData,
      [storageKey]: updatedRows,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{sectionConfig.label}</h3>

        {rows.length < max && (
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

      {rows.map((row, rowIndex) => (
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
                    //   context={context}
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
                  // context={context}
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
      ))}
    </div>
  );
};

export default RepeatableSectionRenderer;
