import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  FOLLOW_UP_STATUS, FOLLOW_UP_STATUS_LABELS, FOLLOW_UP_STATUS_COLORS,
  getFollowUpStatus, getLocalDatetimeLocal,
} from '../db';

export default function FollowUpModal({ material, materialIds, onClose }) {
  const { bulkUpdateFollowUp, markFollowUpCompleted, state } = useApp();

  const isSingle = !!material;
  const [formData, setFormData] = useState(() => {
    if (material) {
      const status = getFollowUpStatus(material);
      const hasActive = status !== FOLLOW_UP_STATUS.NONE && status !== FOLLOW_UP_STATUS.COMPLETED;
      return {
        followUp: hasActive || !!material.followUp,
        followUpStatus: material.followUpStatus || FOLLOW_UP_STATUS.PENDING,
        followUpNote: material.followUpNote || '',
        followUpOwner: material.followUpOwner || material.personInCharge || '',
        followUpDueTime: material.followUpDueTime || getDefaultDueTime(),
      };
    }
    return {
      followUp: true,
      followUpStatus: FOLLOW_UP_STATUS.PENDING,
      followUpNote: '',
      followUpOwner: '',
      followUpDueTime: getDefaultDueTime(),
    };
  });

  function getDefaultDueTime() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const updates = {
      followUp: formData.followUp,
      followUpStatus: formData.followUp ? formData.followUpStatus : FOLLOW_UP_STATUS.NONE,
      followUpNote: formData.followUpNote,
      followUpOwner: formData.followUpOwner,
      followUpDueTime: formData.followUpDueTime,
    };
    if (!formData.followUp) {
      updates.followUpDueTime = '';
      updates.followUpOwner = '';
      updates.followUpNote = '';
    }
    await bulkUpdateFollowUp(materialIds, updates);
    onClose && onClose();
  };

  const handleMarkCompleted = async () => {
    await markFollowUpCompleted(materialIds);
    onClose && onClose();
  };

  const handleCancel = async () => {
    await bulkUpdateFollowUp(materialIds, {
      followUp: false,
      followUpStatus: FOLLOW_UP_STATUS.NONE,
      followUpNote: '',
      followUpOwner: '',
      followUpDueTime: '',
    });
    onClose && onClose();
  };

  const personOptions = Array.from(new Set(state.materials.map(m => m.personInCharge).filter(Boolean))).sort();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <span>⏩</span>
            <span style={{ marginLeft: '6px' }}>
              {isSingle ? '跟进设置 - ' + material.name : `批量设置跟进 (${materialIds.length} 条)`}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                className="checkbox"
                checked={formData.followUp}
                onChange={(e) => handleChange('followUp', e.target.checked)}
                style={{ marginRight: '6px' }}
              />
              需要跟进
            </label>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              适用于短缺、需复核、未备齐的物料，用于追踪处理进度
            </div>
          </div>

          {formData.followUp && (
            <>
              <div className="form-group">
                <label className="form-label">跟进状态</label>
                <select
                  className="form-input"
                  value={formData.followUpStatus}
                  onChange={(e) => handleChange('followUpStatus', e.target.value)}
                  style={{
                    borderColor: `${FOLLOW_UP_STATUS_COLORS[formData.followUpStatus]}40`,
                    background: `${FOLLOW_UP_STATUS_COLORS[formData.followUpStatus]}08`,
                    color: FOLLOW_UP_STATUS_COLORS[formData.followUpStatus],
                    fontWeight: '500',
                  }}
                >
                  <option value={FOLLOW_UP_STATUS.PENDING} style={{ color: '#1e293b' }}>
                    ⏩ {FOLLOW_UP_STATUS_LABELS[FOLLOW_UP_STATUS.PENDING]}
                  </option>
                  <option value={FOLLOW_UP_STATUS.COMPLETED} style={{ color: '#1e293b' }}>
                    ✅ {FOLLOW_UP_STATUS_LABELS[FOLLOW_UP_STATUS.COMPLETED]}
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">跟进责任人</label>
                <input
                  list="followup-person-list"
                  className="form-input"
                  placeholder="请输入或选择责任人姓名"
                  value={formData.followUpOwner}
                  onChange={(e) => handleChange('followUpOwner', e.target.value)}
                />
                <datalist id="followup-person-list">
                  {personOptions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">预计完成时间</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formData.followUpDueTime}
                  onChange={(e) => handleChange('followUpDueTime', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">跟进说明</label>
                <textarea
                  className="form-input"
                  rows="4"
                  placeholder="填写需要跟进的具体事项、处理方式、当前进展等..."
                  value={formData.followUpNote}
                  onChange={(e) => handleChange('followUpNote', e.target.value)}
                />
              </div>
            </>
          )}

          {isSingle && material && material.followUpStatus === FOLLOW_UP_STATUS.COMPLETED && material.followUpCompletedAt && (
            <div
              style={{
                padding: '12px 14px',
                background: '#ecfdf5',
                borderRadius: '8px',
                border: '1px solid #a7f3d0',
                fontSize: '12px',
                color: '#065f46',
              }}
            >
              ✅ 已于 {new Date(material.followUpCompletedAt).toLocaleString('zh-CN')} 完成跟进
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {formData.followUp && isSingle && getFollowUpStatus(material) !== FOLLOW_UP_STATUS.NONE && getFollowUpStatus(material) !== FOLLOW_UP_STATUS.COMPLETED && (
              <button className="btn btn-success" onClick={handleMarkCompleted}>
                ✅ 标记已完成
              </button>
            )}
            {isSingle && getFollowUpStatus(material) !== FOLLOW_UP_STATUS.NONE && (
              <button className="btn btn-secondary" onClick={handleCancel}>
                ❌ 取消跟进
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={onClose}>取消</button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              💾 保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
