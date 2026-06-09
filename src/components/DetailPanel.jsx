import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  STATUS_LABELS, STATUS_COLORS, MATERIAL_STATUS,
  FOLLOW_UP_STATUS, FOLLOW_UP_STATUS_LABELS, FOLLOW_UP_STATUS_COLORS,
  getFollowUpStatus,
} from '../db';
import FollowUpModal from './FollowUpModal';

export default function DetailPanel() {
  const { state, dispatch, updateMaterial, updateMaterialField, deleteMaterials, markFollowUpCompleted } = useApp();
  const { detailMaterial, mobileDetailExpanded, rooms, categories, meetings } = state;
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  const relatedMaterials = useMemo(() => {
    if (!detailMaterial) return [];
    return state.materials.filter(
      m => m.meetingId === detailMaterial.meetingId && m.id !== detailMaterial.id
    );
  }, [detailMaterial, state.materials]);

  const meeting = useMemo(
    () => meetings.find(m => m.id === detailMaterial?.meetingId),
    [detailMaterial, meetings]
  );
  const category = useMemo(
    () => categories.find(c => c.id === detailMaterial?.categoryId),
    [detailMaterial, categories]
  );
  const room = useMemo(
    () => rooms.find(r => r.id === detailMaterial?.roomId),
    [detailMaterial, rooms]
  );

  if (!detailMaterial) {
    return (
      <div className="detail-panel">
        <div className="detail-header">
          <span className="detail-title">📋 物料详情</span>
          <button
            className="collapse-toggle"
            onClick={() => dispatch({ type: 'TOGGLE_MOBILE_DETAIL' })}
          >
            {mobileDetailExpanded ? '▼ 收起' : '▶ 展开'}
          </button>
        </div>
        <div className={`detail-body ${!mobileDetailExpanded ? 'collapsed' : ''}`}>
          <div className="detail-empty">
            👆 点击左侧表格中的任意物料条目查看详情
            <div style={{ fontSize: '12px', marginTop: '8px', color: '#cbd5e1' }}>
              可以在这里快速编辑完整的物料信息
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isShortage = detailMaterial.preparedQty < detailMaterial.requiredQty;
  const progress = detailMaterial.requiredQty > 0
    ? Math.min(100, Math.round((detailMaterial.preparedQty / detailMaterial.requiredQty) * 100))
    : 0;

  const handleDelete = async () => {
    if (!confirm(`确定要删除物料"${detailMaterial.name}"吗？`)) return;
    await deleteMaterials([detailMaterial.id]);
    dispatch({ type: 'SET_DETAIL_MATERIAL', payload: null });
  };

  const markReady = async () => {
    const updates = { status: MATERIAL_STATUS.READY };
    if (detailMaterial.preparedQty < detailMaterial.requiredQty) {
      updates.preparedQty = detailMaterial.requiredQty;
    }
    await updateMaterial({ ...detailMaterial, ...updates });
    if (getFollowUpStatus(detailMaterial) !== FOLLOW_UP_STATUS.NONE && getFollowUpStatus(detailMaterial) !== FOLLOW_UP_STATUS.COMPLETED) {
      if (confirm('物料已标记为已备齐，是否同步将跟进状态更新为已完成？')) {
        await markFollowUpCompleted([detailMaterial.id]);
      }
    }
  };

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <span className="detail-title">
          📋 {detailMaterial.name}
          <span
            className="status-badge"
            style={{
              background: `${STATUS_COLORS[detailMaterial.status]}15`,
              color: STATUS_COLORS[detailMaterial.status],
              border: `1px solid ${STATUS_COLORS[detailMaterial.status]}40`,
            }}
          >
            {STATUS_LABELS[detailMaterial.status]}
          </span>
          {(() => {
            const fStatus = getFollowUpStatus(detailMaterial);
            if (fStatus === FOLLOW_UP_STATUS.NONE) return null;
            const icon = fStatus === FOLLOW_UP_STATUS.OVERDUE ? '⏰' : fStatus === FOLLOW_UP_STATUS.COMPLETED ? '✅' : '⏩';
            return (
              <span
                className="status-badge"
                style={{
                  background: `${FOLLOW_UP_STATUS_COLORS[fStatus]}15`,
                  color: FOLLOW_UP_STATUS_COLORS[fStatus],
                  border: `1px solid ${FOLLOW_UP_STATUS_COLORS[fStatus]}40`,
                  marginLeft: '4px',
                }}
              >
                {icon} {FOLLOW_UP_STATUS_LABELS[fStatus]}
              </span>
            );
          })()}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="collapse-toggle" onClick={() => dispatch({ type: 'TOGGLE_MOBILE_DETAIL' })}>
            {mobileDetailExpanded ? '▼ 收起' : '▶ 展开'}
          </button>
        </div>
      </div>

      <div className={`detail-body ${!mobileDetailExpanded ? 'collapsed' : ''}`}>
        <div
          style={{
            padding: '14px',
            background: isShortage ? '#fef2f2' : '#ecfdf5',
            borderRadius: '10px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: isShortage ? '#991b1b' : '#065f46' }}>
              {isShortage ? '⚠️ 存在短缺' : '✅ 数量充足'}
            </span>
            <span style={{ fontSize: '13px', color: isShortage ? '#dc2626' : '#059669', fontWeight: '600' }}>
              {detailMaterial.preparedQty} / {detailMaterial.requiredQty} ({progress}%)
            </span>
          </div>
          <div className="progress-bar" style={{ height: '10px' }}>
            <div
              className={`progress-fill ${isShortage ? 'danger' : 'success'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {isShortage && (
            <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>
              缺口 {detailMaterial.requiredQty - detailMaterial.preparedQty} 件，需尽快补充
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button className="btn btn-success btn-sm" onClick={markReady}>
            ✅ 标记已备齐
          </button>
          <button
            className="btn btn-warning btn-sm"
            onClick={async () => await updateMaterialField(detailMaterial.id, 'status', MATERIAL_STATUS.REVIEW)}
          >
            🔍 标记需复核
          </button>
          <button
            className="btn btn-sm"
            style={{
              background: getFollowUpStatus(detailMaterial) !== FOLLOW_UP_STATUS.NONE && getFollowUpStatus(detailMaterial) !== FOLLOW_UP_STATUS.COMPLETED
                ? `${FOLLOW_UP_STATUS_COLORS[getFollowUpStatus(detailMaterial)]}15`
                : '#f1f5f9',
              color: getFollowUpStatus(detailMaterial) !== FOLLOW_UP_STATUS.NONE && getFollowUpStatus(detailMaterial) !== FOLLOW_UP_STATUS.COMPLETED
                ? FOLLOW_UP_STATUS_COLORS[getFollowUpStatus(detailMaterial)]
                : '#475569',
              border: `1px solid ${getFollowUpStatus(detailMaterial) !== FOLLOW_UP_STATUS.NONE && getFollowUpStatus(detailMaterial) !== FOLLOW_UP_STATUS.COMPLETED
                ? FOLLOW_UP_STATUS_COLORS[getFollowUpStatus(detailMaterial)]
                : '#e2e8f0'}40`,
            }}
            onClick={() => setShowFollowUpModal(true)}
          >
            {getFollowUpStatus(detailMaterial) === FOLLOW_UP_STATUS.COMPLETED ? '🔄' : '⏩'} 跟进管理
          </button>
          {getFollowUpStatus(detailMaterial) !== FOLLOW_UP_STATUS.NONE && getFollowUpStatus(detailMaterial) !== FOLLOW_UP_STATUS.COMPLETED && (
            <button
              className="btn btn-success btn-sm"
              onClick={async () => await markFollowUpCompleted([detailMaterial.id])}
            >
              ✅ 完成跟进
            </button>
          )}
          <button
            className="btn btn-danger btn-sm"
            onClick={handleDelete}
          >
            🗑️ 删除物料
          </button>
        </div>

        <div className="detail-grid">
          <div>
            <div className="detail-section-title">基本信息</div>

            <div className="detail-field">
              <span className="detail-field-label">物料名称</span>
              <input
                className="form-input"
                value={detailMaterial.name}
                onChange={async (e) => await updateMaterialField(detailMaterial.id, 'name', e.target.value)}
              />
            </div>

            <div className="detail-field">
              <span className="detail-field-label">分类</span>
              <select
                className="form-input"
                value={detailMaterial.categoryId}
                onChange={async (e) => await updateMaterialField(detailMaterial.id, 'categoryId', Number(e.target.value))}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              {category && (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  当前：{category.icon} {category.name}
                </span>
              )}
            </div>

            <div className="detail-field">
              <span className="detail-field-label">准备状态</span>
              <select
                className="form-input"
                value={detailMaterial.status}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  await updateMaterialField(detailMaterial.id, 'status', newStatus);
                  if (newStatus === MATERIAL_STATUS.READY) {
                    if (detailMaterial.preparedQty < detailMaterial.requiredQty) {
                      await updateMaterialField(detailMaterial.id, 'preparedQty', detailMaterial.requiredQty);
                    }
                    if (getFollowUpStatus(detailMaterial) !== FOLLOW_UP_STATUS.NONE && getFollowUpStatus(detailMaterial) !== FOLLOW_UP_STATUS.COMPLETED) {
                      if (confirm('物料已标记为已备齐，是否同步将跟进状态更新为已完成？')) {
                        await markFollowUpCompleted([detailMaterial.id]);
                      }
                    }
                  }
                }}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="detail-section-title">数量管理</div>

            <div className="detail-field">
              <span className="detail-field-label">需求数量</span>
              <input
                type="number"
                min="0"
                className="form-input"
                value={detailMaterial.requiredQty}
                onChange={async (e) => await updateMaterialField(detailMaterial.id, 'requiredQty', Number(e.target.value))}
              />
            </div>

            <div className="detail-field">
              <span className="detail-field-label">已备数量</span>
              <input
                type="number"
                min="0"
                className="form-input"
                value={detailMaterial.preparedQty}
                onChange={async (e) => await updateMaterialField(detailMaterial.id, 'preparedQty', Number(e.target.value))}
                style={{
                  borderColor: isShortage ? '#fca5a5' : '#6ee7b7',
                  background: isShortage ? '#fef2f2' : '#ecfdf5',
                }}
              />
            </div>

            <div className="detail-field">
              <span className="detail-field-label">短缺说明</span>
              <textarea
                className="form-input"
                rows="3"
                placeholder="填写短缺原因、处理方式、预计到货时间等..."
                value={detailMaterial.shortageNote}
                onChange={async (e) => await updateMaterialField(detailMaterial.id, 'shortageNote', e.target.value)}
                style={{
                  borderColor: isShortage ? '#fca5a5' : '#cbd5e1',
                  background: isShortage ? '#fef2f2' : '#fff',
                }}
              />
            </div>
          </div>

          <div>
            <div className="detail-section-title">归属信息</div>

            <div className="detail-field">
              <span className="detail-field-label">所属会议</span>
              <select
                className="form-input"
                value={detailMaterial.meetingId || ''}
                onChange={async (e) => {
                  const val = Number(e.target.value);
                  const foundMeeting = meetings.find(m => m.id === val);
                  await updateMaterial({
                    ...detailMaterial,
                    meetingId: val,
                    roomId: foundMeeting?.roomId ?? detailMaterial.roomId,
                    personInCharge: foundMeeting?.personInCharge ?? detailMaterial.personInCharge,
                    batch: foundMeeting?.batch ?? detailMaterial.batch,
                  });
                }}
              >
                <option value="">-- 未关联 --</option>
                {meetings.map(m => (
                  <option key={m.id} value={m.id}>{m.title} · {m.date}</option>
                ))}
              </select>
              {meeting && (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  📅 {meeting.date} · ⏰ {meeting.timeSlot} · 状态：{meeting.status === 'confirmed' ? '已确认' : '暂定'}
                </span>
              )}
            </div>

            <div className="detail-field">
              <span className="detail-field-label">会议室</span>
              <select
                className="form-input"
                value={detailMaterial.roomId || ''}
                onChange={async (e) => await updateMaterialField(detailMaterial.id, 'roomId', Number(e.target.value))}
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {room && (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  容纳 {room.capacity} 人
                </span>
              )}
            </div>

            <div className="detail-field">
              <span className="detail-field-label">负责人</span>
              <input
                className="form-input"
                value={detailMaterial.personInCharge}
                onChange={async (e) => await updateMaterialField(detailMaterial.id, 'personInCharge', e.target.value)}
              />
            </div>

            <div className="detail-field">
              <span className="detail-field-label">会议批次</span>
              <input
                className="form-input"
                value={detailMaterial.batch}
                onChange={async (e) => await updateMaterialField(detailMaterial.id, 'batch', e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="detail-section-title">同会议物料 ({relatedMaterials.length})</div>
            {relatedMaterials.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#94a3b8', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                该会议暂未关联其他物料
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                {relatedMaterials.slice(0, 12).map(rm => {
                  const rmShort = rm.preparedQty < rm.requiredQty;
                  const rmCat = categories.find(c => c.id === rm.categoryId);
                  return (
                    <div
                      key={rm.id}
                      style={{
                        padding: '10px 12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${rmShort ? '#ef4444' : STATUS_COLORS[rm.status]}`,
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                      onClick={() => dispatch({ type: 'SET_DETAIL_MATERIAL', payload: rm })}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500', color: '#0f172a' }}>
                          {rmCat?.icon} {rm.name}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: rmShort ? '#dc2626' : '#059669',
                            fontWeight: '500',
                          }}
                        >
                          {rm.preparedQty}/{rm.requiredQty}
                        </span>
                      </div>
                      {rmShort && rm.shortageNote && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          💬 {rm.shortageNote}
                        </div>
                      )}
                    </div>
                  );
                })}
                {relatedMaterials.length > 12 && (
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '4px' }}>
                    还有 {relatedMaterials.length - 12} 条...
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="detail-section-title">跟进信息</div>

            {getFollowUpStatus(detailMaterial) === FOLLOW_UP_STATUS.NONE && !detailMaterial.followUp ? (
              <div style={{ fontSize: '13px', color: '#94a3b8', padding: '12px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                暂无跟进设置
                <div style={{ marginTop: '8px' }}>
                  <button className="btn btn-sm btn-primary" onClick={() => setShowFollowUpModal(true)}>
                    ⏩ 设置跟进
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="detail-field">
                  <span className="detail-field-label">跟进状态</span>
                  <select
                    className="form-input"
                    value={detailMaterial.followUpStatus || (detailMaterial.followUp ? FOLLOW_UP_STATUS.PENDING : FOLLOW_UP_STATUS.NONE)}
                    onChange={async (e) => {
                      const val = e.target.value;
                      await updateMaterialField(detailMaterial.id, 'followUpStatus', val);
                      if (val === FOLLOW_UP_STATUS.NONE) {
                        await updateMaterialField(detailMaterial.id, 'followUp', false);
                      } else if (val === FOLLOW_UP_STATUS.PENDING) {
                        await updateMaterialField(detailMaterial.id, 'followUp', true);
                      } else if (val === FOLLOW_UP_STATUS.COMPLETED) {
                        await updateMaterialField(detailMaterial.id, 'followUpCompletedAt', new Date().toISOString());
                        await updateMaterialField(detailMaterial.id, 'followUp', true);
                      }
                    }}
                    style={{
                      borderColor: `${FOLLOW_UP_STATUS_COLORS[getFollowUpStatus(detailMaterial)]}40`,
                      background: `${FOLLOW_UP_STATUS_COLORS[getFollowUpStatus(detailMaterial)]}08`,
                      color: FOLLOW_UP_STATUS_COLORS[getFollowUpStatus(detailMaterial)],
                      fontWeight: '500',
                    }}
                  >
                    <option value={FOLLOW_UP_STATUS.NONE} style={{ color: '#1e293b' }}>无跟进</option>
                    <option value={FOLLOW_UP_STATUS.PENDING} style={{ color: '#1e293b' }}>⏩ 待跟进</option>
                    <option value={FOLLOW_UP_STATUS.COMPLETED} style={{ color: '#1e293b' }}>✅ 已完成跟进</option>
                  </select>
                </div>

                <div className="detail-field">
                  <span className="detail-field-label">跟进责任人</span>
                  <input
                    className="form-input"
                    placeholder="请输入责任人姓名"
                    value={detailMaterial.followUpOwner || ''}
                    onChange={async (e) => await updateMaterialField(detailMaterial.id, 'followUpOwner', e.target.value)}
                  />
                </div>

                <div className="detail-field">
                  <span className="detail-field-label">预计完成时间</span>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={detailMaterial.followUpDueTime || ''}
                    onChange={async (e) => await updateMaterialField(detailMaterial.id, 'followUpDueTime', e.target.value)}
                  />
                  {detailMaterial.followUpCompletedAt && (
                    <span style={{ fontSize: '11px', color: FOLLOW_UP_STATUS_COLORS.completed }}>
                      ✅ 实际完成于 {new Date(detailMaterial.followUpCompletedAt).toLocaleString('zh-CN')}
                    </span>
                  )}
                </div>

                <div className="detail-field">
                  <span className="detail-field-label">跟进说明</span>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="填写需要跟进的具体事项、处理方式、当前进展等..."
                    value={detailMaterial.followUpNote || ''}
                    onChange={async (e) => await updateMaterialField(detailMaterial.id, 'followUpNote', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {showFollowUpModal && (
        <FollowUpModal
          material={detailMaterial}
          materialIds={[detailMaterial.id]}
          onClose={() => setShowFollowUpModal(false)}
        />
      )}
    </div>
  );
}
