import React from 'react';
import { useApp } from '../context/AppContext';

export default function SummaryPanel() {
  const { summary, state } = useApp();
  const { totalRequired, totalPrepared, shortageCount, readyCount, totalItems, roomStats } = summary;

  const completionRate = totalRequired > 0 ? Math.round((totalPrepared / totalRequired) * 100) : 0;
  const notReadyCount = totalItems - readyCount;

  return (
    <div className="summary-panel">
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-label">物料总需求</div>
          <div className="summary-card-value">{totalRequired.toLocaleString()}</div>
          <div className="summary-card-sub">共 {totalItems} 项条目</div>
        </div>
        <div className="summary-card success">
          <div className="summary-card-label">已备齐数量</div>
          <div className="summary-card-value">{totalPrepared.toLocaleString()}</div>
          <div className="summary-card-sub">完成率 {completionRate}%</div>
        </div>
        <div className={`summary-card ${shortageCount > 0 ? 'danger' : 'warning'}`}>
          <div className="summary-card-label">短缺/待备条目</div>
          <div className="summary-card-value">{notReadyCount}</div>
          <div className="summary-card-sub">其中明确短缺 {shortageCount} 项</div>
        </div>
        <div className="summary-card warning">
          <div className="summary-card-label">已备齐条目</div>
          <div className="summary-card-value">{readyCount}</div>
          <div className="summary-card-sub">
            占比 {totalItems > 0 ? Math.round((readyCount / totalItems) * 100) : 0}%
          </div>
        </div>
      </div>

      {state.rooms.length > 0 && (
        <>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '12px' }}>
            各会议室完成率
          </div>
          <div className="room-progress">
            {state.rooms.map(room => {
              const stat = roomStats[room.id] || { roomName: room.name, total: 0, ready: 0, rate: 0 };
              const progressClass =
                stat.rate >= 80 ? 'success' : stat.rate >= 50 ? 'warning' : 'danger';
              return (
                <div key={room.id} className="room-progress-item">
                  <div className="room-name">
                    <span>{stat.roomName}</span>
                    <span className="room-rate">
                      {stat.ready}/{stat.total} 项 · {stat.rate}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${progressClass}`}
                      style={{ width: `${stat.rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
