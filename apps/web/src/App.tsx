import React, { useEffect, useState, useRef } from "react";
import { Sidebar, TabId } from "./components/layout/Sidebar.js";
import { TopHeader } from "./components/layout/TopHeader.js";
import { DashboardView } from "./views/DashboardView.js";
import { TestEditorView } from "./views/TestEditorView.js";
import { RunExplorerView } from "./views/RunExplorerView.js";
import { MutationLabView } from "./views/MutationLabView.js";
import { DemoAppView } from "./views/DemoAppView.js";
import { SettingsView } from "./views/SettingsView.js";
import { CustomTestBuilder } from "./views/CustomTestBuilder.js";
import {
  clearAllRuns,
  commitHeal,
  createRun,
  fetchBenchmark,
  fetchMutations,
  fetchRunDetail,
  fetchRuns,
  fetchSettings,
  fetchTestDetail,
  fetchTests,
  resetMutation,
  subscribeToEvents,
  SystemSettings
} from "./api.js";
import { BenchmarkMetrics, MutationScenario, RunDetail, TestRun } from "./types.js";
import { LiveExecutionOverlay, LiveEventItem } from "./components/shared/LiveExecutionOverlay.js";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const [tests, setTests] = useState<any[]>([]);
  const [activeTestId, setActiveTestId] = useState<string>("checkout-valid-card");
  const [activeContract, setActiveContract] = useState<any>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [mutations, setMutations] = useState<MutationScenario[]>([]);
  const [benchmark, setBenchmark] = useState<BenchmarkMetrics | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);

  // Live real-time execution overlay state
  const [liveEvents, setLiveEvents] = useState<LiveEventItem[]>([]);
  const [liveStatus, setLiveStatus] = useState<string>("QUEUED");
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState<boolean>(false);
  const [activeRunningScenario, setActiveRunningScenario] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  const activeUnsubRef = useRef<(() => void) | null>(null);

  // Load workbench metadata
  const loadData = async () => {
    try {
      const [testsList, runsData, benchData, mutsData, settingsData] = await Promise.all([
        fetchTests().catch(() => []),
        fetchRuns().catch(() => []),
        fetchBenchmark().catch(() => null),
        fetchMutations().catch(() => []),
        fetchSettings().catch(() => null)
      ]);
      setTests(testsList || []);
      const loadedRuns = runsData || [];
      setRuns(loadedRuns);
      setBenchmark(benchData);
      setMutations(mutsData || []);
      if (settingsData) {
        setSystemSettings(settingsData);
      }

      // If selected run is not set or invalid, select newest real run
      if (loadedRuns.length > 0) {
        setSelectedRunId(prev => (prev && loadedRuns.some(r => r.id === prev) ? prev : loadedRuns[0].id));
        const latest = loadedRuns[0];
        if (["PASSED", "FAILED", "HEALED", "REVIEW_REQUIRED"].includes(latest.status)) {
          if (!activeUnsubRef.current) {
            setIsRunningTest(false);
          }
        }
      }

      const currentId = activeTestId || (testsList && testsList.length > 0 ? testsList[0].id : "checkout-valid-card");
      if (currentId) {
        const specData = await fetchTestDetail(currentId).catch(() => null);
        if (specData?.contract) {
          setActiveContract(specData.contract);
        }
      }
    } catch (err: any) {
      console.error("Failed to load workbench data:", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  // When activeTestId changes, fetch contract spec
  useEffect(() => {
    if (activeTestId) {
      fetchTestDetail(activeTestId)
        .then((spec) => {
          if (spec?.contract) {
            setActiveContract(spec.contract);
          }
        })
        .catch(console.error);
    }
  }, [activeTestId]);

  // Load detailed run data
  const loadRunDetail = async (id: string) => {
    try {
      const detail = await fetchRunDetail(id);
      setRunDetail(detail);
    } catch (err) {
      console.error("Failed to load run detail:", err);
    }
  };

  useEffect(() => {
    if (selectedRunId) {
      loadRunDetail(selectedRunId);
    } else {
      setRunDetail(null);
    }
  }, [selectedRunId]);

  useEffect(() => {
    const terminalStatuses = new Set(["PASSED", "HEALED", "FAILED", "REVIEW_REQUIRED"]);
    if (
      !selectedRunId ||
      runDetail?.run.id !== selectedRunId ||
      terminalStatuses.has(runDetail.run.status)
    ) {
      return;
    }
    const interval = setInterval(() => loadRunDetail(selectedRunId), 1500);
    return () => clearInterval(interval);
  }, [selectedRunId, runDetail?.run.id, runDetail?.run.status]);

  // Handle Tab selection from Sidebar
  const handleSelectTab = (tab: TabId) => {
    setActiveTab(tab);
  };

  // Run execution with real-time SSE stream
  const handleRunTest = async (targetTestId = activeTestId, mutationScenarioId?: string | null) => {
    if (activeUnsubRef.current) {
      activeUnsubRef.current();
      activeUnsubRef.current = null;
    }

    setIsRunningTest(true);
    setLiveEvents([]);
    setLiveStatus("INITIALIZING");
    setIsExecutionModalOpen(true);
    setActiveRunningScenario(mutationScenarioId || null);

    // Sync active contract so LiveExecutionOverlay has accurate step pipeline
    fetchTestDetail(targetTestId).then(spec => {
      if (spec?.contract) {
        setActiveContract(spec.contract);
      }
    }).catch(console.error);

    try {
      const { runId } = await createRun(targetTestId, mutationScenarioId);
      setSelectedRunId(runId);
      setLiveStatus("RUNNING");

      // Subscribe to live SSE events with completion handling
      const unsubscribe = subscribeToEvents(runId, (event: any) => {
        if (event) {
          setLiveEvents(prev => [
            ...prev,
            {
              id: event.id || `evt_${Date.now()}_${Math.random()}`,
              type: event.type,
              timestamp: event.timestamp || new Date().toISOString(),
              payload: event.payload
            }
          ]);

          if (event.type === "RUN_FINISHED") {
            setLiveStatus(event.payload?.status || "PASSED");
          } else if (event.type === "RUN_FAILED") {
            setLiveStatus("FAILED");
          } else if (event.type === "REVIEW_REQUIRED") {
            setLiveStatus("REVIEW_REQUIRED");
          } else if (event.type === "FAILURE_CLASSIFIED") {
            setLiveStatus("DIAGNOSING");
          } else if (event.type === "RECOVERY_STARTED") {
            setLiveStatus("RECOVERING");
          } else if (event.type === "REPLAY_STARTED") {
            setLiveStatus("REPLAYING");
          } else if (event.type === "VERIFICATION_STARTED") {
            setLiveStatus("VERIFYING");
          }
        }

        loadRunDetail(runId);
        loadData();

        // Terminal event detection: gracefully finish
        if (event && ["RUN_FINISHED", "RUN_FAILED", "REVIEW_REQUIRED"].includes(event.type)) {
          setTimeout(() => {
            loadRunDetail(runId);
            loadData();
            setIsRunningTest(false);
            if (activeUnsubRef.current) {
              activeUnsubRef.current();
              activeUnsubRef.current = null;
            }
          }, 800);
        }
      });

      activeUnsubRef.current = unsubscribe;

      // Fallback safety timeout (45s)
      setTimeout(async () => {
        await loadRunDetail(runId);
        await loadData();
        setIsRunningTest(false);
        if (activeUnsubRef.current) {
          activeUnsubRef.current();
          activeUnsubRef.current = null;
        }
      }, 45000);

    } catch (err) {
      console.error("Error executing test run:", err);
      setIsRunningTest(false);
      setLiveStatus("FAILED");
    }
  };

  const handleRunMutation = async (scenarioId: string) => {
    await handleRunTest(activeTestId, scenarioId);
  };

  const handleCustomRunCreated = async (runId: string, testId: string, customContract?: any) => {
    setActiveTestId(testId);
    setSelectedRunId(runId);
    setIsRunningTest(true);
    setLiveEvents([]);
    setLiveStatus("RUNNING");
    if (customContract) {
      setActiveContract(customContract);
    }
    setIsExecutionModalOpen(true);
    setActiveRunningScenario(null);

    // Immediately fetch contract so LiveExecutionOverlay has all custom steps
    fetchTestDetail(testId).then(spec => {
      if (spec?.contract) {
        setActiveContract(spec.contract);
      }
    }).catch(console.error);

    if (activeUnsubRef.current) {
      activeUnsubRef.current();
      activeUnsubRef.current = null;
    }

    const unsubscribe = subscribeToEvents(runId, (event: any) => {
      if (event) {
        setLiveEvents(prev => [
          ...prev,
          {
            id: event.id || `evt_${Date.now()}_${Math.random()}`,
            type: event.type,
            timestamp: event.timestamp || new Date().toISOString(),
            payload: event.payload
          }
        ]);

        if (event.type === "RUN_FINISHED") {
          setLiveStatus(event.payload?.status || "PASSED");
          setIsRunningTest(false);
          loadRunDetail(runId);
          loadData();
        } else if (event.type === "RUN_FAILED") {
          setLiveStatus("FAILED");
          setIsRunningTest(false);
          loadRunDetail(runId);
          loadData();
        } else if (event.type === "REVIEW_REQUIRED") {
          setLiveStatus("REVIEW_REQUIRED");
          setIsRunningTest(false);
          loadRunDetail(runId);
          loadData();
        } else if (event.type === "FAILURE_CLASSIFIED") {
          setLiveStatus("DIAGNOSING");
        } else if (event.type === "RECOVERY_PROPOSED") {
          setLiveStatus("HEALING");
        }
      }
    });

    activeUnsubRef.current = unsubscribe;
  };

  const handleResetFixtures = async () => {
    await resetMutation("all");
    await loadData();
  };

  const handleClearRuns = async () => {
    await clearAllRuns();
    setSelectedRunId(null);
    setRunDetail(null);
    setLiveEvents([]);
    setIsExecutionModalOpen(false);
    await loadData();
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-app)" }}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isRunning={isRunningTest}
        isHeaded={systemSettings ? !systemSettings.headless : true}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Top Header */}
        <TopHeader
          onRunDemoTest={() => handleRunTest(activeTestId)}
          isRunning={isRunningTest}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />

        {/* View Switcher */}
        <main
          style={{
            flex: 1,
            overflowY: activeTab === "runs" ? "hidden" : "auto",
            paddingBottom: activeTab === "runs" ? 0 : 32,
            display: "flex",
            flexDirection: "column"
          }}
        >
          {activeTab === "overview" && (
            <DashboardView
              runs={runs}
              benchmark={benchmark}
              searchQuery={searchQuery}
              onSelectRun={(runId) => {
                setSelectedRunId(runId);
                setActiveTab("runs");
              }}
              onOpenTestEditor={() => {
                setActiveTab("tests");
              }}
              onOpenMutationLab={() => {
                setActiveTab("mutation-lab");
              }}
              onOpenWorkbench={() => {
                setActiveTab("workbench");
              }}
              onRunBaseline={() => handleRunTest(activeTestId)}
              onClearRuns={handleClearRuns}
              isRunning={isRunningTest}
            />
          )}

          {activeTab === "workbench" && (
            <CustomTestBuilder
              onRunCreated={handleCustomRunCreated}
              onSelectTab={setActiveTab}
              isRunning={isRunningTest}
            />
          )}

          {activeTab === "tests" && (
            <TestEditorView
              testId={activeTestId}
              contract={activeContract}
              onRunTest={() => handleRunTest(activeTestId)}
              isRunning={isRunningTest}
            />
          )}

          {activeTab === "runs" && (
            <RunExplorerView
              runDetail={runDetail}
              onRefresh={async () => {
                await loadData();
                if (runDetail?.run.id) await loadRunDetail(runDetail.run.id);
              }}
              onOpenRun={(runId) => {
                setSelectedRunId(runId);
                setActiveTab("runs");
              }}
              onRunBaseline={() => handleRunTest(activeTestId)}
              isRunning={isRunningTest}
            />
          )}

          {activeTab === "mutation-lab" && (
            <MutationLabView
              mutations={mutations}
              benchmark={benchmark}
              onRunMutation={handleRunMutation}
              onResetFixtures={handleResetFixtures}
              onSelectRun={(runId) => {
                setSelectedRunId(runId);
                setActiveTab("runs");
              }}
            />
          )}

          {activeTab === "demo-app" && <DemoAppView />}

          {activeTab === "settings" && <SettingsView />}
        </main>
      </div>

      {/* Live Real-Time Execution Modal Overlay */}
      {isExecutionModalOpen && selectedRunId && (
        <LiveExecutionOverlay
          isOpen={isExecutionModalOpen}
          onClose={() => setIsExecutionModalOpen(false)}
          runId={selectedRunId}
          testName={activeContract?.name || activeTestId}
          scenarioName={
            activeRunningScenario
              ? (mutations.find(m => m.id === activeRunningScenario)?.name || activeRunningScenario)
              : activeContract?.baseUrl || activeContract?.targetUrl || "Baseline Suite (Canonical Contract)"
          }
          status={liveStatus}
          events={liveEvents}
          contract={activeContract}
          onInspectEvidence={(runId) => {
            setSelectedRunId(runId);
            setActiveTab("runs");
            setIsExecutionModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
