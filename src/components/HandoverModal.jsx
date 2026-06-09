import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  STATUS_LABELS, STATUS_COLORS, MATERIAL_STATUS,
  HANDOVER_STATUS, HANDOVER_STATUS_LABELS, HANDOVER_STATUS_COLORS,
  HANDOVER_SOURCE_TYPE, getLocalDatetimeLocal,
} from '../db';

export default function HandoverModal() {
  const {
    state, dispatch, currentHandover,
    updateHandover, updateHandoverItem, bulkConfirmHandoverItems,
    deleteHandover, createHandover, state: { rooms, meetings, categories, handoverSourceType },
  } = useApp();

  const { showHandoverModal, handoverSourceType: stateSourceType } = state;
  const [activeTab, setActiveTab] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const [editingItemId, setEditingItemId] = useState(null);
  const [localForm, setLocalForm] = useState({});

  const isCreating = !currentHandover && showHandoverModal;

  useEffect(() => {
    if (currentHandover?.handover) {
      setLocalForm({
        title: currentHandover.handover.title || '',
        handoverTime: currentHandover.handover.handoverTime || '',
        handoverPerson: currentHandover.handover.handoverPerson || '',
        receiverPerson: currentHandover.handover.receiverPerson || '',
        remark: currentHandover.handover.remark || '',
      });
    } else if (isCreating) {
      setLocalForm({
        title: `会前交接清单 - ${new Date().toLocaleDateString('zh-CN')}`,
        handoverTime: getLocalDatetimeLocal(),
        handoverPerson: '',
        receiverPerson: '',
        remark: '',
      });
    }
  }, [currentHandover?.handover?.id, isCreating]);

  const handleClose = () => {
    dispatch({ type: 'CLOSE_HANDOVER_MODAL' });
    setActiveTab('all');
    setEditingItemId(null);
  };

  const getRoomName = (id) => rooms.find(r => r.id === id)?.name || '未知';
  const getMeetingInfo = (id) => meetings.find(m => m.id === id);
  const getCategoryInfo = (id) => categories.find(c => c.id === id) || { name: '', icon: '📦' };

  const items = currentHandover?.items || [];
  const handover = currentHandover?.handover;

  const groupedByRoom = useMemo(() => {
    const groups = {};
    items.forEach(item => {
      const m = item.material;
      const key = m.roomId;
      if (!groups[key]) {
        groups[key] = { key, label: getRoomName(key), items: [] };
      }
      groups[key].items.push(item);
    });
    return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
  }, [items, rooms]);

  const groupedByMeeting = useMemo(() => {
    const groups = {};
    items.forEach(item => {
      const m = item.material;
      const meeting = getMeetingInfo(m.meetingId);
      const key = m.meetingId || 'none';
      if (!groups[key]) {
        groups[key] = {
          key,
          label: meeting ? meeting.title : '未关联会议',
          subLabel: meeting ? `${meeting.date} ${meeting.timeSlot}` : '',
          items: [],
        };
      }
      groups[key].items.push(item);
    });
    return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
  }, [items, meetings]);

  const groupedByPerson = useMemo(() => {
    const groups = {};
    items.forEach(item => {
      const m = item.material;
      const key = m.personInCharge || '未分配';
      if (!groups[key]) {
        groups[key] = { key, label: key, items: [] };
      }
      groups[key].items.push(item);
    });
    return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const confirmed = items.filter(i => i.confirmed).length;
    const followUp = items.filter(i => i.followUp).length;
    const shortage = items.filter(i => {
      const m = i.material;
      return m.preparedQty < m.requiredQty || m.status === MATERIAL_STATUS.SHORTAGE;
    }).length;
    const review = items.filter(i => i.material.status === MATERIAL_STATUS.REVIEW).length;
    const notReady = items.filter(i => {
      const m = i.material;
      return m.status !== MATERIAL_STATUS.READY || m.preparedQty < m.requiredQty;
    }).length;
    return { total, confirmed, followUp, shortage, review, notReady, unconfirmed: total - confirmed };
  }, [items]);

  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case 'shortage':
        return items.filter(i => i.material.preparedQty < i.material.requiredQty || i.material.status === MATERIAL_STATUS.SHORTAGE);
      case 'review':
        return items.filter(i => i.material.status === MATERIAL_STATUS.REVIEW);
      case 'notready':
        return items.filter(i => i.material.status !== MATERIAL_STATUS.READY || i.material.preparedQty < i.material.requiredQty);
      case 'unconfirmed':
        return items.filter(i => !i.confirmed);
      case 'followup':
        return items.filter(i => i.followUp);
      default:
        return items;
    }
  }, [activeTab, items]);

  const tabs = [
    { key: 'all', label: '全部', count: stats.total, color: '#64748b' },
    { key: 'shortage', label: '短缺', count: stats.shortage, color: '#ef4444' },
    { key: 'review', label: '需复核', count: stats.review, color: '#8b5cf6' },
    { key: 'notready', label: '未备齐', count: stats.notReady, color: '#f59e0b' },
    { key: 'unconfirmed', label: '待确认', count: stats.unconfirmed, color: '#3b82f6' },
    { key: 'followup', label: '需跟进', count: stats.followUp, color: '#ec4899' },
  ];

  const computeGroupStats = (groupItems) => {
    const total = groupItems.length;
    const confirmed = groupItems.filter(i => i.confirmed).length;
    const shortage = groupItems.filter(i => {
      const m = i.material;
      return m.preparedQty < m.requiredQty || m.status === MATERIAL_STATUS.SHORTAGE;
    }).length;
    const review = groupItems.filter(i => i.material.status === MATERIAL_STATUS.REVIEW).length;
    const followUp = groupItems.filter(i => i.followUp).length;
    return { total, confirmed, shortage, review, followUp };
  };

  const toggleGroup = (key) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleFormChange = (field, value) => {
    setLocalForm(prev => ({ ...prev, [field]: value }));
  };

  const saveForm = async () => {
    if (!handover) return;
    await updateHandover(handover.id, localForm);
  };

  const handleStatusChange = async (newStatus) => {
    if (!handover) return;
    await updateHandover(handover.id, { status: newStatus });
  };

  const handleConfirm = async (item, confirmed) => {
    await updateHandoverItem(item.id, { confirmed });
  };

  const handleFollowUp = async (itemId, followUp) => {
    await updateHandoverItem(itemId, { followUp });
  };

  const handleRemarkChange = async (itemId, itemRemark) => {
    await updateHandoverItem(itemId, { itemRemark });
  };

  const handleQtyChange = async (itemId, qty) => {
    await updateHandoverItem(itemId, { confirmedPreparedQty: qty }, true);
  };

  const handleBulkConfirm = async (itemIds, confirmed) => {
    if (itemIds.length === 0) return;
    await bulkConfirmHandoverItems(itemIds, confirmed);
  };

  const handleDelete = async () => {
    if (!handover) return;
    if (!confirm(`确定要删除交接清单「${handover.title}」吗？`)) return;
    await deleteHandover(handover.id);
    handleClose();
  };

  const progressPercent = stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0;
  const progressClass = progressPercent === 100 ? 'success' : progressPercent >= 60 ? 'warning' : 'danger';

  if (!showHandoverModal) return null;

  const handleConfirmAndStart = async () => {
    const result = await createHandover({
      sourceType: stateSourceType,
      ...localForm,
    });
    if (!result) {
      alert('无法创建交接清单，请确保有物料数据');
      handleClose();
    }
  };

  return (
    <div className="modal-overlay handover-modal-overlay" onClick={handleClose}>
      <div
        className="modal handover-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header handover-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <div style={{ minWidth: 0 }}>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isCreating ? '新建交接清单' : (
                  <input
                    className="handover-title-input"
                    value={localForm.title || ''}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    onBlur={saveForm}
                    placeholder="请输入清单标题"
                    style={{ width: '100%' }}
                  />
                )}
                {handover && (
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      background: `${HANDOVER_STATUS_COLORS[handover.status]}15`,
                      color: HANDOVER_STATUS_COLORS[handover.status],
                      border: `1px solid ${HANDOVER_STATUS_COLORS[handover.status]}40`,
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {HANDOVER_STATUS_LABELS[handover.status]}
                  </span>
                )}
              </div>
              {handover && (
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  创建于 {new Date(handover.createdAt).toLocaleString('zh-CN')}
                  {handover.sourceType && (
                    <span style={{ marginLeft: '8px' }}>
                      来源：{handover.sourceType === HANDOVER_SOURCE_TYPE.SELECTED ? '已选物料' : '筛选结果'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        {isCreating ? (
          <div className="modal-body">
            <div className="handover-create-intro">
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📝</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>
                确认创建交接清单
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                将从{stateSourceType === HANDOVER_SOURCE_TYPE.SELECTED ? '已勾选物料' : '当前筛选结果'}创建交接清单
              </div>
              <div className="handover-create-form">
                <div className="form-group">
                  <label className="form-label">清单标题</label>
                  <input
                    className="form-input"
                    value={localForm.title || ''}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    placeholder={`会前交接清单 - ${new Date().toLocaleDateString('zh-CN')}`}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">交接时间</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={localForm.handoverTime || ''}
                      onChange={(e) => handleFormChange('handoverTime', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">交接人</label>
                    <input
                      className="form-input"
                      value={localForm.handoverPerson || ''}
                      onChange={(e) => handleFormChange('handoverPerson', e.target.value)}
                      placeholder="请输入交接人姓名"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">接收人</label>
                  <input
                    className="form-input"
                    value={localForm.receiverPerson || ''}
                    onChange={(e) => handleFormChange('receiverPerson', e.target.value)}
                    placeholder="请输入接收人姓名"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">备注</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={localForm.remark || ''}
                    onChange={(e) => handleFormChange('remark', e.target.value)}
                    placeholder="交接注意事项、特殊说明等..."
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="handover-modal-body">
              <div className="handover-info-panel">
                <div className="handover-info-grid">
                  <div className="handover-info-field">
                    <span className="handover-info-label">交接时间</span>
                    <input
                      type="datetime-local"
                      className="form-input handover-info-input"
                      value={localForm.handoverTime || ''}
                      onChange={(e) => handleFormChange('handoverTime', e.target.value)}
                      onBlur={saveForm}
                    />
                  </div>
                  <div className="handover-info-field">
                    <span className="handover-info-label">交接人</span>
                    <input
                      className="form-input handover-info-input"
                      value={localForm.handoverPerson || ''}
                      onChange={(e) => handleFormChange('handoverPerson', e.target.value)}
                      onBlur={saveForm}
                      placeholder="请输入"
                    />
                  </div>
                  <div className="handover-info-field">
                    <span className="handover-info-label">接收人</span>
                    <input
                      className="form-input handover-info-input"
                      value={localForm.receiverPerson || ''}
                      onChange={(e) => handleFormChange('receiverPerson', e.target.value)}
                      onBlur={saveForm}
                      placeholder="请输入"
                    />
                  </div>
                  <div className="handover-info-field">
                    <span className="handover-info-label">清单状态</span>
                    <select
                      className="form-input handover-info-input"
                      value={handover?.status || HANDOVER_STATUS.DRAFT}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      style={{
                        borderColor: `${HANDOVER_STATUS_COLORS[handover?.status]}40`,
                        background: `${HANDOVER_STATUS_COLORS[handover?.status]}08`,
                        color: HANDOVER_STATUS_COLORS[handover?.status],
                        fontWeight: '500',
                      }}
                    >
                      {Object.entries(HANDOVER_STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v} style={{ color: '#1e293b' }}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="handover-info-field" style={{ gridColumn: '1 / -1' }}>
                  <span className="handover-info-label">交接备注</span>
                  <textarea
                    className="form-input handover-info-input"
                    rows="2"
                    value={localForm.remark || ''}
                    onChange={(e) => handleFormChange('remark', e.target.value)}
                    onBlur={saveForm}
                    placeholder="交接注意事项、特殊说明等..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="handover-progress-card">
                  <div className="handover-progress-header">
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>交接进度</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      {stats.confirmed}/{stats.total} 已确认 ({progressPercent}%)
                    </div>
                  </div>
                  <div className="progress-bar" style={{ height: '10px', marginTop: '10px' }}>
                    <div
                      className={`progress-fill ${progressClass}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="handover-stats-grid">
                    <div className="handover-stat-item">
                      <div className="handover-stat-value" style={{ color: '#ef4444' }}>{stats.shortage}</div>
                      <div className="handover-stat-label">短缺项</div>
                    </div>
                    <div className="handover-stat-item">
                      <div className="handover-stat-value" style={{ color: '#8b5cf6' }}>{stats.review}</div>
                      <div className="handover-stat-label">需复核</div>
                    </div>
                    <div className="handover-stat-item">
                      <div className="handover-stat-value" style={{ color: '#f59e0b' }}>{stats.notReady}</div>
                      <div className="handover-stat-label">未备齐</div>
                    </div>
                    <div className="handover-stat-item">
                      <div className="handover-stat-value" style={{ color: '#ec4899' }}>{stats.followUp}</div>
                      <div className="handover-stat-label">需跟进</div>
                    </div>
                  </div>
                </div>

                <div className="handover-actions-bar">
                  <button
                    className="btn btn-sm btn-success"
                    disabled={stats.unconfirmed === 0}
                    onClick={() => handleBulkConfirm(
                      items.filter(i => !i.confirmed).map(i => i.id), true
                    )}
                  >
                    ✅ 一键确认全部
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    disabled={stats.confirmed === 0}
                    onClick={() => handleBulkConfirm(
                      items.filter(i => i.confirmed).map(i => i.id), false
                    )}
                  >
                    ↩️ 取消全部确认
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={handleDelete}
                    style={{ marginLeft: 'auto' }}
                  >
                    🗑️ 删除清单
                  </button>
                </div>
              </div>

              <div className="handover-content-panel">
                <div className="handover-tabs">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      className={`handover-tab ${activeTab === tab.key ? 'active' : ''}`}
                      style={{
                        '--tab-color': tab.color,
                        borderBottomColor: activeTab === tab.key ? tab.color : 'transparent',
                      }}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <span>{tab.label}</span>
                      {tab.count > 0 && (
                        <span
                          className="handover-tab-badge"
                          style={{
                            background: activeTab === tab.key ? `${tab.color}20` : '#f1f5f9',
                            color: activeTab === tab.key ? tab.color : '#64748b',
                          }}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="handover-groups-wrap">
                  {filteredItems.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                      <div className="empty-state-icon">🎉</div>
                      <div className="empty-state-text">
                        {activeTab === 'all' ? '暂无物料' :
                          activeTab === 'shortage' ? '没有短缺的物料，太棒了！' :
                          activeTab === 'review' ? '没有需要复核的物料' :
                          activeTab === 'notready' ? '所有物料均已备齐！' :
                          activeTab === 'unconfirmed' ? '所有物料均已确认！' :
                          '没有需要跟进的物料'}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="handover-group-title">
                        <span>🏢 按会议室汇总</span>
                      </div>
                      {groupedByRoom.map(group => {
                        const gItems = group.items.filter(i => filteredItems.some(f => f.id === i.id));
                        if (gItems.length === 0) return null;
                        const gStats = computeGroupStats(gItems);
                        const key = `room-${group.key}`;
                        const expanded = expandedGroups.has(key);
                        return (
                          <div key={key} className="handover-group">
                            <div
                              className="handover-group-header"
                              onClick={() => toggleGroup(key)}
                            >
                              <div className="handover-group-header-left">
                                <span className={`group-toggle-icon ${expanded ? 'expanded' : ''}`}>▶</span>
                                <span className="handover-group-name">{group.label}</span>
                                <span className="handover-group-count">{gItems.length} 项</span>
                              </div>
                              <div className="handover-group-header-right">
                                <span className="handover-group-stat" style={{ color: '#10b981' }}>✓ {gStats.confirmed}</span>
                                {gStats.shortage > 0 && (
                                  <span className="handover-group-stat" style={{ color: '#ef4444' }}>⚠ {gStats.shortage}</span>
                                )}
                                {gStats.review > 0 && (
                                  <span className="handover-group-stat" style={{ color: '#8b5cf6' }}>🔍 {gStats.review}</span>
                                )}
                                {gStats.followUp > 0 && (
                                  <span className="handover-group-stat" style={{ color: '#ec4899' }}>⏩ {gStats.followUp}</span>
                                )}
                              </div>
                            </div>
                            {expanded && (
                              <div className="handover-items">
                                {gItems.map(item => renderItem(item))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="handover-group-title" style={{ marginTop: '16px' }}>
                        <span>📅 按会议汇总</span>
                      </div>
                      {groupedByMeeting.map(group => {
                        const gItems = group.items.filter(i => filteredItems.some(f => f.id === i.id));
                        if (gItems.length === 0) return null;
                        const gStats = computeGroupStats(gItems);
                        const key = `meeting-${group.key}`;
                        const expanded = expandedGroups.has(key);
                        return (
                          <div key={key} className="handover-group">
                            <div
                              className="handover-group-header"
                              onClick={() => toggleGroup(key)}
                            >
                              <div className="handover-group-header-left">
                                <span className={`group-toggle-icon ${expanded ? 'expanded' : ''}`}>▶</span>
                                <span className="handover-group-name">{group.label}</span>
                                {group.subLabel && (
                                  <span className="handover-group-sublabel">{group.subLabel}</span>
                                )}
                                <span className="handover-group-count">{gItems.length} 项</span>
                              </div>
                              <div className="handover-group-header-right">
                                <span className="handover-group-stat" style={{ color: '#10b981' }}>✓ {gStats.confirmed}</span>
                                {gStats.shortage > 0 && (
                                  <span className="handover-group-stat" style={{ color: '#ef4444' }}>⚠ {gStats.shortage}</span>
                                )}
                              </div>
                            </div>
                            {expanded && (
                              <div className="handover-items">
                                {gItems.map(item => renderItem(item))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="handover-group-title" style={{ marginTop: '16px' }}>
                        <span>👤 按负责人汇总</span>
                      </div>
                      {groupedByPerson.map(group => {
                        const gItems = group.items.filter(i => filteredItems.some(f => f.id === i.id));
                        if (gItems.length === 0) return null;
                        const gStats = computeGroupStats(gItems);
                        const key = `person-${group.key}`;
                        const expanded = expandedGroups.has(key);
                        return (
                          <div key={key} className="handover-group">
                            <div
                              className="handover-group-header"
                              onClick={() => toggleGroup(key)}
                            >
                              <div className="handover-group-header-left">
                                <span className={`group-toggle-icon ${expanded ? 'expanded' : ''}`}>▶</span>
                                <span className="handover-group-name">{group.label}</span>
                                <span className="handover-group-count">{gItems.length} 项</span>
                              </div>
                              <div className="handover-group-header-right">
                                <span className="handover-group-stat" style={{ color: '#10b981' }}>✓ {gStats.confirmed}</span>
                                {gStats.shortage > 0 && (
                                  <span className="handover-group-stat" style={{ color: '#ef4444' }}>⚠ {gStats.shortage}</span>
                                )}
                              </div>
                            </div>
                            {expanded && (
                              <div className="handover-items">
                                {gItems.map(item => renderItem(item))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="modal-footer handover-modal-footer">
          {isCreating ? (
            <>
              <button className="btn btn-secondary" onClick={handleClose}>取消</button>
              <button className="btn btn-primary" onClick={handleConfirmAndStart}>
                ✨ 创建并开始交接
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: '12px', color: '#94a3b8', marginRight: 'auto' }}>
                💡 物料确认后的状态和数量会同步到主列表
              </span>
              <button className="btn btn-secondary" onClick={handleClose}>关闭</button>
              <button
                className="btn btn-success"
                disabled={stats.unconfirmed > 0 || handover?.status === HANDOVER_STATUS.COMPLETED}
                onClick={() => handleStatusChange(HANDOVER_STATUS.COMPLETED)}
              >
                🎉 完成交接
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  function renderItem(item) {
    const m = item.material;
    const cat = getCategoryInfo(m.categoryId);
    const meeting = getMeetingInfo(m.meetingId);
    const isShortage = m.preparedQty < m.requiredQty || m.status === MATERIAL_STATUS.SHORTAGE;
    const isReview = m.status === MATERIAL_STATUS.REVIEW;
    const isNotReady = m.status !== MATERIAL_STATUS.READY || m.preparedQty < m.requiredQty;
    const highlightClass = isShortage ? 'highlight-shortage' : isReview ? 'highlight-review' : isNotReady ? 'highlight-notready' : '';

    return (
      <div
        key={item.id}
        className={`handover-item ${item.confirmed ? 'confirmed' : ''} ${highlightClass} ${item.followUp ? 'follow-up' : ''}`}
      >
        <div className="handover-item-main">
          <label className="handover-checkbox-wrap" style={{ flexShrink: 0 }}>
            <input
              type="checkbox"
              className="checkbox"
              checked={item.confirmed}
              onChange={(e) => handleConfirm(item, e.target.checked)}
            />
            <span className="handover-checkbox-custom" />
          </label>

          <div className="handover-item-info" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span className="category-tag" style={{ fontSize: '11px' }}>
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </span>
              <span className="handover-item-name">{m.name}</span>
              {item.followUp && (
                <span className="handover-followup-badge">⏩ 跟进中</span>
              )}
            </div>
            <div className="handover-item-meta hide-desktop">
              <span>🏢 {getRoomName(m.roomId)}</span>
              {meeting && <span>📅 {meeting.title}</span>}
              <span>👤 {m.personInCharge || '未分配'}</span>
            </div>
          </div>

          <div className="handover-item-qty hide-mobile" style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              <input
                type="number"
                min="0"
                className="qty-input"
                style={{ width: '56px', padding: '4px 6px', fontSize: '12px' }}
                value={item.confirmedPreparedQty}
                onChange={(e) => handleQtyChange(item.id, Number(e.target.value) || 0)}
                onClick={(e) => e.stopPropagation()}
              />
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>/</span>
              <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500', minWidth: '24px' }}>{m.requiredQty}</span>
              {m.preparedQty < m.requiredQty && (
                <span className="qty-shortage" style={{ fontSize: '11px' }}>
                  -{m.requiredQty - (item.confirmedPreparedQty ?? m.preparedQty)}
                </span>
              )}
            </div>
          </div>

          <div className="handover-item-status hide-mobile" style={{ flexShrink: 0 }}>
            <span
              className="status-badge"
              style={{
                background: `${STATUS_COLORS[m.status]}15`,
                color: STATUS_COLORS[m.status],
                border: `1px solid ${STATUS_COLORS[m.status]}40`,
              }}
            >
              {STATUS_LABELS[m.status]}
            </span>
          </div>

          <div className="handover-item-actions" style={{ flexShrink: 0, display: 'flex', gap: '4px' }}>
            <button
              className={`icon-btn ${item.followUp ? 'active' : ''}`}
              title={item.followUp ? '取消跟进' : '标记需跟进'}
              onClick={() => handleFollowUp(item.id, !item.followUp)}
              style={{
                background: item.followUp ? '#fdf2f8' : 'transparent',
                color: item.followUp ? '#ec4899' : '#64748b',
              }}
            >
              ⏩
            </button>
            <button
              className="icon-btn"
              title={editingItemId === item.id ? '收起备注' : '补充备注'}
              onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
              style={{ color: item.itemRemark ? '#3b82f6' : '#64748b' }}
            >
              💬
            </button>
            <button
              className="icon-btn"
              title={item.confirmed ? '取消确认' : '确认备齐'}
              onClick={() => handleConfirm(item, !item.confirmed)}
              style={{
                background: item.confirmed ? '#ecfdf5' : 'transparent',
                color: item.confirmed ? '#10b981' : '#64748b',
              }}
            >
              {item.confirmed ? '✅' : '⬜'}
            </button>
          </div>
        </div>

        <div className="handover-item-details">
          <div className="handover-item-meta-row hide-mobile">
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              🏢 {getRoomName(m.roomId)}
            </span>
            {meeting && (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                📅 {meeting.title} · {meeting.date} {meeting.timeSlot}
              </span>
            )}
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              👤 {m.personInCharge || '未分配'}
            </span>
            {m.batch && (
              <span style={{ fontSize: '12px', color: '#8b5cf6' }}>
                📦 {m.batch}
              </span>
            )}
          </div>

          <div className="handover-item-qty-row hide-desktop">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>数量：</span>
              <input
                type="number"
                min="0"
                className="qty-input"
                style={{ width: '60px', padding: '4px 6px', fontSize: '12px' }}
                value={item.confirmedPreparedQty}
                onChange={(e) => handleQtyChange(item.id, Number(e.target.value) || 0)}
              />
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>/ {m.requiredQty}</span>
              <span
                className="status-badge"
                style={{
                  background: `${STATUS_COLORS[m.status]}15`,
                  color: STATUS_COLORS[m.status],
                  border: `1px solid ${STATUS_COLORS[m.status]}40`,
                  fontSize: '11px',
                  marginLeft: '8px',
                }}
              >
                {STATUS_LABELS[m.status]}
              </span>
            </div>
          </div>

          {(editingItemId === item.id || item.itemRemark || m.shortageNote) && (
            <div className="handover-item-remark-wrap">
              {m.shortageNote && (
                <div className="handover-item-shortage-note">
                  <span>⚠️</span>
                  <span>{m.shortageNote}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>💬</span>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="补充交接备注、处理情况..."
                  value={item.itemRemark || ''}
                  onChange={(e) => handleRemarkChange(item.id, e.target.value)}
                  style={{
                    fontSize: '12px',
                    padding: '6px 10px',
                    background: editingItemId === item.id ? '#f8fafc' : '#fafafa',
                    minHeight: editingItemId === item.id ? '60px' : '36px',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}
