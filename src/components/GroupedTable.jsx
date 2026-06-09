import React, { useState, useMemo, useCallback } from 'react';
import { useApp, GROUP_BY } from '../context/AppContext';
import { STATUS_LABELS, STATUS_COLORS, MATERIAL_STATUS, HANDOVER_SOURCE_TYPE } from '../db';
import AddMaterialModal from './AddMaterialModal';
import MoveMaterialModal from './MoveMaterialModal';

export default function GroupedTable() {
  const {
    state,
    dispatch,
    groupedMaterials,
    updateMaterialField,
    bulkUpdateStatus,
    deleteMaterials,
    filteredMaterials,
  } = useApp();

  const { groupBy, selectedMaterialIds, categories, meetings, rooms, reviewMode } = state;
  const [expandedGroups, setExpandedGroups] = useState(() => new Set(groupedMaterials.map(g => g.key)));
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [addDefaults, setAddDefaults] = useState({});

  const toggleGroup = useCallback((key) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const visibleIds = useMemo(
    () => new Set(filteredMaterials.map(m => m.id)),
    [filteredMaterials]
  );

  const visibleSelectedIds = useMemo(
    () => selectedMaterialIds.filter(id => visibleIds.has(id)),
    [selectedMaterialIds, visibleIds]
  );

  const allVisibleSelected =
    filteredMaterials.length > 0 && visibleSelectedIds.length === filteredMaterials.length;

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const remaining = selectedMaterialIds.filter(id => !visibleIds.has(id));
      dispatch({ type: 'SET_SELECTED_MATERIALS', payload: remaining });
    } else {
      const merged = Array.from(new Set([...selectedMaterialIds, ...filteredMaterials.map(m => m.id)]));
      dispatch({ type: 'SET_SELECTED_MATERIALS', payload: merged });
    }
  };

  const handleRowClick = (material, e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
      return;
    }
    dispatch({ type: 'SET_DETAIL_MATERIAL', payload: material });
  };

  const getCategoryInfo = (catId) => categories.find(c => c.id === catId) || { name: '', icon: '📦' };
  const getRoomInfo = (roomId) => rooms.find(r => r.id === roomId) || { name: '未知' };
  const getMeetingInfo = (meetingId) => meetings.find(m => m.id === meetingId);

  const computeGroupStats = (items) => {
    const total = items.length;
    const totalReq = items.reduce((s, m) => s + m.requiredQty, 0);
    const totalPrep = items.reduce((s, m) => s + Math.min(m.preparedQty, m.requiredQty), 0);
    const readyCount = items.filter(m => m.status === MATERIAL_STATUS.READY && m.preparedQty >= m.requiredQty).length;
    const shortageCount = items.filter(m => m.preparedQty < m.requiredQty || m.status === MATERIAL_STATUS.SHORTAGE).length;
    const reviewCount = items.filter(m => m.status === MATERIAL_STATUS.REVIEW).length;
    return { total, totalReq, totalPrep, readyCount, shortageCount, reviewCount };
  };

  const getStatusBadge = (status, shortage) => {
    let finalStatus = status;
    if (shortage && status === MATERIAL_STATUS.READY) finalStatus = MATERIAL_STATUS.SHORTAGE;
    return (
      <span
        className="status-badge"
        style={{
          background: `${STATUS_COLORS[finalStatus]}15`,
          color: STATUS_COLORS[finalStatus],
          border: `1px solid ${STATUS_COLORS[finalStatus]}40`,
        }}
      >
        {STATUS_LABELS[finalStatus]}
      </span>
    );
  };

  const handleDelete = async (ids) => {
    if (ids.length === 0) return;
    if (!confirm(`确定要删除选中的 ${ids.length} 条物料记录吗？`)) return;
    await deleteMaterials(ids);
  };

  const openAddInGroup = (group) => {
    const defaults = {};
    const firstItem = group.items[0];
    if (groupBy === GROUP_BY.ROOM) {
      defaults.roomId = group.key;
      if (firstItem) {
        defaults.meetingId = firstItem.meetingId;
      }
    } else if (groupBy === GROUP_BY.BATCH) {
      defaults.batch = group.key;
      if (firstItem) {
        const matchedMeeting = meetings.find(m => m.batch === group.key);
        if (matchedMeeting) defaults.meetingId = matchedMeeting.id;
      }
    } else if (groupBy === GROUP_BY.PERSON) {
      defaults.personInCharge = group.key;
      if (firstItem) {
        const matchedMeeting = meetings.find(m => m.personInCharge === group.key);
        if (matchedMeeting) defaults.meetingId = matchedMeeting.id;
      }
    }
    setAddDefaults(defaults);
    setShowAddModal(true);
  };

  const renderQuantityCell = (material) => {
    const shortage = material.preparedQty < material.requiredQty;
    return (
      <div className="qty-comparison">
        <input
          type="number"
          min="0"
          className="qty-input"
          value={material.requiredQty}
          onChange={async (e) => {
            const val = Number(e.target.value) || 0;
            await updateMaterialField(material.id, 'requiredQty', val);
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <span style={{ color: '#94a3b8' }}>/</span>
        <input
          type="number"
          min="0"
          className={`qty-input ${shortage ? 'qty-shortage' : 'qty-ok'}`}
          style={{ borderColor: shortage ? '#fca5a5' : '#6ee7b7' }}
          value={material.preparedQty}
          onChange={async (e) => {
            const val = Number(e.target.value) || 0;
            await updateMaterialField(material.id, 'preparedQty', val);
          }}
          onClick={(e) => e.stopPropagation()}
        />
        {shortage && (
          <span className="qty-shortage" style={{ fontSize: '12px' }}>
            -{material.requiredQty - material.preparedQty}
          </span>
        )}
      </div>
    );
  };

  if (groupedMaterials.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="group-tabs">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="group-by-selector">
              <button className={`group-by-btn ${groupBy === GROUP_BY.ROOM ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_GROUP_BY', payload: GROUP_BY.ROOM })}>按会议室</button>
              <button className={`group-by-btn ${groupBy === GROUP_BY.BATCH ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_GROUP_BY', payload: GROUP_BY.BATCH })}>按批次</button>
              <button className={`group-by-btn ${groupBy === GROUP_BY.PERSON ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_GROUP_BY', payload: GROUP_BY.PERSON })}>按负责人</button>
            </div>
          </div>
          <div className="table-toolbar">
            {visibleSelectedIds.length > 0 && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => dispatch({ type: 'OPEN_HANDOVER_MODAL', payload: { sourceType: HANDOVER_SOURCE_TYPE.SELECTED } })}
              >
                📋 从已选生成清单
              </button>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => dispatch({ type: 'OPEN_HANDOVER_MODAL', payload: { sourceType: HANDOVER_SOURCE_TYPE.FILTERED } })}
              title="从当前筛选结果生成交接清单"
            >
              📄 交接清单
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setAddDefaults({}); setShowAddModal(true); }}>➕ 新增物料</button>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">{reviewMode ? '所有物料均已备齐，无需复核！' : '暂无符合条件的物料记录'}</div>
          <div className="empty-state-sub">{reviewMode ? '准备工作完成 🎉' : '尝试调整筛选条件或新增物料'}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden' }}>
      <div className="group-tabs">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="group-by-selector">
            <button className={`group-by-btn ${groupBy === GROUP_BY.ROOM ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_GROUP_BY', payload: GROUP_BY.ROOM })}>按会议室</button>
            <button className={`group-by-btn ${groupBy === GROUP_BY.BATCH ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_GROUP_BY', payload: GROUP_BY.BATCH })}>按批次</button>
            <button className={`group-by-btn ${groupBy === GROUP_BY.PERSON ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_GROUP_BY', payload: GROUP_BY.PERSON })}>按负责人</button>
          </div>
          {reviewMode && <span className="review-mode-badge">🔍 会前核对模式</span>}
        </div>
        <div className="table-toolbar">
          {visibleSelectedIds.length > 0 && (
            <>
              <span className="selected-count">已选 {visibleSelectedIds.length} 条</span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => dispatch({ type: 'OPEN_HANDOVER_MODAL', payload: { sourceType: HANDOVER_SOURCE_TYPE.SELECTED } })}
              >
                📋 从已选生成清单
              </button>
              <select
                className="btn btn-secondary btn-sm"
                style={{ border: '1px solid #e2e8f0', minWidth: '110px' }}
                value=""
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  await bulkUpdateStatus(visibleSelectedIds, val);
                  e.target.value = '';
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">批量设置状态</option>
                <option value="pending">待准备</option>
                <option value="preparing">准备中</option>
                <option value="ready">已备齐</option>
                <option value="shortage">短缺</option>
                <option value="review">需复核</option>
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMoveModal(true)}>📦 移动</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(visibleSelectedIds)}>🗑️ 删除</button>
            </>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => dispatch({ type: 'OPEN_HANDOVER_MODAL', payload: { sourceType: HANDOVER_SOURCE_TYPE.FILTERED } })}
            title="从当前筛选结果生成交接清单"
          >
            📄 交接清单
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setAddDefaults({}); setShowAddModal(true); }}>➕ 新增物料</button>
        </div>
      </div>

      <div className="groups-container">
        <table className="materials-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '44px' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '100px' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                />
              </th>
              <th className="hide-mobile">分类</th>
              <th>物料名称</th>
              <th className="hide-mobile">关联会议 / 时间</th>
              <th style={{ textAlign: 'center' }}>需求/已备</th>
              <th>状态</th>
              <th className="hide-mobile">短缺说明</th>
              <th style={{ textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
        </table>

        {groupedMaterials.map(group => {
          const stats = computeGroupStats(group.items);
          const expanded = expandedGroups.has(group.key);
          const allGroupSelected =
            group.items.length > 0 &&
            group.items.every(m => selectedMaterialIds.includes(m.id));
          const progressClass = stats.readyCount === stats.total ? 'success' : (stats.readyCount / stats.total >= 0.5 ? 'warning' : 'danger');

          return (
            <div key={group.key} className="group-section">
              <div
                className="group-header"
                onClick={() => toggleGroup(group.key)}
                style={{ paddingRight: '56px' }}
              >
                <div className="group-header-left">
                  <span className={`group-toggle-icon ${expanded ? 'expanded' : ''}`}>▶</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    style={{ marginRight: '4px' }}
                    checked={allGroupSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      const groupIds = group.items.map(m => m.id);
                      if (allGroupSelected) {
                        dispatch({
                          type: 'SET_SELECTED_MATERIALS',
                          payload: selectedMaterialIds.filter(id => !groupIds.includes(id)),
                        });
                      } else {
                        dispatch({
                          type: 'SET_SELECTED_MATERIALS',
                          payload: Array.from(new Set([...selectedMaterialIds, ...groupIds])),
                        });
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="group-name">{group.label}</span>
                  <span className="group-count">{group.items.length} 项</span>
                </div>
                <div className="group-header-right">
                  <div className="group-stat">
                    <span className="group-stat-dot" style={{ background: '#10b981' }} />
                    {stats.readyCount} 齐
                  </div>
                  <div className="group-stat">
                    <span className="group-stat-dot" style={{ background: '#ef4444' }} />
                    {stats.shortageCount} 缺
                  </div>
                  {stats.reviewCount > 0 && (
                    <div className="group-stat">
                      <span className="group-stat-dot" style={{ background: '#8b5cf6' }} />
                      {stats.reviewCount} 复核
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '90px' }}>
                    <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        className={`progress-fill ${progressClass}`}
                        style={{ width: `${stats.total > 0 ? (stats.readyCount / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', minWidth: '36px', textAlign: 'right' }}>
                      {stats.total > 0 ? Math.round((stats.readyCount / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '12px', marginLeft: '8px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddInGroup(group);
                    }}
                  >
                    ➕
                  </button>
                </div>
              </div>

              {expanded && (
                <table className="materials-table" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '44px' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '100px' }} />
                  </colgroup>
                  <tbody>
                    {group.items.map(material => {
                      const cat = getCategoryInfo(material.categoryId);
                      const meeting = getMeetingInfo(material.meetingId);
                      const isShortage = material.preparedQty < material.requiredQty;
                      const selected = selectedMaterialIds.includes(material.id);
                      return (
                        <tr
                          key={material.id}
                          className={selected ? 'selected' : ''}
                          onClick={(e) => handleRowClick(material, e)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="checkbox"
                              checked={selected}
                              onChange={() => dispatch({ type: 'TOGGLE_SELECT_MATERIAL', payload: material.id })}
                            />
                          </td>
                          <td className="hide-mobile">
                            <span className="category-tag">
                              <span>{cat.icon}</span>
                              <span>{cat.name}</span>
                            </span>
                          </td>
                          <td>
                            <div className="material-name">{material.name}</div>
                            {groupBy !== GROUP_BY.PERSON && (
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                👤 {material.personInCharge || '未分配'}
                              </div>
                            )}
                            {groupBy !== GROUP_BY.ROOM && (
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                                🏢 {getRoomInfo(material.roomId).name}
                              </div>
                            )}
                          </td>
                          <td className="hide-mobile">
                            {meeting ? (
                              <>
                                <div style={{ fontWeight: '500', color: '#334155' }}>{meeting.title}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                  📅 {meeting.date} · ⏰ {meeting.timeSlot}
                                </div>
                                {groupBy !== GROUP_BY.BATCH && (
                                  <div style={{ fontSize: '11px', color: '#8b5cf6', marginTop: '1px' }}>
                                    📦 {material.batch || '无批次'}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontSize: '12px' }}>未关联会议</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            {renderQuantityCell(material)}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <select
                              className="status-select"
                              value={material.status}
                              onChange={async (e) => {
                                await updateMaterialField(material.id, 'status', e.target.value);
                              }}
                              style={{
                                borderColor: `${STATUS_COLORS[material.status]}40`,
                                background: `${STATUS_COLORS[material.status]}10`,
                                color: STATUS_COLORS[material.status],
                                fontWeight: '500',
                              }}
                            >
                              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                              ))}
                            </select>
                            {isShortage && material.status !== MATERIAL_STATUS.SHORTAGE && (
                              <div style={{ marginTop: '4px' }}>{getStatusBadge(material.status, true)}</div>
                            )}
                          </td>
                          <td className="hide-mobile" onClick={(e) => e.stopPropagation()}>
                            <textarea
                              className="shortage-note"
                              placeholder={isShortage ? '填写短缺原因...' : ''}
                              value={material.shortageNote}
                              onChange={async (e) => {
                                await updateMaterialField(material.id, 'shortageNote', e.target.value);
                              }}
                              rows={1}
                            />
                          </td>
                          <td>
                            <div className="row-actions" style={{ justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                className="icon-btn"
                                title="移动物料"
                                onClick={() => {
                                  dispatch({ type: 'SET_SELECTED_MATERIALS', payload: [material.id] });
                                  setShowMoveModal(true);
                                }}
                              >
                                📦
                              </button>
                              <button
                                className="icon-btn"
                                title={reviewMode ? '标记已备齐' : '标记已备齐'}
                                onClick={async () => {
                                  await updateMaterialField(material.id, 'status', MATERIAL_STATUS.READY);
                                  if (material.preparedQty < material.requiredQty) {
                                    await updateMaterialField(material.id, 'preparedQty', material.requiredQty);
                                  }
                                }}
                              >
                                ✅
                              </button>
                              <button
                                className="icon-btn danger"
                                title="删除"
                                onClick={() => handleDelete([material.id])}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <AddMaterialModal onClose={() => setShowAddModal(false)} defaults={addDefaults} />
      )}
      {showMoveModal && (
        <MoveMaterialModal
          materialIds={visibleSelectedIds.length > 0 ? visibleSelectedIds : selectedMaterialIds}
          onClose={() => setShowMoveModal(false)}
        />
      )}
    </div>
  );
}
