import React, { useMemo } from 'react';
import { useApp, RISK_VIEW, ESCALATION_GROUP_BY } from '../context/AppContext';
import {
  ESCALATION_TYPE, ESCALATION_TYPE_LABELS, ESCALATION_TYPE_COLORS, ESCALATION_TYPE_ICONS,
  ESCALATION_STATUS, ESCALATION_STATUS_LABELS, ESCALATION_STATUS_COLORS,
  STATUS_LABELS, STATUS_COLORS, MATERIAL_STATUS,
  FOLLOW_UP_STATUS_LABELS, FOLLOW_UP_STATUS_COLORS,
  HANDOVER_STATUS_LABELS, HANDOVER_STATUS_COLORS,
  isEscalationOverdue,
} from '../db';

function EscalationSummaryCards() {
  const { escalationSummary } = useApp();
  const { total, pendingClaimCount, inProgressCount, pendingReviewCount, restoredCount, closedCount, typeStats, activeCount } = escalationSummary;

  const cards = [
    {
      label: '待认领',
      value: pendingClaimCount,
      sub: '需要分配责任人',
      color: ESCALATION_STATUS_COLORS.pending_claim,
      icon: '📋',
    },
    {
      label: '处理中',
      value: inProgressCount,
      sub: '责任人正在处理',
      color: ESCALATION_STATUS_COLORS.in_progress,
      icon: '⚙️',
    },
    {
      label: '待复核',
      value: pendingReviewCount,
      sub: '处理完毕，等待确认',
      color: ESCALATION_STATUS_COLORS.pending_review,
      icon: '🔍',
    },
    {
      label: '已恢复',
      value: restoredCount,
      sub: '异常已消除',
      color: ESCALATION_STATUS_COLORS.restored,
      icon: '✅',
    },
    {
      label: '已闭环',
      value: closedCount,
      sub: '已完成闭环',
      color: ESCALATION_STATUS_COLORS.closed,
      icon: '📦',
    },
  ];

  return (
    <>
      <div className="escalation-summary-cards">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="escalation-stat-card"
            style={{ borderLeftColor: card.color }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px' }}>{card.icon}</span>
              <span className="escalation-stat-label" style={{ margin: 0 }}>{card.label}</span>
            </div>
            <div className="escalation-stat-value" style={{ color: card.color }}>
              {card.value}
            </div>
            <div className="escalation-stat-sub">{card.sub}</div>
          </div>
        ))}
      </div>
      <div className="escalation-summary-cards">
        {Object.entries(ESCALATION_TYPE).map(([key, value]) => (
          <div
            key={key}
            className="escalation-stat-card"
            style={{ borderLeftColor: ESCALATION_TYPE_COLORS[value] }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px' }}>{ESCALATION_TYPE_ICONS[value]}</span>
              <span className="escalation-stat-label" style={{ margin: 0 }}>{ESCALATION_TYPE_LABELS[value]}</span>
            </div>
            <div className="escalation-stat-value" style={{ color: ESCALATION_TYPE_COLORS[value] }}>
              {typeStats[value] || 0}
            </div>
            <div className="escalation-stat-sub">共 {total} 项，待处理 {activeCount} 项</div>
          </div>
        ))}
      </div>
    </>
  );
}

function EscalationFilterBar() {
  const { state, dispatch, escalationItems } = useApp();
  const { escalationFilters, rooms, meetings, materials, handovers } = state;

  const personOptions = useMemo(() => {
    const set = new Set();
    materials.forEach(m => {
      if (m.personInCharge) set.add(m.personInCharge);
      if (m.followUpOwner) set.add(m.followUpOwner);
    });
    handovers.forEach(h => {
      if (h.handoverPerson) set.add(h.handoverPerson);
      if (h.receiverPerson) set.add(h.receiverPerson);
    });
    escalationItems.forEach(item => {
      if (item.owner) set.add(item.owner);
    });
    return Array.from(set).sort();
  }, [materials, handovers, escalationItems]);

  const typeOptions = Object.entries(ESCALATION_TYPE).map(([key, value]) => ({
    value,
    label: ESCALATION_TYPE_LABELS[value],
    color: ESCALATION_TYPE_COLORS[value],
    icon: ESCALATION_TYPE_ICONS[value],
  }));

  const statusOptions = Object.entries(ESCALATION_STATUS).map(([key, value]) => ({
    value,
    label: ESCALATION_STATUS_LABELS[value],
    color: ESCALATION_STATUS_COLORS[value],
  }));

  const handleDateChange = (field, value) => {
    dispatch({
      type: 'SET_ESCALATION_FILTERS',
      payload: { dateRange: { ...escalationFilters.dateRange, [field]: value } },
    });
  };

  const handleMultiChange = (field, value, checked) => {
    const current = escalationFilters[field] || [];
    const next = checked ? [...current, value] : current.filter(v => v !== value);
    dispatch({ type: 'SET_ESCALATION_FILTERS', payload: { [field]: next } });
  };

  const clearFilters = () => {
    dispatch({
      type: 'SET_ESCALATION_FILTERS',
      payload: {
        dateRange: { start: '', end: '' },
        roomIds: [],
        personInCharges: [],
        meetingIds: [],
        types: [],
        statuses: [],
        owners: [],
        showClosed: false,
      },
    });
  };

  const hasActiveFilters =
    escalationFilters.dateRange.start ||
    escalationFilters.dateRange.end ||
    escalationFilters.roomIds.length > 0 ||
    escalationFilters.personInCharges.length > 0 ||
    escalationFilters.meetingIds.length > 0 ||
    escalationFilters.types.length > 0 ||
    escalationFilters.statuses.length > 0 ||
    escalationFilters.owners.length > 0 ||
    escalationFilters.showClosed;

  return (
    <div className="escalation-filter-bar">
      <div className="escalation-filter-row">
        <div className="escalation-filter-item">
          <span className="escalation-filter-label">会议开始日期</span>
          <input
            type="date"
            value={escalationFilters.dateRange.start}
            onChange={(e) => handleDateChange('start', e.target.value)}
          />
        </div>
        <div className="escalation-filter-item">
          <span className="escalation-filter-label">会议结束日期</span>
          <input
            type="date"
            value={escalationFilters.dateRange.end}
            onChange={(e) => handleDateChange('end', e.target.value)}
          />
        </div>
        <div className="escalation-filter-item">
          <span className="escalation-filter-label">会议室</span>
          <select
            multiple
            value={escalationFilters.roomIds.map(String)}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
              dispatch({ type: 'SET_ESCALATION_FILTERS', payload: { roomIds: opts } });
            }}
            style={{ minHeight: '38px' }}
          >
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
        <div className="escalation-filter-item">
          <span className="escalation-filter-label">原负责人</span>
          <select
            multiple
            value={escalationFilters.personInCharges}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value);
              dispatch({ type: 'SET_ESCALATION_FILTERS', payload: { personInCharges: opts } });
            }}
            style={{ minHeight: '38px' }}
          >
            {personOptions.map(person => (
              <option key={person} value={person}>
                {person}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="escalation-filter-row">
        <div className="escalation-filter-item">
          <span className="escalation-filter-label">会议</span>
          <select
            multiple
            value={escalationFilters.meetingIds.map(String)}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
              dispatch({ type: 'SET_ESCALATION_FILTERS', payload: { meetingIds: opts } });
            }}
            style={{ minHeight: '38px' }}
          >
            {meetings.map(m => (
              <option key={m.id} value={m.id}>
                {m.title} · {m.date}
              </option>
            ))}
          </select>
        </div>
        <div className="escalation-filter-item">
          <span className="escalation-filter-label">异常责任人</span>
          <select
            multiple
            value={escalationFilters.owners}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value);
              dispatch({ type: 'SET_ESCALATION_FILTERS', payload: { owners: opts } });
            }}
            style={{ minHeight: '38px' }}
          >
            {personOptions.map(person => (
              <option key={person} value={person}>
                {person}
              </option>
            ))}
          </select>
        </div>
        <div className="escalation-filter-item">
          <span className="escalation-filter-label">异常类型</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '4px 0' }}>
            {typeOptions.map(opt => {
              const checked = escalationFilters.types.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: checked ? `${opt.color}20` : '#f8fafc',
                    border: `1px solid ${checked ? opt.color : '#e2e8f0'}`,
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: checked ? '500' : '400',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleMultiChange('types', opt.value, e.target.checked)}
                    className="checkbox"
                    style={{ margin: 0, accentColor: opt.color }}
                  />
                  <span style={{ color: checked ? opt.color : '#475569' }}>
                    {opt.icon} {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="escalation-filter-item">
          <span className="escalation-filter-label">处理状态</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '4px 0' }}>
            {statusOptions.map(opt => {
              const checked = escalationFilters.statuses.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: checked ? `${opt.color}20` : '#f8fafc',
                    border: `1px solid ${checked ? opt.color : '#e2e8f0'}`,
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: checked ? '500' : '400',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleMultiChange('statuses', opt.value, e.target.checked)}
                    className="checkbox"
                    style={{ margin: 0, accentColor: opt.color }}
                  />
                  <span style={{ color: checked ? opt.color : '#475569' }}>
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
      <div className="escalation-filter-actions">
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: escalationFilters.showClosed ? '#f1f5f9' : 'transparent',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          <input
            type="checkbox"
            checked={escalationFilters.showClosed}
            onChange={(e) => dispatch({ type: 'SET_ESCALATION_FILTERS', payload: { showClosed: e.target.checked } })}
            className="checkbox"
            style={{ margin: 0 }}
          />
          <span>显示已关闭/已恢复</span>
        </label>
        {hasActiveFilters && (
          <button className="btn btn-secondary" onClick={clearFilters}>
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}

function EscalationGroupTabs() {
  const { state, dispatch } = useApp();
  const { escalationGroupBy } = state;

  const tabs = [
    { value: ESCALATION_GROUP_BY.MEETING, label: '📅 按会议' },
    { value: ESCALATION_GROUP_BY.ROOM, label: '🏢 按会议室' },
    { value: ESCALATION_GROUP_BY.PERSON, label: '👤 按责任人' },
    { value: ESCALATION_GROUP_BY.TYPE, label: '📋 按类型' },
    { value: ESCALATION_GROUP_BY.STATUS, label: '⚡ 按状态' },
  ];

  return (
    <div className="escalation-group-tabs">
      <div className="escalation-group-by-selector">
      {tabs.map(tab => (
        <button
          key={tab.value}
          className={`escalation-group-by-btn ${escalationGroupBy === tab.value ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_ESCALATION_GROUP_BY', payload: tab.value })}
        >
          {tab.label}
        </button>
      ))}
      </div>
    </div>
  );
}

function EscalationItemCard({ item }) {
  const { dispatch } = useApp();

  const typeColor = ESCALATION_TYPE_COLORS[item.type];
  const statusColor = ESCALATION_STATUS_COLORS[item.status];
  const isOverdue = isEscalationOverdue(item);

  const handleClick = () => {
    dispatch({ type: 'SET_SELECTED_ESCALATION', payload: item.id });
    dispatch({ type: 'OPEN_ESCALATION_MODAL', payload: { id: item.id } });
  };

  const formatDateTime = (dt) => {
    if (!dt) return '-';
    return dt.replace('T', ' ').substring(0, 16);
  };

  return (
    <div
      className="escalation-item-card"
      onClick={handleClick}
    >
      <div className="escalation-item-header">
        <div className="escalation-item-title">
          <span
            className="status-badge"
            style={{
              background: `${typeColor}15`,
              color: typeColor,
              border: `1px solid ${typeColor}40`,
            }}
          >
            {ESCALATION_TYPE_ICONS[item.type]} {ESCALATION_TYPE_LABELS[item.type]}
          </span>
          <span
            className="status-badge"
            style={{
              background: `${statusColor}15`,
              color: statusColor,
              border: `1px solid ${statusColor}40`,
              marginLeft: '6px',
            }}
          >
            {ESCALATION_STATUS_LABELS[item.status]}
          </span>
          {isOverdue && (
            <span
              className="status-badge"
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                marginLeft: '6px',
              }}
            >
              ⏰ 已超时
            </span>
          )}
        </div>
      </div>

      <div className="escalation-item-body">
        <div className="escalation-item-material">
          <span className="material-name">{item.material?.name || '关联物料'}</span>
          {item.category && (
            <span className="material-category">{item.category.name}</span>
          )}
        </div>

        {item.remark && (
          <div className="escalation-item-remark">
            <span className="remark-label">异常说明：</span>
            <span className="remark-content">{item.remark}</span>
          </div>
        )}

        {item.progress && (
          <div className="escalation-item-progress">
            <span className="progress-label">当前进展：</span>
            <span className="progress-content">{item.progress}</span>
          </div>
        )}

        <div className="escalation-item-meta">
          <div className="meta-item">
            <span className="meta-label">责任人：</span>
            <span className="meta-value">👤 {item.owner || '未分配'}</span>
          </div>
          {item.expectedCompleteTime && (
            <div className="meta-item">
              <span className="meta-label">期望完成：</span>
              <span className={`meta-value ${isOverdue ? 'overdue' : ''}`}>
                ⏰ {formatDateTime(item.expectedCompleteTime)}
              </span>
            </div>
          )}
        </div>

        {item.material && (
          <div className="escalation-item-material-status">
            <span className="status-badge" style={{
              background: `${STATUS_COLORS[item.material.status]}15`,
              color: STATUS_COLORS[item.material.status],
              border: `1px solid ${STATUS_COLORS[item.material.status]}40`,
            }}>
              {STATUS_LABELS[item.material.status]}
            </span>
            <span className="qty-info">
              需求 {item.material.requiredQty} 件 / 已备 {item.material.preparedQty} 件
              {item.shortageQty > 0 && (
                <span className="shortage-qty">，缺口 {item.shortageQty} 件</span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function EscalationGroupCard({ group }) {
  const { dispatch } = useApp();

  const statusPriority = { pending_claim: 0, in_progress: 1, pending_review: 2, restored: 3, closed: 4 };
  const maxStatus = Math.min(...group.items.map(i => statusPriority[i.status] ?? 5));

  const hasActive = group.items.some(i => i.status !== ESCALATION_STATUS.CLOSED && i.status !== ESCALATION_STATUS.RESTORED);
  const activeCount = group.items.filter(i => i.status !== ESCALATION_STATUS.CLOSED && i.status !== ESCALATION_STATUS.RESTORED).length;

  const typeCount = {};
  group.items.forEach(item => {
    typeCount[item.type] = (typeCount[item.type] || 0) + 1;
  });

  return (
    <div className={`escalation-group-card ${hasActive ? 'has-active' : ''}`}>
      <div className="escalation-group-header">
        <div className="escalation-group-title">
          <h3>{group.label}</h3>
          {hasActive && (
            <span className="active-badge">
              {activeCount} 项待处理
            </span>
          )}
        </div>
        <div className="escalation-group-types">
          {Object.entries(typeCount).map(([type, count]) => (
            <span
              key={type}
              className="status-badge"
              style={{
                background: `${ESCALATION_TYPE_COLORS[type]}15`,
                color: ESCALATION_TYPE_COLORS[type],
                border: `1px solid ${ESCALATION_TYPE_COLORS[type]}40`,
              }}
            >
              {ESCALATION_TYPE_ICONS[type]} {ESCALATION_TYPE_LABELS[type]} {count}
            </span>
          ))}
        </div>
      </div>
      <div className="escalation-group-items">
        {group.items.map(item => (
          <EscalationItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function EscalationPool() {
  const { dispatch, escalationSummary, groupedEscalations, filteredEscalationItems } = useApp();

  const { meetingsWithBlockers, meetingsCompleted } = escalationSummary;

  return (
    <div className="escalation-pool-container">
      <div className="escalation-page-header">
        <div className="escalation-page-title">
          <span style={{ fontSize: '22px' }}>🚨</span>
          会前异常升级闭环
        </div>
        <div className="escalation-page-subtitle">
          统一管理会议物料准备过程中的所有异常事项，实现异常发现-升级-处理-恢复-闭环的完整链路
        </div>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.MAIN })}
          >
            ← 返回首页
          </button>
        </div>
      </div>

      <EscalationSummaryCards />

      <div className="escalation-closure-summary">
        <div className="closure-blockers-section">
          <h3>
            <span>⚠️</span>
            仍存在阻塞的会议 ({meetingsWithBlockers.length})
          </h3>
          {meetingsWithBlockers.length > 0 ? (
            <div className="closure-meetings-grid">
              {meetingsWithBlockers.slice(0, 5).map(({ meeting, activeCount, totalCount }) => (
                <div
                  key={meeting.id}
                  className="closure-meeting-card blocker"
                  onClick={() => {
                    dispatch({ type: 'SET_ESCALATION_GROUP_BY', payload: ESCALATION_GROUP_BY.MEETING });
                    dispatch({ type: 'SET_ESCALATION_FILTERS', payload: { meetingIds: [meeting.id] } });
                  }}
                >
                  <div className="closure-meeting-title">{meeting.title}</div>
                  <div className="closure-meeting-meta">{meeting.date} {meeting.timeSlot || ''}</div>
                  <div className="closure-meeting-badges">
                    <span className="closure-badge danger">{activeCount} 项异常待处理</span>
                    <span className="closure-badge secondary">共 {totalCount} 项</span>
                  </div>
                </div>
              ))}
              {meetingsWithBlockers.length > 5 && (
                <div className="more-items-hint">
                  还有 {meetingsWithBlockers.length - 5} 个会议存在阻塞...
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">✅</span>
              <span className="empty-text">所有会议异常均已处理，无阻塞事项</span>
            </div>
          )}
        </div>

        <div className="closure-completed-section">
          <h3>
            <span>✅</span>
            已完成闭环的会议 ({meetingsCompleted.length})
          </h3>
          {meetingsCompleted.length > 0 ? (
            <div className="closure-meetings-grid">
              {meetingsCompleted.slice(0, 5).map(({ meeting, totalCount }) => (
                <div
                  key={meeting.id}
                  className="closure-meeting-card completed"
                >
                  <div className="closure-meeting-title">{meeting.title}</div>
                  <div className="closure-meeting-meta">{meeting.date} {meeting.timeSlot || ''}</div>
                  <div className="closure-meeting-badges">
                    <span className="closure-badge success">✓ 已完成闭环</span>
                    <span className="closure-badge secondary">共处理 {totalCount} 项异常</span>
                  </div>
                </div>
              ))}
              {meetingsCompleted.length > 5 && (
                <div className="more-items-hint">
                  还有 {meetingsCompleted.length - 5} 个会议已完成闭环...
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <span className="empty-text">暂无已完成闭环的会议</span>
            </div>
          )}
        </div>
      </div>

      <EscalationFilterBar />
      <EscalationGroupTabs />

      <div className="escalation-list-container">
        {groupedEscalations.length > 0 ? (
          groupedEscalations.map(group => (
            <EscalationGroupCard key={group.key} group={group} />
          ))
        ) : (
          <div className="empty-state">
            <span className="empty-icon">🎉</span>
            <span className="empty-text">暂无符合条件的异常事项</span>
          </div>
        )}
      </div>

      <div className="pool-footer-info" style={{ textAlign: 'center', padding: '12px', color: '#64748b', fontSize: '13px' }}>
        共 {filteredEscalationItems.length} 条异常记录
      </div>
    </div>
  );
}
