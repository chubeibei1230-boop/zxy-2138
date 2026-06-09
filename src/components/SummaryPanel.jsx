import React from 'react';
import { useApp } from '../context/AppContext';
import { FOLLOW_UP_STATUS_LABELS, FOLLOW_UP_STATUS_COLORS } from '../db';

export default function SummaryPanel() {
  const { summary, state } = useApp();
  const {
    totalRequired, totalPrepared, shortageQty, shortageItems, readyCount, totalItems, roomStats,
    followUpPendingCount, followUpOverdueCount, followUpCompletedCount,
  } = summary;

  const completionRate = totalRequired > 0 ? Math.round((totalPrepared / totalRequired) * 100) : 0;
  const notReadyCount = totalItems - readyCount;
  const followUpTotal = followUpPendingCount + followUpOverdueCount + followUpCompletedCount;

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
        <div className={`summary-card ${shortageQty > 0 ? 'danger' : 'warning'}`}>
          <div className="summary-card-label">短缺数量</div>
          <div className="summary-card-value">{shortageQty.toLocaleString()}</div>
          <div className="summary-card-sub">涉及 {shortageItems} 项条目，另有 {notReadyCount - shortageItems} 项待准备</div>
        </div>
        <div className="summary-card warning">
          <div className="summary-card-label">已备齐条目</div>
          <div className="summary-card-value">{readyCount}</div>
          <div className="summary-card-sub">
            占比 {totalItems > 0 ? Math.round((readyCount / totalItems) * 100) : 0}%
          </div>
        </div>
        <div className="summary-card" style={{ borderLeftColor: FOLLOW_UP_STATUS_COLORS.pending }}>
          <div className="summary-card-label">待跟进</div>
          <div className="summary-card-value" style={{ color: FOLLOW_UP_STATUS_COLORS.pending }}>{followUpPendingCount}</div>
          <div className="summary-card-sub">需及时处理的事项</div>
        </div>
        <div className="summary-card danger" style={{ borderLeftColor: FOLLOW_UP_STATUS_COLORS.overdue }}>
          <div className="summary-card-label">逾期待跟进</div>
          <div className="summary-card-value" style={{ color: FOLLOW_UP_STATUS_COLORS.overdue }}>{followUpOverdueCount}</div>
          <div className="summary-card-sub">已超过预计完成时间</div>
        </div>
        <div className="summary-card success" style={{ borderLeftColor: FOLLOW_UP_STATUS_COLORS.completed }}>
          <div className="summary-card-label">已完成跟进</div>
          <div className="summary-card-value" style={{ color: FOLLOW_UP_STATUS_COLORS.completed }}>{followUpCompletedCount}</div>
          <div className="summary-card-sub">{followUpTotal > 0 ? `完成率 ${Math.round((followUpCompletedCount / followUpTotal) * 100)}%` : '暂无跟进事项'}</div>
        </div>
      </div>

      {state.rooms.length > 0 && (
        <>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '12px' }}>
            各会议室完成率
          </div>
          <div className="room-progress">
            {state.rooms.map(room => {
              const stat = roomStats[room.id] || { roomName: room.name, total: 0, ready: 0, rate: 0, shortageQty: 0, followUpPending: 0, followUpOverdue: 0 };
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', flexWrap: 'wrap', gap: '4px' }}>
                    {stat.shortageQty > 0 && (
                      <span style={{ fontSize: '11px', color: '#dc2626' }}>
                        ⚠️ 缺口 {stat.shortageQty} 件
                      </span>
                    )}
                    {(stat.followUpPending > 0 || stat.followUpOverdue > 0) && (
                      <span style={{ fontSize: '11px', display: 'flex', gap: '8px' }}>
                        {stat.followUpPending > 0 && (
                          <span style={{ color: FOLLOW_UP_STATUS_COLORS.pending }}>⏩ 待跟进 {stat.followUpPending}</span>
                        )}
                        {stat.followUpOverdue > 0 && (
                          <span style={{ color: FOLLOW_UP_STATUS_COLORS.overdue }}>⏰ 逾期 {stat.followUpOverdue}</span>
                        )}
                      </span>
                    )}
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
