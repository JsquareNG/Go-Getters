import React from "react";

const MissingSteps = ({ report }) => {
  if (!report || report.total === 0) return null;

  const allSteps = report.byStep || [];

  return (
    <div className="mt-8">
      <h2 className="font-semibold text-lg mb-2">
        Some required fields are missing
      </h2>
      <p className="text-sm text-red-500 mb-3">
        Please complete the following before submitting.
      </p>

      <div className="space-y-3 overflow-y-auto max-h-120 pr-2 pb-7">
        {allSteps
          .map((step, index) => ({ step, index }))
          .filter(({step}) => step.missing.length > 0)
          .map(({step, index}) => {
            const prevStep = allSteps[index - 1];
            // console.log("STEP", index);
            return (
              <div
                key={step.stepId}
                className="rounded-md border border-red-200 bg-red-50 p-3"
              >
                <p className="font-medium text-red-800 mb-1">
                  {prevStep?.stepLabel || step.stepLabel}
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {step.missing.map((item, idx) => (
                    <li key={`${step.stepId}-${idx}`}>{item.label}</li>
                  ))}
                </ul>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default MissingSteps;
