import React, { useEffect, useState } from "react";
import ConfigListSection from "../components/ui/rulesEngine/ConfigListSection";
import RulesListSection from "../components/ui/rulesEngine/RulesListSection";
import SimulationTestingSection from "../components/ui/rulesEngine/SimulationTestingSection";

const MAIN_TABS = [
  { key: "rules", label: "Rules Engine" },
  { key: "config-list", label: "Config List" },
  { key: "live-simulation", label: "Simulation Testing" },
];

const MAIN_TAB_STORAGE_KEY = "rules-engine-active-main-tab";
const MAIN_TAB_RELOAD_FLAG_KEY = "rules-engine-main-tab-preserve-on-reload";

export default function RulesEngineConfiguration() {
  const [activeMainTab, setActiveMainTab] = useState(() => {
    const savedTab = sessionStorage.getItem(MAIN_TAB_STORAGE_KEY);
    return MAIN_TABS.some((tab) => tab.key === savedTab) ? savedTab : "rules";
  });

  useEffect(() => {
    if (activeMainTab) {
      sessionStorage.setItem(MAIN_TAB_STORAGE_KEY, activeMainTab);
    } else {
      sessionStorage.removeItem(MAIN_TAB_STORAGE_KEY);
    }
  }, [activeMainTab]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem(MAIN_TAB_RELOAD_FLAG_KEY, "1");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    sessionStorage.removeItem(MAIN_TAB_RELOAD_FLAG_KEY);
  }, []);

  useEffect(() => {
    return () => {
      const preserveOnReload =
        sessionStorage.getItem(MAIN_TAB_RELOAD_FLAG_KEY) === "1";

      if (!preserveOnReload) {
        sessionStorage.removeItem(MAIN_TAB_STORAGE_KEY);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-[1500px] rounded-2xl bg-white p-6 shadow-sm">
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
        {activeMainTab === "live-simulation" && <SimulationTestingSection />}
      </div>
    </div>
  );
}