import React, { useMemo } from 'react';
import { useApp, RISK_VIEW } from '../context/AppContext';
import {
  RISK_LEVEL, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS,
  RISK_FACTOR_TYPE, RISK_FACTOR_LABELS,
  STATUS_LABELS, STATUS_COLORS, MATERIAL_STATUS,
  FOLLOW_UP_STATUS, FOLLOW_UP_STATUS_LABELS, FOLLOW_UP_STATUS_COLORS,
  HANDOVER_STATUS_LABELS, HANDOVER_STATUS_COLORS,
  getFollowUpStatus,
} from '../db';

function RiskSummaryCards() {
  const { riskAnalysis } = useApp();
  const { summary } = riskAnalysis;

  const cards = [
    {
      label: '高风险会议',
      value: summary.highRiskCount,
      sub: '需立即处理',
      color: RISK_LEVEL_COLORS.high,
      icon: '🚨',
    },
    {
      label: '逾期跟进',
      value: summary.overdueFollowUpTotal,
      sub: '已超过截止时间',
      color: FOLLOW_UP_STATUS_COLORS.overdue,
      icon: '⏰',
    },
    {
      label: '短缺物料',
      value: summary.shortageMaterialsTotal,
      sub: '存在数量缺口',
      color: STATUS_COLORS.shortage,
      icon: '📦',
    },
    {
      label: '待交接事项',
      value: summary.handoverPendingTotal,
      sub: '交接未完成',
      color: '#8b5cf6',
      icon: '🤝',
    },
  ];

  return (
    <div className="risk-summary-grid">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="risk-summary-card"
          style={{ borderLeftColor: card.color }}
        >
          <div className="risk-summary-card-top">
            <span className="risk-summary-icon">{card.icon}</span>
            <span className="risk-summary-label">{card.label}</span>
          </div>
          <div
            className="risk-summary-value"
            style={{ color: card.color }}
          >
            {card.value}
          </div>
          <div className="risk-summary-sub">{card.sub}</div>
        </div>
      ))}
      <div className="risk-summary-card" style={{ borderLeftColor: RISK_LEVEL_COLORS.medium }}>
        <div className="risk-summary-card-top">
          <span className="risk-summary-icon">⏩</span>
          <span className="risk-summary-label">待跟进事项</span>
        </div>
        <div className="risk-summary-value" style={{ color: RISK_LEVEL_COLORS.medium }}>
          {summary.pendingFollowUpTotal}
        </div>
        <div className="risk-summary-sub">需及时处理</div>
      </div>
      <div className="risk-summary-card" style={{ borderLeftColor: '#8b5cf6' }}>
        <div className="risk-summary-card-top">
          <span className="risk-summary-icon">🔍</span>
          <span className="risk-summary-label">需复核条目</span>
        </div>
        <div className="risk-summary-value" style={{ color: '#8b5cf6' }}>
          {summary.reviewTotal}
        </div>
        <div className="risk-summary-sub">等待二次确认</div>
      </div>
    </div>
  );
}

function RiskFilterBar() {
  const { state, dispatch } = useApp();
  const { riskFilters, rooms, meetings, materials } = state;

  const personOptions = useMemo(() => {
    const set = new Set();
    materials.forEach(m => {
      if (m.personInCharge) set.add(m.personInCharge);
      if (m.followUpOwner) set.add(m.followUpOwner);
    });
    meetings.forEach(m => {
      if (m.personInCharge) set.add(m.personInCharge);
    });
    return Array.from(set).sort();
  }, [materials, meetings]);

  const riskLevelOptions = [
    { value: RISK_LEVEL.HIGH, label: RISK_LEVEL_LABELS.high, color: RISK_LEVEL_COLORS.high },
    { value: RISK_LEVEL.MEDIUM, label: RISK_LEVEL_LABELS.medium, color: RISK_LEVEL_COLORS.medium },
    { value: RISK_LEVEL.LOW, label: RISK_LEVEL_LABELS.low, color: RISK_LEVEL_COLORS.low },
  ];

  const handleDateChange = (field, value) => {
    dispatch({
      type: 'SET_RISK_FILTERS',
      payload: { dateRange: { ...riskFilters.dateRange, [field]: value } },
    });
  };

  const handleMultiChange = (field, value, checked) => {
    const current = riskFilters[field] || [];
    const next = checked ? [...current, value] : current.filter(v => v !== value);
    dispatch({ type: 'SET_RISK_FILTERS', payload: { [field]: next } });
  };

  const clearFilters = () => {
    dispatch({
      type: 'SET_RISK_FILTERS',
      payload: {
        dateRange: { start: '', end: '' },
        roomIds: [],
        personInCharges: [],
        meetingIds: [],
        riskLevels: [],
      },
    });
  };

  const hasActiveFilters =
    riskFilters.dateRange.start ||
    riskFilters.dateRange.end ||
    riskFilters.roomIds.length > 0 ||
    riskFilters.personInCharges.length > 0 ||
    riskFilters.meetingIds.length > 0 ||
    riskFilters.riskLevels.length > 0;

  return (
    <div className="risk-filter-bar">
      <div className="risk-filter-row">
        <div className="risk-filter-item">
          <span className="risk-filter-label">会议开始日期</span>
          <input
            type="date"
            value={riskFilters.dateRange.start}
            onChange={(e) => handleDateChange('start', e.target.value)}
          />
        </div>
        <div className="risk-filter-item">
          <span className="risk-filter-label">会议结束日期</span>
          <input
            type="date"
            value={riskFilters.dateRange.end}
            onChange={(e) => handleDateChange('end', e.target.value)}
          />
        </div>
        <div className="risk-filter-item">
          <span className="risk-filter-label">会议室</span>
          <select
            multiple
            value={riskFilters.roomIds.map(String)}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
              dispatch({ type: 'SET_RISK_FILTERS', payload: { roomIds: opts } });
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
        <div className="risk-filter-item">
          <span className="risk-filter-label">负责人</span>
          <select
            multiple
            value={riskFilters.personInCharges}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value);
              dispatch({ type: 'SET_RISK_FILTERS', payload: { personInCharges: opts } });
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
      <div className="risk-filter-row">
        <div className="risk-filter-item">
          <span className="risk-filter-label">会议</span>
          <select
            multiple
            value={riskFilters.meetingIds.map(String)}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
              dispatch({ type: 'SET_RISK_FILTERS', payload: { meetingIds: opts } });
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
        <div className="risk-filter-item">
          <span className="risk-filter-label">风险等级</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '4px 0' }}>
            {riskLevelOptions.map(opt => {
              const checked = riskFilters.riskLevels.includes(opt.value);
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
                    onChange={(e) => handleMultiChange('riskLevels', opt.value, e.target.checked)}
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
      <div className="risk-filter-actions">
        {hasActiveFilters && (
          <button className="btn btn-secondary" onClick={clearFilters}>
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}

function RiskFactorBadge({ factor }) {
  const colors = {
    [RISK_FACTOR_TYPE.SHORTAGE]: STATUS_COLORS.shortage,
    [RISK_FACTOR_TYPE.FOLLOW_UP_OVERDUE]: FOLLOW_UP_STATUS_COLORS.overdue,
    [RISK_FACTOR_TYPE.FOLLOW_UP_PENDING]: FOLLOW_UP_STATUS_COLORS.pending,
    [RISK_FACTOR_TYPE.REVIEW]: '#8b5cf6',
    [RISK_FACTOR_TYPE.HANDOVER_INCOMPLETE]: '#8b5cf6',
  };
  const icons = {
    [RISK_FACTOR_TYPE.SHORTAGE]: '📦',
    [RISK_FACTOR_TYPE.FOLLOW_UP_OVERDUE]: '⏰',
    [RISK_FACTOR_TYPE.FOLLOW_UP_PENDING]: '⏩',
    [RISK_FACTOR_TYPE.REVIEW]: '🔍',
    [RISK_FACTOR_TYPE.HANDOVER_INCOMPLETE]: '🤝',
  };
  const color = colors[factor.type] || '#64748b';
  const label = RISK_FACTOR_LABELS[factor.type] || factor.type;

  return (
    <span
      className="risk-factor-badge"
      style={{
        background: `${color}15`,
        color,
        borderColor: `${color}40`,
      }}
    >
      {icons[factor.type]} {label} {factor.qty ? `缺${factor.qty}` : factor.count}项
    </span>
  );
}

function RiskMeetingList() {
  const { state, dispatch, riskAnalysis } = useApp();
  const { selectedRiskMeetingId } = state;
  const { meetingsRisk } = riskAnalysis;

  if (meetingsRisk.length === 0) {
    return (
      <div className="risk-empty-state">
        <div className="risk-empty-icon">🎉</div>
        <div className="risk-empty-text">当前筛选范围内暂无风险会议</div>
        <div className="risk-empty-sub">所有会议物料准备状态良好，或尝试调整筛选条件</div>
      </div>
    );
  }

  return (
    <div className="risk-meeting-list">
      {meetingsRisk.map((risk) => {
        const { meeting, room, riskLevel, riskScore, completionRate, riskFactors, totalMaterials, readyCount } = risk;
        const isSelected = selectedRiskMeetingId === meeting.id;
        const riskColor = RISK_LEVEL_COLORS[riskLevel];
        const progressClass = completionRate >= 80 ? 'success' : completionRate >= 50 ? 'warning' : 'danger';

        return (
          <div
            key={meeting.id}
            className={`risk-meeting-card ${isSelected ? 'selected' : ''} risk-level-${riskLevel}`}
            onClick={() => dispatch({ type: 'SET_SELECTED_RISK_MEETING', payload: meeting.id })}
            style={{
              borderLeft: `4px solid ${riskColor}`,
            }}
          >
            <div className="risk-meeting-card-header">
              <div className="risk-meeting-title-row">
                <span className="risk-meeting-title">
                  {riskLevel !== RISK_LEVEL.NONE && (
                    <span
                      className="risk-level-badge"
                      style={{
                        background: `${riskColor}15`,
                        color: riskColor,
                        border: `1px solid ${riskColor}40`,
                      }}
                    >
                      {RISK_LEVEL_LABELS[riskLevel]} · {riskScore}分
                    </span>
                  )}
                  <span style={{ fontWeight: 600 }}>{meeting.title}</span>
                </span>
              </div>
              <div className="risk-meeting-meta">
                <span>📅 {meeting.date}</span>
                <span>⏰ {meeting.timeSlot}</span>
                <span>🏢 {room?.name || '未分配'}</span>
                <span>👤 {meeting.personInCharge}</span>
              </div>
            </div>

            <div className="risk-meeting-progress">
              <div className="risk-meeting-progress-header">
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  完成进度 {readyCount}/{totalMaterials} 项
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: progressClass === 'success' ? '#059669' : progressClass === 'warning' ? '#d97706' : '#dc2626' }}>
                  {completionRate}%
                </span>
              </div>
              <div className="progress-bar" style={{ height: '6px' }}>
                <div
                  className={`progress-fill ${progressClass}`}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {riskFactors.length > 0 && (
              <div className="risk-factors-wrap">
                {riskFactors.map((factor, idx) => (
                  <RiskFactorBadge key={idx} factor={factor} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SuggestedAction({ type, material, onViewDetail, onCreateHandover, onRectify }) {
  const actions = useMemo(() => {
    const result = [];
    const fStatus = getFollowUpStatus(material);

    if (material.preparedQty < material.requiredQty || material.status === MATERIAL_STATUS.SHORTAGE) {
      result.push({
        label: '补充短缺物料',
        desc: `缺口 ${material.requiredQty - material.preparedQty} 件，建议立即向仓库申请补充`,
        color: STATUS_COLORS.shortage,
        icon: '📦',
      });
    }

    if (fStatus === FOLLOW_UP_STATUS.OVERDUE) {
      result.push({
        label: '处理逾期跟进',
        desc: `跟进已逾期，请立即联系 ${material.followUpOwner || '相关责任人'} 处理`,
        color: FOLLOW_UP_STATUS_COLORS.overdue,
        icon: '⏰',
      });
    } else if (fStatus === FOLLOW_UP_STATUS.PENDING) {
      result.push({
        label: '推进跟进事项',
        desc: `跟进责任人：${material.followUpOwner || '未指定'}，预计完成：${material.followUpDueTime ? new Date(material.followUpDueTime).toLocaleString('zh-CN') : '未设置'}`,
        color: FOLLOW_UP_STATUS_COLORS.pending,
        icon: '⏩',
      });
    }

    if (material.status === MATERIAL_STATUS.REVIEW) {
      result.push({
        label: '完成复核确认',
        desc: '请再次核对物料数量、规格是否正确',
        color: '#8b5cf6',
        icon: '🔍',
      });
    }

    if (result.length === 0) {
      result.push({
        label: '状态正常',
        desc: '暂无需要处理的事项',
        color: '#10b981',
        icon: '✅',
      });
    }

    return result;
  }, [material]);

  return (
    <div className="suggested-action-list">
      {actions.map((action, idx) => (
        <div
          key={idx}
          className="suggested-action-item"
          style={{
            borderLeftColor: action.color,
            background: `${action.color}08`,
          }}
        >
          <div className="suggested-action-icon" style={{ color: action.color }}>
            {action.icon}
          </div>
          <div className="suggested-action-content">
            <div className="suggested-action-label" style={{ color: action.color }}>
              {action.label}
            </div>
            <div className="suggested-action-desc">{action.desc}</div>
          </div>
        </div>
      ))}
      <div className="material-detail-actions">
        <button
          className="btn btn-sm"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff',
            border: 'none',
          }}
          onClick={() => {
            if (typeof onRectify === 'function') {
              onRectify(material);
            }
          }}
        >
          🔧 去整改
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => onViewDetail(material)}
        >
          📋 查看详情
        </button>
        <button
          className="btn btn-sm"
          style={{
            background: '#ede9fe',
            color: '#6d28d9',
            border: '1px solid #ddd6fe',
          }}
          onClick={() => onCreateHandover(material)}
        >
          🤝 发起交接
        </button>
      </div>
    </div>
  );
}

function RiskMaterialItem({ material, category, onViewDetail, onCreateHandover, onRectify }) {
  const isShortage = material.preparedQty < material.requiredQty;
  const fStatus = getFollowUpStatus(material);
  const progress = material.requiredQty > 0
    ? Math.min(100, Math.round((material.preparedQty / material.requiredQty) * 100))
    : 0;

  return (
    <div className="risk-material-item">
      <div className="risk-material-header">
        <span className="risk-material-name">
          {category?.icon} {material.name}
          <span
            className="status-badge"
            style={{
              background: `${STATUS_COLORS[material.status]}15`,
              color: STATUS_COLORS[material.status],
              border: `1px solid ${STATUS_COLORS[material.status]}40`,
              marginLeft: '6px',
            }}
          >
            {STATUS_LABELS[material.status]}
          </span>
          {fStatus !== FOLLOW_UP_STATUS.NONE && (
            <span
              className="status-badge"
              style={{
                background: `${FOLLOW_UP_STATUS_COLORS[fStatus]}15`,
                color: FOLLOW_UP_STATUS_COLORS[fStatus],
                border: `1px solid ${FOLLOW_UP_STATUS_COLORS[fStatus]}40`,
                marginLeft: '4px',
              }}
            >
              {fStatus === FOLLOW_UP_STATUS.OVERDUE ? '⏰' : fStatus === FOLLOW_UP_STATUS.COMPLETED ? '✅' : '⏩'} {FOLLOW_UP_STATUS_LABELS[fStatus]}
            </span>
          )}
        </span>
        <span className={`risk-material-qty ${isShortage ? 'shortage' : 'ok'}`}>
          {material.preparedQty} / {material.requiredQty}
        </span>
      </div>

      <div className="progress-bar" style={{ height: '4px', margin: '6px 0 10px 0' }}>
        <div
          className={`progress-fill ${isShortage ? 'danger' : 'success'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {isShortage && (
        <div className="risk-material-shortage">
          ⚠️ 缺口 {material.requiredQty - material.preparedQty} 件
          {material.shortageNote && <span> · {material.shortageNote}</span>}
        </div>
      )}

      <div className="risk-material-meta">
        <span>👤 {material.personInCharge || '未分配'}</span>
        {material.followUpOwner && <span>⏩ 跟进: {material.followUpOwner}</span>}
        {material.followUpDueTime && (
          <span>
            📅 预计完成: {new Date(material.followUpDueTime).toLocaleString('zh-CN')}
          </span>
        )}
      </div>

      <SuggestedAction
        type="material"
        material={material}
        onViewDetail={onViewDetail}
        onCreateHandover={onCreateHandover}
        onRectify={onRectify}
      />
    </div>
  );
}

function RiskDetailPanel() {
  const { state, dispatch, riskAnalysis, createHandover, HANDOVER_SOURCE_TYPE } = useApp();
  const { selectedRiskMeetingId, riskMobileDetailExpanded, categories } = state;
  const { meetingsRisk } = riskAnalysis;

  const selectedRisk = useMemo(
    () => meetingsRisk.find(r => r.meetingId === selectedRiskMeetingId),
    [meetingsRisk, selectedRiskMeetingId]
  );

  const handleViewDetail = (material) => {
    dispatch({ type: 'SET_DETAIL_MATERIAL', payload: material });
    dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.MAIN });
  };

  const handleCreateHandover = async (material) => {
    const handoverId = await createHandover({
      sourceType: HANDOVER_SOURCE_TYPE.SELECTED,
      materialIds: [material.id],
      title: `风险交接 - ${material.name}`,
    });
    if (handoverId) {
      dispatch({ type: 'OPEN_HANDOVER_MODAL', payload: { handoverId } });
    }
  };

  const handleCreateHandoverAll = async () => {
    if (!selectedRisk) return;
    const materialIds = [
      ...selectedRisk.shortageMaterials,
      ...selectedRisk.overdueFollowUpMaterials,
      ...selectedRisk.pendingFollowUpMaterials,
      ...selectedRisk.reviewMaterials,
    ].map(m => m.id);
    const uniqueIds = [...new Set(materialIds)];
    if (uniqueIds.length === 0) return;
    const handoverId = await createHandover({
      sourceType: HANDOVER_SOURCE_TYPE.SELECTED,
      materialIds: uniqueIds,
      title: `风险交接 - ${selectedRisk.meeting.title}`,
    });
    if (handoverId) {
      dispatch({ type: 'OPEN_HANDOVER_MODAL', payload: { handoverId } });
    }
  };

  const handleRectify = (material) => {
    const meetingId = material.meetingId;
    dispatch({ type: 'SET_RECTIFICATION_FILTERS', payload: { meetingIds: [meetingId] } });
    dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.RECTIFICATION });
    setTimeout(() => {
      dispatch({ type: 'SET_SELECTED_RECTIFICATION_QUERY', payload: { materialId: material.id } });
    }, 50);
  };

  if (!selectedRisk) {
    return (
      <div className="risk-detail-panel">
        <div className="risk-detail-header">
          <span className="risk-detail-title">⚠️ 风险明细</span>
          <button
            className="collapse-toggle"
            onClick={() => dispatch({ type: 'TOGGLE_RISK_MOBILE_DETAIL' })}
          >
            {riskMobileDetailExpanded ? '▼ 收起' : '▶ 展开'}
          </button>
        </div>
        <div className={`risk-detail-body ${!riskMobileDetailExpanded ? 'collapsed' : ''}`}>
          <div className="risk-empty-state" style={{ padding: '60px 20px' }}>
            <div className="risk-empty-icon">👆</div>
            <div className="risk-empty-text">点击左侧列表查看风险明细</div>
            <div className="risk-empty-sub">选择一个风险会议以查看详细信息和建议处理方案</div>
          </div>
        </div>
      </div>
    );
  }

  const { meeting, room, riskLevel, riskFactors, riskScore, completionRate,
    shortageMaterials, overdueFollowUpMaterials, pendingFollowUpMaterials,
    reviewMaterials, handoverIncompleteItems, totalShortageQty,
    totalMaterials, readyCount } = selectedRisk;

  const riskColor = RISK_LEVEL_COLORS[riskLevel];

  const allRiskMaterials = [];
  const addedIds = new Set();

  const addMaterial = (m, tag) => {
    if (addedIds.has(m.id)) return;
    addedIds.add(m.id);
    allRiskMaterials.push({ material: m, tag });
  };

  shortageMaterials.forEach(m => addMaterial(m, 'shortage'));
  overdueFollowUpMaterials.forEach(m => addMaterial(m, 'overdue'));
  pendingFollowUpMaterials.forEach(m => addMaterial(m, 'pending'));
  reviewMaterials.forEach(m => addMaterial(m, 'review'));

  const sections = [
    {
      title: '物料短缺',
      icon: '📦',
      color: STATUS_COLORS.shortage,
      items: shortageMaterials,
      emptyText: '无短缺物料',
    },
    {
      title: '逾期跟进',
      icon: '⏰',
      color: FOLLOW_UP_STATUS_COLORS.overdue,
      items: overdueFollowUpMaterials,
      emptyText: '无逾期跟进',
    },
    {
      title: '待跟进事项',
      icon: '⏩',
      color: FOLLOW_UP_STATUS_COLORS.pending,
      items: pendingFollowUpMaterials,
      emptyText: '暂无待跟进',
    },
    {
      title: '需复核',
      icon: '🔍',
      color: '#8b5cf6',
      items: reviewMaterials,
      emptyText: '无需复核',
    },
  ];

  return (
    <div className="risk-detail-panel">
      <div className="risk-detail-header">
        <span className="risk-detail-title">
          ⚠️ {meeting.title}
          <span
            className="risk-level-badge"
            style={{
              background: `${riskColor}15`,
              color: riskColor,
              border: `1px solid ${riskColor}40`,
              marginLeft: '8px',
            }}
          >
            {RISK_LEVEL_LABELS[riskLevel]} · {riskScore}分
          </span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {allRiskMaterials.length > 0 && (
            <button
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                border: 'none',
              }}
              onClick={() => {
                dispatch({ type: 'SET_RECTIFICATION_FILTERS', payload: { meetingIds: [meeting.id] } });
                dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.RECTIFICATION });
              }}
            >
              🔧 整改此会议
            </button>
          )}
          {allRiskMaterials.length > 0 && (
            <button
              className="btn btn-sm btn-primary"
              onClick={handleCreateHandoverAll}
            >
              🤝 批量交接
            </button>
          )}
          <button
            className="collapse-toggle"
            onClick={() => dispatch({ type: 'TOGGLE_RISK_MOBILE_DETAIL' })}
          >
            {riskMobileDetailExpanded ? '▼ 收起' : '▶ 展开'}
          </button>
        </div>
      </div>

      <div className={`risk-detail-body ${!riskMobileDetailExpanded ? 'collapsed' : ''}`}>
        <div className="risk-detail-summary">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div className="risk-stat-mini">
              <span className="risk-stat-mini-label">会议日期</span>
              <span className="risk-stat-mini-value">📅 {meeting.date}</span>
            </div>
            <div className="risk-stat-mini">
              <span className="risk-stat-mini-label">时间段</span>
              <span className="risk-stat-mini-value">⏰ {meeting.timeSlot}</span>
            </div>
            <div className="risk-stat-mini">
              <span className="risk-stat-mini-label">会议室</span>
              <span className="risk-stat-mini-value">🏢 {room?.name || '未分配'}</span>
            </div>
            <div className="risk-stat-mini">
              <span className="risk-stat-mini-label">负责人</span>
              <span className="risk-stat-mini-value">👤 {meeting.personInCharge}</span>
            </div>
            <div className="risk-stat-mini">
              <span className="risk-stat-mini-label">物料完成</span>
              <span
                className="risk-stat-mini-value"
                style={{ color: completionRate >= 80 ? '#059669' : completionRate >= 50 ? '#d97706' : '#dc2626', fontWeight: 600 }}
              >
                ✅ {readyCount}/{totalMaterials} ({completionRate}%)
              </span>
            </div>
            {totalShortageQty > 0 && (
              <div className="risk-stat-mini">
                <span className="risk-stat-mini-label">总缺口数</span>
                <span className="risk-stat-mini-value" style={{ color: '#dc2626', fontWeight: 600 }}>
                  📦 缺 {totalShortageQty} 件
                </span>
              </div>
            )}
          </div>

          {riskFactors.length > 0 && (
            <>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                风险因素
              </div>
              <div className="risk-factors-wrap" style={{ marginBottom: '20px' }}>
                {riskFactors.map((factor, idx) => (
                  <RiskFactorBadge key={idx} factor={factor} />
                ))}
              </div>
            </>
          )}
        </div>

        {sections.map((section, sIdx) => (
          <div key={sIdx} className="risk-detail-section">
            <div
              className="risk-detail-section-header"
              style={{
                borderLeft: `3px solid ${section.color}`,
                background: `${section.color}08`,
              }}
            >
              <span style={{ color: section.color, fontWeight: 600 }}>
                {section.icon} {section.title}
              </span>
              <span
                className="risk-count-badge"
                style={{
                  background: `${section.color}15`,
                  color: section.color,
                }}
              >
                {section.items.length} 项
              </span>
            </div>
            <div className="risk-detail-section-body">
              {section.items.length === 0 ? (
                <div className="risk-section-empty">
                  <span style={{ color: '#94a3b8' }}>✓ {section.emptyText}</span>
                </div>
              ) : (
                <div className="risk-material-list">
                  {section.items.map(material => {
                    const category = categories.find(c => c.id === material.categoryId);
                    return (
                      <RiskMaterialItem
                        key={material.id}
                        material={material}
                        category={category}
                        onViewDetail={handleViewDetail}
                        onCreateHandover={handleCreateHandover}
                        onRectify={handleRectify}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {handoverIncompleteItems.length > 0 && (
          <div className="risk-detail-section">
            <div
              className="risk-detail-section-header"
              style={{
                borderLeft: '3px solid #8b5cf6',
                background: 'rgba(139, 92, 246, 0.08)',
              }}
            >
              <span style={{ color: '#8b5cf6', fontWeight: 600 }}>
                🤝 交接未完成
              </span>
              <span
                className="risk-count-badge"
                style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#8b5cf6',
                }}
              >
                {handoverIncompleteItems.length} 项
              </span>
            </div>
            <div className="risk-detail-section-body">
              <div className="risk-handover-list">
                {handoverIncompleteItems.map((item, idx) => {
                  const { handover, material, handoverItem } = item;
                  const hStatus = handover.status;
                  return (
                    <div key={idx} className="risk-handover-item">
                      <div className="risk-handover-header">
                        <span className="risk-handover-title">
                          📋 {handover.title}
                          <span
                            className="status-badge"
                            style={{
                              background: `${HANDOVER_STATUS_COLORS[hStatus]}15`,
                              color: HANDOVER_STATUS_COLORS[hStatus],
                              border: `1px solid ${HANDOVER_STATUS_COLORS[hStatus]}40`,
                              marginLeft: '6px',
                            }}
                          >
                            {HANDOVER_STATUS_LABELS[hStatus]}
                          </span>
                        </span>
                      </div>
                      <div className="risk-handover-meta">
                        <span>📦 {material.name}</span>
                        <span>👤 交接: {handover.handoverPerson || '未指定'}</span>
                        <span>🎯 接收: {handover.receiverPerson || '未指定'}</span>
                        <span>
                          ⏰ {handover.handoverTime
                            ? new Date(handover.handoverTime).toLocaleString('zh-CN')
                            : '未设置时间'}
                        </span>
                      </div>
                      <div className="risk-handover-actions">
                        <button
                          className="btn btn-sm"
                          style={{
                            background: '#ede9fe',
                            color: '#6d28d9',
                            border: '1px solid #ddd6fe',
                          }}
                          onClick={() => dispatch({
                            type: 'OPEN_HANDOVER_MODAL',
                            payload: { handoverId: handover.id },
                          })}
                        >
                          🤝 继续交接
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleViewDetail(material)}
                        >
                          📋 查看物料
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RiskDashboard() {
  const { dispatch, riskAnalysis, rectificationSummary } = useApp();
  const { summary } = riskAnalysis;
  const rectPendingTotal = (rectificationSummary?.byStatus?.pending || 0) +
    (rectificationSummary?.byStatus?.in_progress || 0) +
    (rectificationSummary?.byStatus?.pending_review || 0);

  return (
    <div className="risk-dashboard">
      <div className="risk-dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.MAIN })}
          >
            ← 返回物料管理
          </button>
          <h2 className="risk-dashboard-title">
            ⚠️ 会前风险预警看板
            <span
              className="risk-dashboard-subtitle"
              style={{ marginLeft: '12px' }}
            >
              共 {summary.totalMeetings} 场会议，{summary.riskMeetingsCount} 场存在风险
            </span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn"
            style={{
              background: rectPendingTotal > 0
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : '#fffbeb',
              color: rectPendingTotal > 0 ? '#fff' : '#92400e',
              border: rectPendingTotal > 0 ? 'none' : '1px solid #fde68a',
            }}
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.RECTIFICATION })}
            title="前往整改闭环中心处理异常事项"
          >
            🔧 去整改闭环
            {rectPendingTotal > 0 && (
              <span
                style={{
                  marginLeft: '6px',
                  padding: '1px 8px',
                  borderRadius: '10px',
                  background: rectPendingTotal > 0 ? 'rgba(255,255,255,0.25)' : '#fef3c7',
                  color: rectPendingTotal > 0 ? '#fff' : '#92400e',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
              >
                {rectPendingTotal}待处理
              </span>
            )}
          </button>
        </div>
      </div>

      <RiskSummaryCards />

      <RiskFilterBar />

      <div className="risk-content-grid">
        <div className="risk-list-col">
          <div className="risk-col-header">
            <span>📋 风险会议列表</span>
            <span className="risk-col-header-count">
              共 {summary.riskMeetingsCount} 场有风险
            </span>
          </div>
          <RiskMeetingList />
        </div>
        <div className="risk-detail-col">
          <RiskDetailPanel />
        </div>
      </div>
    </div>
  );
}
