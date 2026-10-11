import React, { useEffect, useState } from "react";
import { Header } from "./components/Header.js";
import { OverviewView } from "./views/OverviewView.js";
import { ContractView } from "./views/ContractView.js";
import { RunExplorerView } from "./views/RunExplorerView.js";
import { MutationLabView } from "./views/MutationLabView.js";
import {
  createRun,
  fetchBenchmark,
  fetchMutations,
  fetchRunDetail,
  fetchRuns,
  fetchTestDetail,
  resetMutation,
  subscribeToEvents
} from "./api.js";
import { BenchmarkMetrics, MutationScenario, RunDetail, TestRun } from "./types.js";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [benchmark, setBenchmark] = useState<BenchmarkMetrics | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [mutations, setMutations] = useState<MutationScenario[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [isRunningBaseline, setIsRunningBaseline] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [runsData, benchData, mutsData, testData] = await Promise.all([
        fetchRuns(),
        fetchBenchmark(),
        fetchMutations(),
        fetchTestDetail("checkout-valid-card")
      ]);
      setRuns(runsData);
      setBenchmark(benchData);
      setMutations(mutsData);
      if (testData?.contract) {
        setContract(testData.contract);
      }
    } catch (err: any) {
      console.error("Failed to load initial workbench data:", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

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
    }
  }, [selectedRunId]);

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    setActiveTab("explorer");
    loadRunDetail(runId);
  };

  const handleRunBaseline = async () => {
    setIsRunningBaseline(true);
    try {
      const { runId } = await createRun("checkout-valid-card");
      setSelectedRunId(runId);
      setActiveTab("explorer");

      // Subscribe to live SSE events
      const unsubscribe = subscribeToEvents(runId, () => {
        loadRunDetail(runId);
        loadData();
      });

      // Poll until completion
      setTimeout(async () => {
        await loadRunDetail(runId);
        await loadData();
        setIsRunningBaseline(false);
        unsubscribe();
      }, 5000);
    } catch (err) {
      console.error("Error creating baseline run:", err);
      setIsRunningBaseline(false);
    }
  };

  const handleRunMutation = async (scenarioId: string) => {
    const { runId } = await createRun("checkout-valid-card", scenarioId);
    setSelectedRunId(runId);
    setActiveTab("explorer");

    const unsubscribe = subscribeToEvents(runId, () => {
      loadRunDetail(runId);
      loadData();
    });

    setTimeout(async () => {
      await loadRunDetail(runId);
      await loadData();
      unsubscribe();
    }, 7000);
  };

  const handleResetFixtures = async () => {
    await resetMutation("all");
    await loadData();
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRunBaseline={handleRunBaseline}
        isRunningBaseline={isRunningBaseline}
      />

      <main style={{ flex: 1 }}>
        {activeTab === "overview" && (
          <OverviewView
            runs={runs}
            benchmark={benchmark}
            onSelectRun={handleSelectRun}
            onOpenMutationLab={() => setActiveTab("mutation-lab")}
            onRunBaseline={handleRunBaseline}
          />
        )}

        {activeTab === "contract" && (
          <ContractView contract={contract} />
        )}

        {activeTab === "explorer" && (
          <RunExplorerView
            runDetail={runDetail}
            onRefresh={() => selectedRunId && loadRunDetail(selectedRunId)}
          />
        )}

        {activeTab === "mutation-lab" && (
          <MutationLabView
            mutations={mutations}
            benchmark={benchmark}
            onRunMutation={handleRunMutation}
            onResetFixtures={handleResetFixtures}
            onSelectRun={handleSelectRun}
          />
        )}
      </main>
    </div>
  );
};
