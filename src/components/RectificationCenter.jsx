import React, { useMemo } from 'react';
import { useApp, RISK_VIEW, RECTIFICATION_GROUP_BY } from '../context/AppContext';
import {
  RECTIFICATION_TYPE, RECTIFICATION_TYPE_LABELS, RECTIFICATION_TYPE_COLORS, RECTIFICATION_TYPE_ICONS,
  RECTIFICATION_STATUS, RECTIFICATION_STATUS_LABELS, RECTIFICATION_STATUS_COLORS,
  STATUS_LABELS, STATUS_COLORS, MATERIAL_STATUS,
  FOLLOW_UP_STATUS, FOLLOW_UP_STATUS_LABELS, FOLLOW_UP_STATUS_COLORS,
  HANDOVER_STATUS_LABELS, HANDOVER_STATUS_COLORS,
  getFollowUpStatus, getLocalDatetimeLocal,
} from '../db';

function RectificationSummaryCards() {
  const { rectificationSummary } = useApp();
  const { total, pendingCount, inProgressCount, pendingReviewCount, completedCount, typeStats, activeCount } = rectificationSummary;

  const cards = [
    {
      label: '待认领',
      value: pendingCount,
      sub: '需要分配责任人',
      color: RECTIFICATION_STATUS_COLORS.pending,
      icon: '📋',
    },
    {
      label: '处理中',
      value: inProgressCount,
      sub: '责任人正在处理',
      color: RECTIFICATION_STATUS_COLORS.in_progress,
      icon: '⚙️',
    },
    {
      label: '待复核',
      value: pendingReviewCount,
      sub: '处理完毕，等待确认',
      color: RECTIFICATION_STATUS_COLORS.pending_review,
      icon: '🔍',
    },
    {
      label: '已完成',
      value: completedCount,
      sub: '已闭环的事项',
      color: RECTIFICATION_STATUS_COLORS.completed,
      icon: '✅',
    },
  ];

  return (
    <>
      <div className="rect-summary-grid">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="rect-summary-card"
            style={{ borderLeftColor: card.color }}
          >
            <div className="rect-summary-card-top">
              <span className="rect-summary-icon">{card.icon}</span>
              <span className="rect-summary-label">{card.label}</span>
            </div>
            <div className="rect-summary-value" style={{ color: card.color }}>
              {card.value}
            </div>
            <div className="rect-summary-sub">{card.sub}</div>
          </div>
        ))}
      </div>
      <div className="rect-summary-grid">
        {Object.entries(RECTIFICATION_TYPE).map(([key, value]) => (
          <div
            key={key}
            className="rect-summary-card"
            style={{ borderLeftColor: RECTIFICATION_TYPE_COLORS[value] }}
          >
            <div className="rect-summary-card-top">
              <span className="rect-summary-icon">{RECTIFICATION_TYPE_ICONS[value]}</span>
              <span className="rect-summary-label">{RECTIFICATION_TYPE_LABELS[value]}</span>
            </div>
            <div className="rect-summary-value" style={{ color: RECTIFICATION_TYPE_COLORS[value] }}>
              {typeStats[value] || 0}
            </div>
            <div className="rect-summary-sub">共 {total} 项，待处理 {activeCount} 项</div>
          </div>
        ))}
      </div>
    </>
  );
}

function RectificationFilterBar() {
  const { state, dispatch } = useApp();
  const { rectificationFilters, rooms, meetings, materials, handovers } = state;

  const personOptions = useMemo(() => {
    const set = new Set();
    materials.forEach(m => {
      if (m.personInCharge) set.add(m.personInCharge);
      if (m.followUpOwner) set.add(m.followUpOwner);
      if (m.rectificationOwner) set.add(m.rectificationOwner);
    });
    handovers.forEach(h => {
      if (h.handoverPerson) set.add(h.handoverPerson);
      if (h.receiverPerson) set.add(h.receiverPerson);
    });
    return Array.from(set).sort();
  }, [materials, handovers]);

  const typeOptions = Object.entries(RECTIFICATION_TYPE).map(([key, value]) => ({
    value,
    label: RECTIFICATION_TYPE_LABELS[value],
    color: RECTIFICATION_TYPE_COLORS[value],
    icon: RECTIFICATION_TYPE_ICONS[value],
  }));

  const statusOptions = Object.entries(RECTIFICATION_STATUS).map(([key, value]) => ({
    value,
    label: RECTIFICATION_STATUS_LABELS[value],
    color: RECTIFICATION_STATUS_COLORS[value],
  }));

  const handleDateChange = (field, value) => {
    dispatch({
      type: 'SET_RECTIFICATION_FILTERS',
      payload: { dateRange: { ...rectificationFilters.dateRange, [field]: value } },
    });
  };

  const handleMultiChange = (field, value, checked) => {
    const current = rectificationFilters[field] || [];
    const next = checked ? [...current, value] : current.filter(v => v !== value);
    dispatch({ type: 'SET_RECTIFICATION_FILTERS', payload: { [field]: next } });
  };

  const clearFilters = () => {
    dispatch({
      type: 'SET_RECTIFICATION_FILTERS',
      payload: {
        dateRange: { start: '', end: '' },
        roomIds: [],
        personInCharges: [],
        meetingIds: [],
        types: [],
        statuses: [],
        owners: [],
      },
    });
  };

  const hasActiveFilters =
    rectificationFilters.dateRange.start ||
    rectificationFilters.dateRange.end ||
    rectificationFilters.roomIds.length > 0 ||
    rectificationFilters.personInCharges.length > 0 ||
    rectificationFilters.meetingIds.length > 0 ||
    rectificationFilters.types.length > 0 ||
    rectificationFilters.statuses.length > 0 ||
    rectificationFilters.owners.length > 0;

  return (
    <div className="rect-filter-bar">
      <div className="rect-filter-row">
        <div className="rect-filter-item">
          <span className="rect-filter-label">会议开始日期</span>
          <input
            type="date"
            value={rectificationFilters.dateRange.start}
            onChange={(e) => handleDateChange('start', e.target.value)}
          />
        </div>
        <div className="rect-filter-item">
          <span className="rect-filter-label">会议结束日期</span>
          <input
            type="date"
            value={rectificationFilters.dateRange.end}
            onChange={(e) => handleDateChange('end', e.target.value)}
          />
        </div>
        <div className="rect-filter-item">
          <span className="rect-filter-label">会议室</span>
          <select
            multiple
            value={rectificationFilters.roomIds.map(String)}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
              dispatch({ type: 'SET_RECTIFICATION_FILTERS', payload: { roomIds: opts } });
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
        <div className="rect-filter-item">
          <span className="rect-filter-label">原负责人</span>
          <select
            multiple
            value={rectificationFilters.personInCharges}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value);
              dispatch({ type: 'SET_RECTIFICATION_FILTERS', payload: { personInCharges: opts } });
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
      <div className="rect-filter-row">
        <div className="rect-filter-item">
          <span className="rect-filter-label">会议</span>
          <select
            multiple
            value={rectificationFilters.meetingIds.map(String)}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
              dispatch({ type: 'SET_RECTIFICATION_FILTERS', payload: { meetingIds: opts } });
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
        <div className="rect-filter-item">
          <span className="rect-filter-label">整改负责人</span>
          <select
            multiple
            value={rectificationFilters.owners}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value);
              dispatch({ type: 'SET_RECTIFICATION_FILTERS', payload: { owners: opts } });
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
        <div className="rect-filter-item">
          <span className="rect-filter-label">风险类型</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '4px 0' }}>
            {typeOptions.map(opt => {
              const checked = rectificationFilters.types.includes(opt.value);
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
        <div className="rect-filter-item">
          <span className="rect-filter-label">处理状态</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '4px 0' }}>
            {statusOptions.map(opt => {
              const checked = rectificationFilters.statuses.includes(opt.value);
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
                  <span style={{ color: checked ? opt.color : '#475569' }}>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
      <div className="rect-filter-actions">
        {hasActiveFilters && (
          <button className="btn btn-secondary" onClick={clearFilters}>
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}

function RectificationGroupBySelector() {
  const { state, dispatch } = useApp();
  const { rectificationGroupBy } = state;

  const options = [
    { value: RECTIFICATION_GROUP_BY.TYPE, label: '按类型', icon: '📊' },
    { value: RECTIFICATION_GROUP_BY.MEETING, label: '按会议', icon: '📅' },
    { value: RECTIFICATION_GROUP_BY.ROOM, label: '按会议室', icon: '🏢' },
    { value: RECTIFICATION_GROUP_BY.PERSON, label: '按负责人', icon: '👤' },
  ];

  return (
    <div className="rect-group-by-selector">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`rect-group-by-btn ${rectificationGroupBy === opt.value ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_RECTIFICATION_GROUP_BY', payload: opt.value })}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  );
}

function RectificationItemCard({ item, onSelect, isSelected }) {
  const { dispatch } = useApp();
  const typeColor = RECTIFICATION_TYPE_COLORS[item.type];
  const typeIcon = RECTIFICATION_TYPE_ICONS[item.type];
  const typeLabel = RECTIFICATION_TYPE_LABELS[item.type];
  const statusColor = RECTIFICATION_STATUS_COLORS[item.status];
  const statusLabel = RECTIFICATION_STATUS_LABELS[item.status];

  return (
    <div
      className={`rect-item-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(item)}
      style={{ borderLeft: `4px solid ${typeColor}` }}
    >
      <div className="rect-item-header">
        <span className="rect-item-title">
          <span
            className="status-badge"
            style={{
              background: `${typeColor}15`,
              color: typeColor,
              border: `1px solid ${typeColor}40`,
            }}
          >
            {typeIcon} {typeLabel}
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
            {statusLabel}
          </span>
          <span style={{ fontWeight: 600, marginLeft: '6px' }}>{item.material?.name || '未知物料'}</span>
        </span>
        {item.shortageQty > 0 && (
          <span className="rect-item-qty shortage">缺 {item.shortageQty}</span>
        )}
      </div>

      <div className="rect-item-meta">
        <span>📅 {item.meeting?.title || item.meeting?.date || '未关联会议'}</span>
        {item.meeting?.timeSlot && <span>⏰ {item.meeting.timeSlot}</span>}
        <span>🏢 {item.room?.name || '未分配'}</span>
      </div>

      <div className="rect-item-meta">
        <span>👤 原责任人: {item.personInCharge || '未分配'}</span>
        {item.owner && <span style={{ color: RECTIFICATION_STATUS_COLORS.in_progress }}>⚙️ 整改: {item.owner}</span>}
      </div>

      {item.remark && (
        <div className="rect-item-remark">💬 {item.remark}</div>
      )}

      {item.progress && (
        <div className="rect-item-progress" style={{ borderColor: `${statusColor}40`, background: `${statusColor}08` }}>
          <span style={{ color: statusColor }}>📝 {item.progress}</span>
        </div>
      )}

      {item.dueTime && (
        <div className="rect-item-due">
          📅 截止: {new Date(item.dueTime).toLocaleString('zh-CN')}
        </div>
      )}

      <div className="rect-item-actions">
        <button
          className="btn btn-sm btn-primary"
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'SET_SELECTED_RECTIFICATION', payload: item.id });
            dispatch({ type: 'OPEN_RECTIFICATION_MODAL', payload: { id: item.id } });
          }}
        >
          ✏️ 处理
        </button>
      </div>
    </div>
  );
}

function RectificationGroupList() {
  const { state, dispatch, groupedRectifications, rectificationSummary, filteredRectificationItems } = useApp();
  const { selectedRectificationId } = state;

  if (filteredRectificationItems.length === 0) {
    return (
      <div className="rect-empty-state">
        <div className="rect-empty-icon">🎉</div>
        <div className="rect-empty-text">当前筛选范围内暂无整改事项</div>
        <div className="rect-empty-sub">所有会前异常均已处理完毕，或尝试调整筛选条件</div>
      </div>
    );
  }

  return (
    <div className="rect-group-list">
      {groupedRectifications.map((group, gIdx) => {
        const groupStatusMap = {};
        group.items.forEach(item => {
          groupStatusMap[item.status] = (groupStatusMap[item.status] || 0) + 1;
        });

        return (
          <div key={group.key || gIdx} className="rect-group-section">
            <div
              className="rect-group-header"
            >
              <div className="rect-group-header-left">
                <span className="rect-group-name">{group.label}</span>
                <span className="rect-group-count">{group.items.length} 项</span>
              </div>
              <div className="rect-group-header-right">
                {Object.entries(groupStatusMap).map(([status, count]) => (
                  <span
                    key={status}
                    className="rect-group-stat"
                    style={{ color: RECTIFICATION_STATUS_COLORS[status] }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: RECTIFICATION_STATUS_COLORS[status],
                        display: 'inline-block',
                        marginRight: '4px',
                      }}
                    />
                    {RECTIFICATION_STATUS_LABELS[status]} {count}
                  </span>
                ))}
              </div>
            </div>
            <div className="rect-group-body">
              {group.items.map(item => (
                <RectificationItemCard
                  key={item.id}
                  item={item}
                  isSelected={selectedRectificationId === item.id}
                  onSelect={(it) => dispatch({ type: 'SET_SELECTED_RECTIFICATION', payload: it.id })}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RectificationDetailPanel() {
  const { state, dispatch, selectedRectification, riskAnalysis, createHandover } = useApp();
  const { rectificationMobileDetailExpanded } = state;

  const handleViewDetail = (material) => {
    dispatch({ type: 'SET_DETAIL_MATERIAL', payload: material });
    dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.MAIN });
  };

  const handleCreateHandover = async (material) => {
    const handoverId = await createHandover({
      sourceType: 'selected',
      materialIds: [material.id],
      title: `整改交接 - ${material.name}`,
    });
    if (handoverId) {
      dispatch({ type: 'OPEN_HANDOVER_MODAL', payload: { handoverId } });
    }
  };

  if (!selectedRectification) {
    return (
      <div className="rect-detail-panel">
        <div className="rect-detail-header">
          <span className="rect-detail-title">📋 整改详情</span>
          <button
            className="collapse-toggle"
            onClick={() => dispatch({ type: 'TOGGLE_RECTIFICATION_MOBILE_DETAIL' })}
          >
            {rectificationMobileDetailExpanded ? '▼ 收起' : '▶ 展开'}
          </button>
        </div>
        <div className={`rect-detail-body ${!rectificationMobileDetailExpanded ? 'collapsed' : ''}`}>
          <div className="rect-empty-state" style={{ padding: '60px 20px' }}>
            <div className="rect-empty-icon">👆</div>
            <div className="rect-empty-text">点击左侧列表查看整改详情</div>
            <div className="rect-empty-sub">选择一个异常事项以查看详细信息并执行整改操作</div>
          </div>
        </div>
      </div>
    );
  }

  const item = selectedRectification;
  const typeColor = RECTIFICATION_TYPE_COLORS[item.type];
  const statusColor = RECTIFICATION_STATUS_COLORS[item.status];
  const fStatus = item.material ? getFollowUpStatus(item.material) : null;

  return (
    <div className="rect-detail-panel">
      <div className="rect-detail-header">
        <span className="rect-detail-title">
          {RECTIFICATION_TYPE_ICONS[item.type]} {RECTIFICATION_TYPE_LABELS[item.type]}
          <span
            className="risk-level-badge"
            style={{
              background: `${typeColor}15`,
              color: typeColor,
              border: `1px solid ${typeColor}40`,
              marginLeft: '8px',
            }}
          >
            {RECTIFICATION_STATUS_LABELS[item.status]}
          </span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => dispatch({ type: 'OPEN_RECTIFICATION_MODAL', payload: { id: item.id } })}
          >
            ✏️ 处理整改
          </button>
          <button
            className="collapse-toggle"
            onClick={() => dispatch({ type: 'TOGGLE_RECTIFICATION_MOBILE_DETAIL' })}
          >
            {rectificationMobileDetailExpanded ? '▼ 收起' : '▶ 展开'}
          </button>
        </div>
      </div>

      <div className={`rect-detail-body ${!rectificationMobileDetailExpanded ? 'collapsed' : ''}`}>
        <div className="rect-detail-summary">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div className="rect-stat-mini">
              <span className="rect-stat-mini-label">物料名称</span>
              <span className="rect-stat-mini-value" style={{ fontWeight: 600 }}>
                {item.category?.icon} {item.material?.name || '未知'}
              </span>
            </div>
            <div className="rect-stat-mini">
              <span className="rect-stat-mini-label">数量情况</span>
              <span
                className="rect-stat-mini-value"
                style={{
                  color: item.shortageQty > 0 ? '#dc2626' : '#059669',
                  fontWeight: 600,
                }}
              >
                {item.material?.preparedQty ?? 0} / {item.material?.requiredQty ?? 0}
                {item.shortageQty > 0 && ` (缺${item.shortageQty})`}
              </span>
            </div>
            <div className="rect-stat-mini">
              <span className="rect-stat-mini-label">所属会议</span>
              <span className="rect-stat-mini-value">
                📅 {item.meeting?.title || '未关联'}
              </span>
            </div>
            <div className="rect-stat-mini">
              <span className="rect-stat-mini-label">会议时间</span>
              <span className="rect-stat-mini-value">
                {item.meeting ? `${item.meeting.date} ${item.meeting.timeSlot || ''}` : '-'}
              </span>
            </div>
            <div className="rect-stat-mini">
              <span className="rect-stat-mini-label">会议室</span>
              <span className="rect-stat-mini-value">🏢 {item.room?.name || '未分配'}</span>
            </div>
            <div className="rect-stat-mini">
              <span className="rect-stat-mini-label">原责任人</span>
              <span className="rect-stat-mini-value">👤 {item.personInCharge || '未分配'}</span>
            </div>
            {item.owner && (
              <div className="rect-stat-mini">
                <span className="rect-stat-mini-label">整改负责人</span>
                <span className="rect-stat-mini-value" style={{ color: RECTIFICATION_STATUS_COLORS.in_progress, fontWeight: 600 }}>
                  ⚙️ {item.owner}
                </span>
              </div>
            )}
            {item.assignedAt && (
              <div className="rect-stat-mini">
                <span className="rect-stat-mini-label">认领时间</span>
                <span className="rect-stat-mini-value">
                  {new Date(item.assignedAt).toLocaleString('zh-CN')}
                </span>
              </div>
            )}
            {item.completedAt && (
              <div className="rect-stat-mini">
                <span className="rect-stat-mini-label">完成时间</span>
                <span className="rect-stat-mini-value" style={{ color: RECTIFICATION_STATUS_COLORS.completed, fontWeight: 600 }}>
                  {new Date(item.completedAt).toLocaleString('zh-CN')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rect-detail-section">
          <div
            className="rect-detail-section-header"
            style={{ borderLeft: `3px solid ${typeColor}`, background: `${typeColor}08` }}
          >
            <span style={{ color: typeColor, fontWeight: 600 }}>
              风险来源信息
            </span>
            <span className="risk-count-badge" style={{ background: `${typeColor}15`, color: typeColor }}>
              {RECTIFICATION_TYPE_LABELS[item.type]}
            </span>
          </div>
          <div className="rect-detail-section-body">
            <div className="rect-detail-info-grid">
              {item.material && (
                <>
                  <div className="rect-info-field">
                    <span className="rect-info-label">物料状态</span>
                    <span
                      className="status-badge"
                      style={{
                        background: `${STATUS_COLORS[item.material.status]}15`,
                        color: STATUS_COLORS[item.material.status],
                        border: `1px solid ${STATUS_COLORS[item.material.status]}40`,
                      }}
                    >
                      {STATUS_LABELS[item.material.status]}
                    </span>
                  </div>
                  {fStatus && fStatus !== 'none' && (
                    <div className="rect-info-field">
                      <span className="rect-info-label">跟进状态</span>
                      <span
                        className="status-badge"
                        style={{
                          background: `${FOLLOW_UP_STATUS_COLORS[fStatus]}15`,
                          color: FOLLOW_UP_STATUS_COLORS[fStatus],
                          border: `1px solid ${FOLLOW_UP_STATUS_COLORS[fStatus]}40`,
                        }}
                      >
                        {FOLLOW_UP_STATUS_LABELS[fStatus]}
                      </span>
                    </div>
                  )}
                  {item.material.shortageNote && (
                    <div className="rect-info-field full">
                      <span className="rect-info-label">短缺说明</span>
                      <span className="rect-info-value shortage">{item.material.shortageNote}</span>
                    </div>
                  )}
                </>
              )}
              {item.handoverItem && (
                <>
                  <div className="rect-info-field">
                    <span className="rect-info-label">交接标题</span>
                    <span className="rect-info-value">{item.handover?.title}</span>
                  </div>
                  <div className="rect-info-field">
                    <span className="rect-info-label">交接人</span>
                    <span className="rect-info-value">{item.handover?.handoverPerson || '未指定'}</span>
                  </div>
                  <div className="rect-info-field">
                    <span className="rect-info-label">接收人</span>
                    <span className="rect-info-value">{item.handover?.receiverPerson || '未指定'}</span>
                  </div>
                  <div className="rect-info-field">
                    <span className="rect-info-label">交接状态</span>
                    <span
                      className="status-badge"
                      style={{
                        background: `${HANDOVER_STATUS_COLORS[item.handover?.status]}15`,
                        color: HANDOVER_STATUS_COLORS[item.handover?.status],
                        border: `1px solid ${HANDOVER_STATUS_COLORS[item.handover?.status]}40`,
                      }}
                    >
                      {HANDOVER_STATUS_LABELS[item.handover?.status]}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="rect-detail-section">
          <div
            className="rect-detail-section-header"
            style={{ borderLeft: `3px solid ${statusColor}`, background: `${statusColor}08` }}
          >
            <span style={{ color: statusColor, fontWeight: 600 }}>整改处理信息</span>
            <span className="risk-count-badge" style={{ background: `${statusColor}15`, color: statusColor }}>
              {RECTIFICATION_STATUS_LABELS[item.status]}
            </span>
          </div>
          <div className="rect-detail-section-body">
            <div className="rect-detail-info-grid">
              <div className="rect-info-field">
                <span className="rect-info-label">整改负责人</span>
                <span className="rect-info-value">{item.owner || '⚠️ 未认领'}</span>
              </div>
              {item.dueTime && (
                <div className="rect-info-field">
                  <span className="rect-info-label">截止时间</span>
                  <span className="rect-info-value">{new Date(item.dueTime).toLocaleString('zh-CN')}</span>
                </div>
              )}
              <div className="rect-info-field full">
                <span className="rect-info-label">处理进展</span>
                <span className="rect-info-value">{item.progress || '暂无进展记录'}</span>
              </div>
              <div className="rect-info-field full">
                <span className="rect-info-label">备注说明</span>
                <span className="rect-info-value">{item.remark || '暂无备注'}</span>
              </div>
              {item.returnedReason && (
                <div className="rect-info-field full">
                  <span className="rect-info-label">退回复核原因</span>
                  <span className="rect-info-value shortage">{item.returnedReason}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rect-detail-actions-bar">
          <button
            className="btn btn-primary"
            onClick={() => dispatch({ type: 'OPEN_RECTIFICATION_MODAL', payload: { id: item.id } })}
          >
            ✏️ 执行整改操作
          </button>
          {item.material && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => handleViewDetail(item.material)}
              >
                📋 查看物料详情
              </button>
              <button
                className="btn btn-sm"
                style={{
                  background: '#ede9fe',
                  color: '#6d28d9',
                  border: '1px solid #ddd6fe',
                }}
                onClick={() => handleCreateHandover(item.material)}
              >
                🤝 发起交接
              </button>
            </>
          )}
          {item.handover && (
            <button
              className="btn btn-sm"
              style={{
                background: '#ede9fe',
                color: '#6d28d9',
                border: '1px solid #ddd6fe',
              }}
              onClick={() => dispatch({
                type: 'OPEN_HANDOVER_MODAL',
                payload: { handoverId: item.handover.id },
              })}
            >
              🤝 继续交接
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RectificationCenter() {
  const { dispatch, rectificationSummary, filteredRectificationItems } = useApp();
  const { total, activeCount } = rectificationSummary;

  return (
    <div className="rect-center">
      <div className="rect-center-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.MAIN })}
          >
            ← 返回物料管理
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.DASHBOARD })}
          >
            ⚠️ 风险看板
          </button>
          <h2 className="rect-center-title">
            🔧 会前整改闭环中心
            <span className="rect-center-subtitle" style={{ marginLeft: '12px' }}>
              共 {total} 项异常，{activeCount} 项待处理
            </span>
          </h2>
        </div>
      </div>

      <RectificationSummaryCards />

      <RectificationFilterBar />

      <div style={{ background: '#fff', borderRadius: '12px 12px 0 0', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>📊 分组视图</span>
          <RectificationGroupBySelector />
        </div>
        <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '2px 10px', borderRadius: '12px' }}>
          当前筛选显示 {filteredRectificationItems.length} 项
        </span>
      </div>

      <div className="rect-content-grid">
        <div className="rect-list-col">
          <div className="rect-col-header">
            <span>📋 整改事项列表</span>
            <span className="rect-col-header-count">共 {filteredRectificationItems.length} 项</span>
          </div>
          <RectificationGroupList />
        </div>
        <div className="rect-detail-col">
          <RectificationDetailPanel />
        </div>
      </div>
    </div>
  );
}
