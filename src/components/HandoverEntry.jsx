import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { HANDOVER_STATUS, HANDOVER_STATUS_LABELS, HANDOVER_STATUS_COLORS, HANDOVER_SOURCE_TYPE, MATERIAL_STATUS, STATUS_COLORS } from '../db';

export default function HandoverEntry() {
  const { state, dispatch, filteredMaterials, createHandover } = useApp();
  const { handovers, selectedMaterialIds } = state;
  const [showList, setShowList] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const filteredCount = filteredMaterials.length;
  const selectedCount = selectedMaterialIds.length;

  const sortedHandovers = useMemo(() => {
    return [...handovers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [handovers]);

  const inProgressCount = handovers.filter(h => h.status === HANDOVER_STATUS.IN_PROGRESS).length;
  const draftCount = handovers.filter(h => h.status === HANDOVER_STATUS.DRAFT).length;

  const handleCreate = async (sourceType) => {
    setCreateError('');
    const count = sourceType === HANDOVER_SOURCE_TYPE.SELECTED ? selectedCount : filteredCount;
    if (count === 0) {
      setCreateError(sourceType === HANDOVER_SOURCE_TYPE.SELECTED
        ? '请先选择至少一条物料'
        : '当前筛选结果为空');
      return;
    }
    setCreating(true);
    try {
      const handoverId = await createHandover({ sourceType });
      if (handoverId) {
        dispatch({ type: 'OPEN_HANDOVER_MODAL', payload: { handoverId, sourceType } });
        setShowList(false);
      }
    } finally {
      setCreating(false);
    }
  };

  const openHandover = (handoverId) => {
    dispatch({ type: 'OPEN_HANDOVER_MODAL', payload: { handoverId } });
    setShowList(false);
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="handover-entry">
      <div className="handover-entry-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="handover-entry-icon">📋</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>会前交接清单</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {inProgressCount > 0 && <span style={{ color: HANDOVER_STATUS_COLORS.in_progress, marginRight: '8px' }}>● {inProgressCount} 交接中</span>}
              {draftCount > 0 && <span style={{ color: HANDOVER_STATUS_COLORS.draft }}>● {draftCount} 草稿</span>}
              {inProgressCount === 0 && draftCount === 0 && <span>暂无待处理清单</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowList(!showList)}
            title="查看历史交接清单"
          >
            📂 历史 ({handovers.length})
          </button>
          <div className="handover-create-group">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleCreate(HANDOVER_SOURCE_TYPE.FILTERED)}
              disabled={creating || filteredCount === 0}
              title={`从当前筛选结果（${filteredCount}条）生成交接清单`}
            >
              📄 生成清单
              {filteredCount > 0 && <span className="handover-badge">{filteredCount}</span>}
            </button>
            <button
              className="btn btn-sm btn-primary dropdown-caret"
              onClick={(e) => {
                e.currentTarget.nextElementSibling.classList.toggle('show');
              }}
              disabled={creating}
            >
              ▼
            </button>
            <div className="handover-dropdown">
              <button
                className="handover-dropdown-item"
                onClick={() => handleCreate(HANDOVER_SOURCE_TYPE.FILTERED)}
                disabled={filteredCount === 0}
              >
                <span>🎯</span>
                <div>
                  <div className="handover-dropdown-title">从筛选结果生成</div>
                  <div className="handover-dropdown-sub">包含当前筛选条件下的 {filteredCount} 条物料</div>
                </div>
              </button>
              <button
                className="handover-dropdown-item"
                onClick={() => handleCreate(HANDOVER_SOURCE_TYPE.SELECTED)}
                disabled={selectedCount === 0}
              >
                <span>✅</span>
                <div>
                  <div className="handover-dropdown-title">从已选物料生成</div>
                  <div className="handover-dropdown-sub">包含已勾选的 {selectedCount} 条物料</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {createError && (
        <div className="handover-error">{createError}</div>
      )}

      {showList && (
        <div className="handover-list">
          <div className="handover-list-header">
            <span style={{ fontWeight: '600', color: '#334155' }}>历史交接清单</span>
            <button
              className="icon-btn"
              onClick={() => setShowList(false)}
              style={{ fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
          {sortedHandovers.length === 0 ? (
            <div className="handover-empty">
              <div className="handover-empty-icon">📭</div>
              <div>还没有交接清单</div>
              <div className="handover-empty-sub">点击上方「生成清单」创建第一份</div>
            </div>
          ) : (
            <div className="handover-list-content">
              {sortedHandovers.map(h => (
                <div
                  key={h.id}
                  className="handover-list-item"
                  onClick={() => openHandover(h.id)}
                >
                  <div className="handover-list-item-left">
                    <div className="handover-list-title">{h.title}</div>
                    <div className="handover-list-meta">
                      <span style={{
                        color: HANDOVER_STATUS_COLORS[h.status],
                        background: `${HANDOVER_STATUS_COLORS[h.status]}15`,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '500',
                      }}>
                        {HANDOVER_STATUS_LABELS[h.status]}
                      </span>
                      <span>📦 {h.materialCount} 项</span>
                      {h.handoverPerson && <span>🤝 {h.handoverPerson}→{h.receiverPerson || '?'}</span>}
                      <span>🕐 {formatDate(h.createdAt)}</span>
                    </div>
                  </div>
                  <div className="handover-list-arrow">›</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(inProgressCount > 0 || draftCount > 0) && (
        <div className="handover-status-tip">
          {inProgressCount > 0 && (
            <span className="handover-tip-item" style={{ color: HANDOVER_STATUS_COLORS.in_progress }}>
              ⚠️ 有 {inProgressCount} 份清单正在交接中，请及时处理
            </span>
          )}
          {draftCount > 0 && inProgressCount === 0 && (
            <span className="handover-tip-item" style={{ color: HANDOVER_STATUS_COLORS.draft }}>
              📝 有 {draftCount} 份草稿清单待完善
            </span>
          )}
        </div>
      )}
    </div>
  );
}
