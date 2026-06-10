import React from 'react';
import { useApp, RISK_VIEW, ESCALATION_GROUP_BY } from '../context/AppContext';
import {
  ESCALATION_TYPE, ESCALATION_TYPE_LABELS, ESCALATION_TYPE_COLORS, ESCALATION_TYPE_ICONS,
  ESCALATION_STATUS,
} from '../db';

export default function EscalationSummary() {
  const { dispatch, escalationSummary } = useApp();
  const {
    total, activeCount, pendingClaimCount, inProgressCount, pendingReviewCount,
    restoredCount, closedCount, typeStats, meetingsWithBlockers, meetingsCompleted
  } = escalationSummary;

  const handleGotoPool = () => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.ESCALATION_POOL });
  };

  const handleViewMeeting = (meetingId) => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.ESCALATION_POOL });
    dispatch({ type: 'SET_ESCALATION_GROUP_BY', payload: ESCALATION_GROUP_BY.MEETING });
    dispatch({ type: 'SET_ESCALATION_FILTERS', payload: { meetingIds: [meetingId] } });
  };

  if (total === 0) {
    return null;
  }

  return (
    <div className="escalation-summary-widget">
      <div className="escalation-summary-header">
        <div className="escalation-summary-title">
          <span className="escalation-summary-icon">🚨</span>
          <h3>会前异常闭环摘要</h3>
          <span className="escalation-summary-count">
            共 {total} 项异常，{activeCount} 项待处理
          </span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleGotoPool}>
          查看全部 →
        </button>
      </div>

      <div className="escalation-summary-stats">
        <div className="escalation-summary-stat">
          <div
            className="stat-label"
            style={{ color: ESCALATION_TYPE_COLORS[ESCALATION_TYPE.SHORTAGE] }}
          >
            {ESCALATION_TYPE_ICONS[ESCALATION_TYPE.SHORTAGE]} 物料短缺
          </div>
          <div
            className="stat-value"
            style={{ color: ESCALATION_TYPE_COLORS[ESCALATION_TYPE.SHORTAGE] }}
          >
            {typeStats[ESCALATION_TYPE.SHORTAGE] || 0}
          </div>
        </div>
        <div className="escalation-summary-stat">
          <div
            className="stat-label"
            style={{ color: ESCALATION_TYPE_COLORS[ESCALATION_TYPE.REVIEW] }}
          >
            {ESCALATION_TYPE_ICONS[ESCALATION_TYPE.REVIEW]} 需复核
          </div>
          <div
            className="stat-value"
            style={{ color: ESCALATION_TYPE_COLORS[ESCALATION_TYPE.REVIEW] }}
          >
            {typeStats[ESCALATION_TYPE.REVIEW] || 0}
          </div>
        </div>
        <div className="escalation-summary-stat">
          <div
            className="stat-label"
            style={{ color: ESCALATION_TYPE_COLORS[ESCALATION_TYPE.FOLLOW_UP_OVERDUE] }}
          >
            {ESCALATION_TYPE_ICONS[ESCALATION_TYPE.FOLLOW_UP_OVERDUE]} 逾期跟进
          </div>
          <div
            className="stat-value"
            style={{ color: ESCALATION_TYPE_COLORS[ESCALATION_TYPE.FOLLOW_UP_OVERDUE] }}
          >
            {typeStats[ESCALATION_TYPE.FOLLOW_UP_OVERDUE] || 0}
          </div>
        </div>
        <div className="escalation-summary-stat">
          <div
            className="stat-label"
            style={{ color: ESCALATION_TYPE_COLORS[ESCALATION_TYPE.HANDOVER_INCOMPLETE] }}
          >
            {ESCALATION_TYPE_ICONS[ESCALATION_TYPE.HANDOVER_INCOMPLETE]} 交接未完成
          </div>
          <div
            className="stat-value"
            style={{ color: ESCALATION_TYPE_COLORS[ESCALATION_TYPE.HANDOVER_INCOMPLETE] }}
          >
            {typeStats[ESCALATION_TYPE.HANDOVER_INCOMPLETE] || 0}
          </div>
        </div>
        <div className="escalation-summary-stat">
          <div
            className="stat-label"
            style={{ color: ESCALATION_TYPE_COLORS[ESCALATION_TYPE.RECTIFICATION_STAGNANT] }}
          >
            {ESCALATION_TYPE_ICONS[ESCALATION_TYPE.RECTIFICATION_STAGNANT]} 整改停滞
          </div>
          <div
            className="stat-value"
            style={{ color: ESCALATION_TYPE_COLORS[ESCALATION_TYPE.RECTIFICATION_STAGNANT] }}
          >
            {typeStats[ESCALATION_TYPE.RECTIFICATION_STAGNANT] || 0}
          </div>
        </div>
      </div>

      <div className="escalation-summary-progress">
        <div className="progress-bar-container">
          <div className="progress-bar-track">
            {pendingClaimCount > 0 && (
              <div
                className="progress-bar-segment"
                style={{
                  width: `${(pendingClaimCount / total) * 100}%`,
                  background: '#f59e0b',
                }}
                title={`待认领: ${pendingClaimCount} 项`}
              />
            )}
            {inProgressCount > 0 && (
              <div
                className="progress-bar-segment"
                style={{
                  width: `${(inProgressCount / total) * 100}%`,
                  background: '#3b82f6',
                }}
                title={`处理中: ${inProgressCount} 项`}
              />
            )}
            {pendingReviewCount > 0 && (
              <div
                className="progress-bar-segment"
                style={{
                  width: `${(pendingReviewCount / total) * 100}%`,
                  background: '#8b5cf6',
                }}
                title={`待复核: ${pendingReviewCount} 项`}
              />
            )}
            {restoredCount > 0 && (
              <div
                className="progress-bar-segment"
                style={{
                  width: `${(restoredCount / total) * 100}%`,
                  background: '#10b981',
                }}
                title={`已恢复: ${restoredCount} 项`}
              />
            )}
            {closedCount > 0 && (
              <div
                className="progress-bar-segment"
                style={{
                  width: `${(closedCount / total) * 100}%`,
                  background: '#64748b',
                }}
                title={`已闭环: ${closedCount} 项`}
              />
            )}
          </div>
        </div>
        <div className="progress-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#f59e0b' }} />
            待认领 {pendingClaimCount}
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#3b82f6' }} />
            处理中 {inProgressCount}
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#8b5cf6' }} />
            待复核 {pendingReviewCount}
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#10b981' }} />
            已恢复 {restoredCount}
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#64748b' }} />
            已闭环 {closedCount}
          </span>
        </div>
      </div>

      <div className="escalation-summary-meetings">
        {meetingsWithBlockers.length > 0 && (
          <div className="meetings-blockers-section">
            <div className="section-header">
              <span className="section-icon">⚠️</span>
              <h4>仍存在阻塞的会议 ({meetingsWithBlockers.length})</h4>
            </div>
            <div className="meetings-list">
              {meetingsWithBlockers.slice(0, 3).map(({ meeting, activeCount, totalCount }) => (
                <div
                  key={meeting.id}
                  className="meeting-card blocker"
                  onClick={() => handleViewMeeting(meeting.id)}
                >
                  <div className="meeting-card-content">
                    <span className="meeting-card-title">{meeting.title}</span>
                    <span className="meeting-card-meta">
                      {meeting.date} {meeting.timeSlot || ''} · {meeting.personInCharge || '未指定责任人'}
                    </span>
                  </div>
                  <div className="meeting-card-badges">
                    <span className="badge-warning">{activeCount} 项待处理</span>
                    <span className="badge-secondary">共 {totalCount} 项</span>
                  </div>
                </div>
              ))}
              {meetingsWithBlockers.length > 3 && (
                <div className="more-hint" onClick={handleGotoPool}>
                  还有 {meetingsWithBlockers.length - 3} 个会议存在阻塞 →
                </div>
              )}
            </div>
          </div>
        )}

        {meetingsCompleted.length > 0 && (
          <div className="meetings-completed-section">
            <div className="section-header">
              <span className="section-icon">✅</span>
              <h4>已完成闭环的会议 ({meetingsCompleted.length})</h4>
            </div>
            <div className="meetings-list">
              {meetingsCompleted.slice(0, 3).map(({ meeting, totalCount }) => (
                <div
                  key={meeting.id}
                  className="meeting-card completed"
                >
                  <div className="meeting-card-content">
                    <span className="meeting-card-title">{meeting.title}</span>
                    <span className="meeting-card-meta">
                      {meeting.date} {meeting.timeSlot || ''}
                    </span>
                  </div>
                  <div className="meeting-card-badges">
                    <span className="badge-success">✓ 已闭环</span>
                    <span className="badge-secondary">共处理 {totalCount} 项</span>
                  </div>
                </div>
              ))}
              {meetingsCompleted.length > 3 && (
                <div className="more-hint" onClick={handleGotoPool}>
                  还有 {meetingsCompleted.length - 3} 个会议已闭环 →
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {activeCount > 0 && (
        <div className="escalation-summary-alert">
          <span className="alert-icon">⚠️</span>
          <span className="alert-text">
            当前有 <strong>{activeCount}</strong> 项异常未处理，请及时跟进，确保会议顺利进行！
          </span>
        </div>
      )}
    </div>
  );
}
