import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import FilterBar from './components/FilterBar';
import SummaryPanel from './components/SummaryPanel';
import GroupedTable from './components/GroupedTable';
import DetailPanel from './components/DetailPanel';

function AppContent() {
  const { state, dispatch } = useApp();
  const { loading, reviewMode } = state;

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loading-spinner">正在加载物料数据...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="app-title">
          <span className="app-title-icon">📅</span>
          会议物料分组准备
        </div>
        <div className="header-actions">
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

      <GroupedTable />

      <DetailPanel />
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
