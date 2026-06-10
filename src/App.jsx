import React from 'react';
import { AppProvider, useApp, RISK_VIEW } from './context/AppContext';
import FilterBar from './components/FilterBar';
import SummaryPanel from './components/SummaryPanel';
import GroupedTable from './components/GroupedTable';
import DetailPanel from './components/DetailPanel';
import HandoverEntry from './components/HandoverEntry';
import HandoverModal from './components/HandoverModal';
import RiskDashboard from './components/RiskDashboard';

function AppContent() {
  const { state, dispatch, riskAnalysis } = useApp();
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
      </div>
    );
  }

  const { summary } = riskAnalysis;

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
