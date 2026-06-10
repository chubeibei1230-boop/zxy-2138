import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  RECTIFICATION_TYPE, RECTIFICATION_TYPE_LABELS, RECTIFICATION_TYPE_COLORS, RECTIFICATION_TYPE_ICONS,
  RECTIFICATION_STATUS, RECTIFICATION_STATUS_LABELS, RECTIFICATION_STATUS_COLORS,
  STATUS_LABELS, STATUS_COLORS,
  FOLLOW_UP_STATUS_LABELS, FOLLOW_UP_STATUS_COLORS,
  HANDOVER_STATUS_LABELS, HANDOVER_STATUS_COLORS,
  getFollowUpStatus,
} from '../db';

function getDefaultDueTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RectificationModal() {
  const {
    state, dispatch, selectedRectification, rectificationItems,
    assignRectification, updateRectificationProgress,
    completeRectification, confirmRectificationCompleted,
    returnRectificationForReview,
  } = useApp();
  const { showRectificationModal, materials, meetings, handovers } = state;

  const [formData, setFormData] = useState({
    owner: '',
    dueTime: '',
    progress: '',
    remark: '',
    completionRemark: '',
    returnReason: '',
  });

  const item = selectedRectification;

  useEffect(() => {
    if (item) {
      setFormData({
        owner: item.owner || item.personInCharge || '',
        dueTime: item.dueTime || getDefaultDueTime(),
        progress: item.progress || '',
        remark: item.remark || '',
        completionRemark: '',
        returnReason: '',
      });
    }
  }, [item?.id]);

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
    rectificationItems.forEach(item => {
      if (item.owner) set.add(item.owner);
    });
    return Array.from(set).sort();
  }, [materials, handovers, rectificationItems]);

  if (!showRectificationModal || !item) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    dispatch({ type: 'CLOSE_RECTIFICATION_MODAL' });
  };

  const handleAssign = async () => {
    if (!formData.owner.trim()) {
      alert('请输入整改负责人姓名');
      return;
    }
    await assignRectification(item, formData.owner.trim(), formData.dueTime);
    handleClose();
  };

  const handleUpdateProgress = async () => {
    if (!formData.progress.trim()) {
      alert('请输入处理进展');
      return;
    }
    await updateRectificationProgress(item, formData.progress.trim(), formData.remark.trim());
    handleClose();
  };

  const handleComplete = async () => {
    await completeRectification(item, formData.completionRemark.trim() || formData.progress.trim());
    handleClose();
  };

  const handleConfirm = async () => {
    if (!confirm('确认该整改事项已完成处理？确认后将同步更新物料状态、跟进记录等。')) return;
    await confirmRectificationCompleted(item);
    handleClose();
  };

  const handleReturn = async () => {
    if (!formData.returnReason.trim()) {
      alert('请填写退回复核的原因');
      return;
    }
    await returnRectificationForReview(item, formData.returnReason.trim());
    handleClose();
  };

  const typeColor = RECTIFICATION_TYPE_COLORS[item.type];
  const statusColor = RECTIFICATION_STATUS_COLORS[item.status];
  const fStatus = item.material ? getFollowUpStatus(item.material) : null;

  const canAssign = item.status === RECTIFICATION_STATUS.PENDING ||
    (item.status === RECTIFICATION_STATUS.IN_PROGRESS && !item.owner);
  const canUpdateProgress = item.status === RECTIFICATION_STATUS.IN_PROGRESS ||
    item.status === RECTIFICATION_STATUS.PENDING;
  const canComplete = item.status === RECTIFICATION_STATUS.IN_PROGRESS;
  const canConfirm = item.status === RECTIFICATION_STATUS.PENDING_REVIEW;
  const canReturn = item.status === RECTIFICATION_STATUS.PENDING_REVIEW;

  return (
    <div className="modal-overlay rect-modal-overlay" onClick={handleClose}>
      <div className="modal rect-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header rect-modal-header">
          <div className="modal-title">
            <span>{RECTIFICATION_TYPE_ICONS[item.type]}</span>
            <span style={{ marginLeft: '6px' }}>
              整改处理 - {RECTIFICATION_TYPE_LABELS[item.type]}
            </span>
            <span
              className="status-badge"
              style={{
                background: `${typeColor}15`,
                color: typeColor,
                border: `1px solid ${typeColor}40`,
                marginLeft: '10px',
              }}
            >
              {RECTIFICATION_TYPE_LABELS[item.type]}
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
              {RECTIFICATION_STATUS_LABELS[item.status]}
            </span>
          </div>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="modal-body rect-modal-body">
          <div
            className="rect-modal-summary"
            style={{ borderLeft: `4px solid ${typeColor}`, background: `${typeColor}08` }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>物料名称</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                  {item.category?.icon} {item.material?.name || '未知'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>数量</div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: item.shortageQty > 0 ? '#dc2626' : '#059669',
                  }}
                >
                  {item.material?.preparedQty ?? 0} / {item.material?.requiredQty ?? 0}
                  {item.shortageQty > 0 && `  缺口${item.shortageQty}件`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>所属会议</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                  {item.meeting?.title || '未关联'} · {item.meeting?.date || ''}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>会议室 / 责任人</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                  🏢 {item.room?.name || '未分配'} · 👤 {item.personInCharge || '未分配'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
              {item.material && (
                <span
                  className="status-badge"
                  style={{
                    background: `${STATUS_COLORS[item.material.status]}15`,
                    color: STATUS_COLORS[item.material.status],
                    border: `1px solid ${STATUS_COLORS[item.material.status]}40`,
                  }}
                >
                  物料: {STATUS_LABELS[item.material.status]}
                </span>
              )}
              {fStatus && fStatus !== 'none' && (
                <span
                  className="status-badge"
                  style={{
                    background: `${FOLLOW_UP_STATUS_COLORS[fStatus]}15`,
                    color: FOLLOW_UP_STATUS_COLORS[fStatus],
                    border: `1px solid ${FOLLOW_UP_STATUS_COLORS[fStatus]}40`,
                  }}
                >
                  跟进: {FOLLOW_UP_STATUS_LABELS[fStatus]}
                </span>
              )}
              {item.handover && (
                <span
                  className="status-badge"
                  style={{
                    background: `${HANDOVER_STATUS_COLORS[item.handover.status]}15`,
                    color: HANDOVER_STATUS_COLORS[item.handover.status],
                    border: `1px solid ${HANDOVER_STATUS_COLORS[item.handover.status]}40`,
                  }}
                >
                  交接: {HANDOVER_STATUS_LABELS[item.handover.status]}
                </span>
              )}
            </div>
          </div>

          {(item.remark || item.material?.shortageNote || item.handoverItem?.itemRemark) && (
            <div
              className="rect-modal-note-box"
              style={{
                background: item.type === RECTIFICATION_TYPE.SHORTAGE ? '#fef2f2' : '#fefce8',
                borderColor: item.type === RECTIFICATION_TYPE.SHORTAGE ? '#fecaca' : '#fde68a',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: item.type === RECTIFICATION_TYPE.SHORTAGE ? '#991b1b' : '#92400e', marginBottom: '6px' }}>
                ⚠️ 原异常说明
              </div>
              <div style={{ fontSize: '13px', color: item.type === RECTIFICATION_TYPE.SHORTAGE ? '#7f1d1d' : '#78350f', lineHeight: 1.6 }}>
                {item.remark || item.material?.shortageNote || item.handoverItem?.itemRemark || '暂无说明'}
              </div>
            </div>
          )}

          {canAssign && (
            <div className="rect-modal-section">
              <div className="rect-modal-section-title">
                📋 认领处理
                <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px', fontWeight: 400 }}>
                  分配责任人并设置截止时间
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label form-label-required">整改负责人</label>
                  <input
                    list="rect-owner-list"
                    className="form-input"
                    placeholder="请输入或选择责任人姓名"
                    value={formData.owner}
                    onChange={(e) => handleChange('owner', e.target.value)}
                  />
                  <datalist id="rect-owner-list">
                    {personOptions.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </datalist>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">预计完成时间</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.dueTime}
                    onChange={(e) => handleChange('dueTime', e.target.value)}
                  />
                </div>
              </div>
              <div className="rect-modal-section-actions">
                <button className="btn btn-primary" onClick={handleAssign}>
                  ✋ 认领并开始处理
                </button>
              </div>
            </div>
          )}

          {canUpdateProgress && (
            <div className="rect-modal-section">
              <div className="rect-modal-section-title">
                📝 更新处理进展
                <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px', fontWeight: 400 }}>
                  记录当前处理情况
                </span>
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">处理进展说明</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="描述当前处理进展，如：已向仓库申请补充物料，预计明天上午到货..."
                  value={formData.progress}
                  onChange={(e) => handleChange('progress', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">补充备注</label>
                <textarea
                  className="form-input"
                  rows="2"
                  placeholder="其他需要说明的信息..."
                  value={formData.remark}
                  onChange={(e) => handleChange('remark', e.target.value)}
                />
              </div>
              <div className="rect-modal-section-actions">
                <button className="btn btn-secondary" onClick={handleUpdateProgress}>
                  💾 保存进展
                </button>
              </div>
            </div>
          )}

          {canComplete && (
            <div className="rect-modal-section">
              <div className="rect-modal-section-title">
                ✅ 提交完成
                <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px', fontWeight: 400 }}>
                  处理完毕，等待复核确认
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">完成说明</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="描述处理结果，如：短缺物料已补充完毕，数量已核对无误..."
                  value={formData.completionRemark}
                  onChange={(e) => handleChange('completionRemark', e.target.value)}
                />
              </div>
              <div
                style={{
                  padding: '10px 14px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#92400e',
                  marginBottom: '12px',
                }}
              >
                💡 提交后状态将变为"待复核"，需要管理员或原责任人确认后才算最终完成。
              </div>
              <div className="rect-modal-section-actions">
                <button className="btn btn-success" onClick={handleComplete}>
                  ✅ 提交完成，等待复核
                </button>
              </div>
            </div>
          )}

          {canConfirm && (
            <div className="rect-modal-section">
              <div className="rect-modal-section-title">
                🔍 复核确认
                <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px', fontWeight: 400 }}>
                  确认处理结果是否满足要求
                </span>
              </div>
              <div
                style={{
                  padding: '14px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '8px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ fontSize: '12px', color: '#065f46', fontWeight: 600, marginBottom: '6px' }}>
                  📋 处理人提交的结果
                </div>
                <div style={{ fontSize: '13px', color: '#064e3b', lineHeight: 1.6 }}>
                  {item.progress || '处理人未填写完成说明'}
                </div>
                {item.completedAt && (
                  <div style={{ fontSize: '11px', color: '#059669', marginTop: '8px' }}>
                    提交时间: {new Date(item.completedAt).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">
                  ⚠️ 如不满足要求，请填写退回原因
                </label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="填写退回原因，处理人将重新处理..."
                  value={formData.returnReason}
                  onChange={(e) => handleChange('returnReason', e.target.value)}
                  style={{
                    borderColor: formData.returnReason ? '#fca5a5' : undefined,
                    background: formData.returnReason ? '#fef2f2' : undefined,
                  }}
                />
              </div>
              <div className="rect-modal-section-actions" style={{ justifyContent: 'space-between' }}>
                <button
                  className="btn btn-danger"
                  onClick={handleReturn}
                  disabled={!formData.returnReason.trim()}
                  style={{ opacity: formData.returnReason.trim() ? 1 : 0.5 }}
                >
                  🔄 退回重新处理
                </button>
                <button className="btn btn-success" onClick={handleConfirm}>
                  ✅ 复核通过，完成闭环
                </button>
              </div>
            </div>
          )}

          {item.status === RECTIFICATION_STATUS.COMPLETED && (
            <div
              style={{
                padding: '20px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>
                整改事项已完成闭环
              </div>
              {item.completedAt && (
                <div style={{ fontSize: '12px', color: '#059669' }}>
                  完成时间: {new Date(item.completedAt).toLocaleString('zh-CN')}
                </div>
              )}
              {item.progress && (
                <div style={{ fontSize: '12px', color: '#047857', marginTop: '8px', textAlign: 'left' }}>
                  📝 处理结果: {item.progress}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer rect-modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
