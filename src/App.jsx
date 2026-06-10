import React from 'react';
import { AppProvider, useApp, RISK_VIEW } from './context/AppContext';
import FilterBar from './components/FilterBar';
import SummaryPanel from './components/SummaryPanel';
import GroupedTable from './components/GroupedTable';
import DetailPanel from './components/DetailPanel';
import HandoverEntry from './components/HandoverEntry';
import HandoverModal from './components/HandoverModal';
import RiskDashboard from './components/RiskDashboard';
import RectificationCenter from './components/RectificationCenter';
import RectificationModal from './components/RectificationModal';
import PreMeetingTaskList from './components/PreMeetingTaskList';
import TaskModal from './components/TaskModal';

function AppContent() {
  const { state, dispatch, riskAnalysis, rectificationSummary, preMeetingTaskSummary } = useApp();
  const { loading, reviewMode, currentView } = state;

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loading-spinner">正在加载物料数据...</div>
      </div>
    );
  }

  if (currentView === RISK_VIEW.DASHBOARD) {
    return (
      <div className="app-container">
        <RiskDashboard />
        <HandoverModal />
        <RectificationModal />
        <TaskModal />
      </div>
    );
  }

  if (currentView === RISK_VIEW.RECTIFICATION) {
    return (
      <div className="app-container">
        <RectificationCenter />
        <HandoverModal />
        <RectificationModal />
        <TaskModal />
      </div>
    );
  }

  if (currentView === RISK_VIEW.TASK_LIST) {
    return (
      <div className="app-container">
        <PreMeetingTaskList />
        <HandoverModal />
        <RectificationModal />
        <TaskModal />
      </div>
    );
  }

  const { summary } = riskAnalysis;
  const rectPendingCount = rectificationSummary?.byStatus?.pending || 0;
  const rectInProgressCount = rectificationSummary?.byStatus?.in_progress || 0;
  const taskPendingCount = preMeetingTaskSummary?.pending || 0;
  const taskOverdueCount = preMeetingTaskSummary?.overdue || 0;

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="app-title">
          <span className="app-title-icon">📅</span>
          会议物料分组准备
        </div>
        <div className="header-actions">
          <button
            className="btn"
            style={{
              background: (taskPendingCount + taskOverdueCount) > 0
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : '#f1f5f9',
              color: (taskPendingCount + taskOverdueCount) > 0 ? '#fff' : '#475569',
              border: (taskPendingCount + taskOverdueCount) > 0 ? 'none' : '1px solid #e2e8f0',
            }}
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.TASK_LIST })}
            title="会前保障任务清单，统一管理所有待办事项"
          >
            📋 任务清单
            {(taskPendingCount + taskOverdueCount) > 0 && (
              <span
                style={{
                  marginLeft: '6px',
                  padding: '1px 8px',
                  borderRadius: '10px',
                  background: (taskPendingCount + taskOverdueCount) > 0 ? 'rgba(255,255,255,0.25)' : '#dbeafe',
                  color: (taskPendingCount + taskOverdueCount) > 0 ? '#fff' : '#1d4ed8',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
              >
                {taskPendingCount + taskOverdueCount}
              </span>
            )}
          </button>
          <button
            className="btn"
            style={{
              background: (rectPendingCount + rectInProgressCount) > 0
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : '#f1f5f9',
              color: (rectPendingCount + rectInProgressCount) > 0 ? '#fff' : '#475569',
              border: (rectPendingCount + rectInProgressCount) > 0 ? 'none' : '1px solid #e2e8f0',
            }}
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.RECTIFICATION })}
            title="会前整改闭环中心，处理所有异常事项"
          >
            🔧 整改中心
            {(rectPendingCount + rectInProgressCount) > 0 && (
              <span
                style={{
                  marginLeft: '6px',
                  padding: '1px 8px',
                  borderRadius: '10px',
                  background: (rectPendingCount + rectInProgressCount) > 0 ? 'rgba(255,255,255,0.25)' : '#fef3c7',
                  color: (rectPendingCount + rectInProgressCount) > 0 ? '#fff' : '#b45309',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
              >
                {rectPendingCount + rectInProgressCount}
              </span>
            )}
          </button>
          <button
            className="btn"
            style={{
              background: summary.highRiskCount > 0 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : '#f1f5f9',
              color: summary.highRiskCount > 0 ? '#fff' : '#475569',
              border: summary.highRiskCount > 0 ? 'none' : '1px solid #e2e8f0',
            }}
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.DASHBOARD })}
            title="查看会前风险预警看板"
          >
            ⚠️ 风险看板
            {summary.riskMeetingsCount > 0 && (
              <span
                style={{
                  marginLeft: '6px',
                  padding: '1px 8px',
                  borderRadius: '10px',
                  background: summary.highRiskCount > 0 ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                  color: summary.highRiskCount > 0 ? '#fff' : '#dc2626',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
              >
                {summary.riskMeetingsCount}
              </span>
            )}
          </button>
          <button
            className={`btn ${reviewMode ? 'btn-warning' : 'btn-secondary'}`}
            onClick={() => dispatch({ type: 'TOGGLE_REVIEW_MODE' })}
            title={reviewMode ? '退出核对模式，显示全部物料' : '进入会前核对模式，只显示未备齐/需复核'}
          >
            {reviewMode ? '🔙 退出核对' : '🔍 会前核对'}
          </button>
        </div>
      </div>

      {!reviewMode && <FilterBar />}

      <SummaryPanel />

      <HandoverEntry />

      <GroupedTable />

      <DetailPanel />

      <HandoverModal />
      <RectificationModal />
      <TaskModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
