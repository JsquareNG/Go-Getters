import React from "react";
import FieldRenderer from "./FieldRenderer";

/**
 * Handles conditional fields
 * includes additional fields that will appear when a certain field meets specific requirements
 */
const ConditionalFieldsRenderer = ({
  fieldKey,
  fieldConfig,
  value,
  rowData = {},
  onChange,
  disabled = false,
  context = {},
}) => {
  const selectedValue = value;
  const nestedFields =
    fieldConfig?.conditionalFields?.[selectedValue] || null;

  return (
    <div className="space-y-3">
      <FieldRenderer
        fieldKey={fieldKey}
        fieldConfig={fieldConfig}
        value={value}
        onChange={onChange}
        disabled={disabled}
        context={context}
      />

      {nestedFields && (
        <div className="ml-4 border-l pl-4 space-y-3">
          {Object.entries(nestedFields).map(([nestedKey, nestedConfig]) => (
            <FieldRenderer
              key={nestedKey}
              fieldKey={nestedKey}
              fieldConfig={nestedConfig}
              value={rowData?.[nestedKey] ?? ""}
              onChange={onChange}
              disabled={disabled}
              context={context}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ConditionalFieldsRenderer;