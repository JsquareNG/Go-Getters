import React, { useState } from "react";
import ConfigListSection from "../components/ui/rulesEngine/ConfigListSection";
import RulesListSection from "../components/ui/rulesEngine/RulesListSection";

const MAIN_TABS = [
  { key: "rules", label: "Rules Engine" },
  { key: "config-list", label: "Config List" },
  { key: "live-simulation", label: "Live Simulation" },
];

export default function RulesEngineConfiguration() {
  const [activeMainTab, setActiveMainTab] = useState("rules");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Rules Engine Configuration
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage rules and config lists used by the rules engine.
          </p>
        </div>

        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {MAIN_TABS.map((tab) => {
            const active = activeMainTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveMainTab(tab.key)}
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

        {activeMainTab === "rules" && <RulesListSection />}

        {activeMainTab === "config-list" && <ConfigListSection />}

        {activeMainTab === "live-simulation"}
      </div>
    </div>
  );
}