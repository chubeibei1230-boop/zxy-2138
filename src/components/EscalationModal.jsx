import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ESCALATION_TYPE, ESCALATION_TYPE_LABELS, ESCALATION_TYPE_COLORS, ESCALATION_TYPE_ICONS,
  ESCALATION_STATUS, ESCALATION_STATUS_LABELS, ESCALATION_STATUS_COLORS,
  STATUS_LABELS, STATUS_COLORS, MATERIAL_STATUS,
  FOLLOW_UP_STATUS_LABELS, FOLLOW_UP_STATUS_COLORS,
  HANDOVER_STATUS_LABELS, HANDOVER_STATUS_COLORS,
  ESCALATION_REVIEW_RESULT, ESCALATION_REVIEW_RESULT_LABELS,
  ESCALATION_SOURCE_TYPE, ESCALATION_SOURCE_TYPE_LABELS,
  isEscalationOverdue,
} from '../db';

function EscalationDetailInfo({ item }) {
  const { state } = useApp();
  const { materials, handovers, rectifications, meetings, rooms } = state;

  const sourceInfo = (() => {
    if (item.sourceType === ESCALATION_SOURCE_TYPE.MATERIAL) {
      const material = materials.find(m => m.id === item.sourceId);
      if (material) {
        return {
          type: '物料异常',
          details: [
            { label: '物料名称', value: material.name },
            { label: '当前状态', value: STATUS_LABELS[material.status] || material.status, color: STATUS_COLORS[material.status] },
            { label: '需求数量', value: `${material.requiredQty} 件` },
            { label: '已备数量', value: `${material.preparedQty} 件` },
            { label: '缺口数量', value: `${Math.max(0, material.requiredQty - material.preparedQty)} 件`, color: '#dc2626' },
            { label: '原负责人', value: material.personInCharge || '-' },
            material.shortageNote ? { label: '短缺说明', value: material.shortageNote } : null,
          ].filter(Boolean),
        };
      }
    }
    if (item.sourceType === ESCALATION_SOURCE_TYPE.HANDOVER_ITEM) {
      const handover = item.handover;
      const handoverItem = item.handoverItem;
      if (handover && handoverItem) {
        return {
          type: '交接异常',
          details: [
            { label: '交接标题', value: handover.title },
            { label: '交接状态', value: HANDOVER_STATUS_LABELS[handover.status] || handover.status, color: HANDOVER_STATUS_COLORS[handover.status] },
            { label: '交接人', value: handover.handoverPerson || '-' },
            { label: '接收人', value: handover.receiverPerson || '-' },
            { label: '交接时间', value: handover.handoverTime || '-' },
            { label: '物料名称', value: item.material?.name || '-' },
            handoverItem.itemRemark ? { label: '交接说明', value: handoverItem.itemRemark } : null,
            handover.remark ? { label: '交接备注', value: handover.remark } : null,
          ].filter(Boolean),
        };
      }
    }
    if (item.sourceType === ESCALATION_SOURCE_TYPE.RECTIFICATION) {
      const rect = rectifications.find(r => r.id === item.sourceId);
      if (rect) {
        return {
          type: '整改异常',
          details: [
            { label: '整改类型', value: rect.type },
            { label: '整改状态', value: STATUS_LABELS[rect.status] || rect.status, color: STATUS_COLORS[rect.status] },
            { label: '整改责任人', value: rect.owner || '-' },
            { label: '创建人', value: rect.creator || '-' },
            { label: '分配时间', value: rect.assignedAt ? rect.assignedAt.replace('T', ' ') : '-' },
            { label: '截止时间', value: rect.dueTime ? rect.dueTime.replace('T', ' ') : '-' },
            rect.progress ? { label: '整改进展', value: rect.progress } : null,
            rect.remark ? { label: '整改说明', value: rect.remark } : null,
          ].filter(Boolean),
        };
      }
    }
    if (item.sourceType === ESCALATION_SOURCE_TYPE.MATERIAL && 
        (item.type === ESCALATION_TYPE.FOLLOW_UP_OVERDUE || item.type === ESCALATION_TYPE.FOLLOW_UP_PENDING)) {
      const material = item.material || materials.find(m => m.id === item.sourceId);
      if (material) {
        return {
          type: '跟进异常',
          details: [
            { label: '物料名称', value: material.name },
            { label: '跟进状态', value: FOLLOW_UP_STATUS_LABELS[material.followUpStatus] || material.followUpStatus, color: FOLLOW_UP_STATUS_COLORS[material.followUpStatus] },
            { label: '跟进责任人', value: material.followUpOwner || '-' },
            { label: '跟进截止', value: material.followUpDueTime ? material.followUpDueTime.replace('T', ' ') : '-' },
            material.followUpNote ? { label: '跟进说明', value: material.followUpNote } : null,
          ].filter(Boolean),
        };
      }
    }
    return null;
  })();

  const meeting = meetings.find(m => m.id === item.meetingId);
  const room = rooms.find(r => r.id === item.roomId);

  return (
    <div className="escalation-detail-section">
      <h4 className="section-title">📌 异常基本信息</h4>
      <div className="detail-grid">
        <div className="detail-item">
          <span className="detail-label">异常类型</span>
          <span
            className="detail-value"
            style={{
              background: `${ESCALATION_TYPE_COLORS[item.type]}15`,
              color: ESCALATION_TYPE_COLORS[item.type],
              padding: '2px 10px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            {ESCALATION_TYPE_ICONS[item.type]} {ESCALATION_TYPE_LABELS[item.type]}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">处理状态</span>
          <span
            className="detail-value"
            style={{
              background: `${ESCALATION_STATUS_COLORS[item.status]}15`,
              color: ESCALATION_STATUS_COLORS[item.status],
              padding: '2px 10px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            {ESCALATION_STATUS_LABELS[item.status]}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">异常来源</span>
          <span className="detail-value">{ESCALATION_SOURCE_TYPE_LABELS[item.sourceType]}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">创建时间</span>
          <span className="detail-value">{item.createdAt ? item.createdAt.replace('T', ' ') : '-'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">关联会议</span>
          <span className="detail-value">{meeting?.title || '-'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">会议室</span>
          <span className="detail-value">{room?.name || '-'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">会议日期</span>
          <span className="detail-value">{meeting?.date || '-'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">责任人</span>
          <span className="detail-value">👤 {item.owner || '未分配'}</span>
        </div>
        {item.expectedCompleteTime && (
          <div className="detail-item">
            <span className="detail-label">期望完成时间</span>
            <span className={`detail-value ${isEscalationOverdue(item) ? 'overdue' : ''}`}>
              ⏰ {item.expectedCompleteTime.replace('T', ' ')}
            </span>
          </div>
        )}
        {item.reviewRequestedAt && (
          <div className="detail-item">
            <span className="detail-label">申请复核时间</span>
            <span className="detail-value">🔍 {item.reviewRequestedAt.replace('T', ' ')}</span>
          </div>
        )}
        {item.restoredAt && (
          <div className="detail-item">
            <span className="detail-label">恢复时间</span>
            <span className="detail-value">✅ {item.restoredAt.replace('T', ' ')}</span>
          </div>
        )}
        {item.closedAt && (
          <div className="detail-item">
            <span className="detail-label">闭环时间</span>
            <span className="detail-value">📦 {item.closedAt.replace('T', ' ')}</span>
          </div>
        )}
      </div>

      {item.remark && (
        <div className="detail-item-full">
          <span className="detail-label">异常说明</span>
          <div className="remark-box">{item.remark}</div>
        </div>
      )}

      {sourceInfo && (
        <>
          <h4 className="section-title">🔗 {sourceInfo.type}详情</h4>
          <div className="detail-grid">
            {sourceInfo.details.map((d, idx) => (
              <div key={idx} className="detail-item">
                <span className="detail-label">{d.label}</span>
                <span className="detail-value" style={{ color: d.color || 'inherit' }}>
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {item.progress && (
        <>
          <h4 className="section-title">📝 当前处理进展</h4>
          <div className="detail-item-full">
            <div className="progress-box">{item.progress}</div>
          </div>
        </>
      )}
    </div>
  );
}

function ClaimForm({ item, onSubmit, onCancel }) {
  const { state } = useApp();
  const [owner, setOwner] = useState(item.owner || '');
  const [expectedCompleteTime, setExpectedCompleteTime] = useState(
    item.expectedCompleteTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );

  const personOptions = Array.from(new Set(state.materials.map(m => m.personInCharge).filter(Boolean))).sort();

  return (
    <div className="escalation-form-section">
      <h4 className="escalation-form-title">📋 认领异常</h4>
      <div className="escalation-form-group">
        <label className="escalation-form-label">责任人 *</label>
        <input
          type="text"
          className="escalation-form-input"
          list="person-list"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="请输入或选择责任人"
        />
        <datalist id="person-list">
          {personOptions.map(p => <option key={p} value={p} />)}
        </datalist>
      </div>
      <div className="escalation-form-group">
        <label className="escalation-form-label">期望完成时间 *</label>
        <input
          type="datetime-local"
          className="escalation-form-input"
          value={expectedCompleteTime}
          onChange={(e) => setExpectedCompleteTime(e.target.value)}
        />
      </div>
      <div className="escalation-form-actions">
        <button className="escalation-form-cancel" onClick={onCancel}>取消</button>
        <button
          className="escalation-form-submit"
          onClick={() => onSubmit(owner, expectedCompleteTime)}
          disabled={!owner || !expectedCompleteTime}
        >
          确认认领
        </button>
      </div>
    </div>
  );
}

function ReassignForm({ item, onSubmit, onCancel }) {
  const { state } = useApp();
  const [newOwner, setNewOwner] = useState('');
  const [expectedCompleteTime, setExpectedCompleteTime] = useState(
    item.expectedCompleteTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [reassignReason, setReassignReason] = useState('');

  const personOptions = Array.from(new Set(state.materials.map(m => m.personInCharge).filter(Boolean))).sort();

  return (
    <div className="escalation-form-section">
      <h4 className="escalation-form-title">🔄 转派异常</h4>
      <div className="escalation-form-group">
        <label className="escalation-form-label">新责任人 *</label>
        <input
          type="text"
          className="escalation-form-input"
          list="reassign-person-list"
          value={newOwner}
          onChange={(e) => setNewOwner(e.target.value)}
          placeholder="请输入或选择新责任人"
        />
        <datalist id="reassign-person-list">
          {personOptions.map(p => <option key={p} value={p} />)}
        </datalist>
      </div>
      <div className="escalation-form-group">
        <label className="escalation-form-label">期望完成时间 *</label>
        <input
          type="datetime-local"
          className="escalation-form-input"
          value={expectedCompleteTime}
          onChange={(e) => setExpectedCompleteTime(e.target.value)}
        />
      </div>
      <div className="escalation-form-group">
        <label className="escalation-form-label">转派原因 *</label>
        <textarea
          className="escalation-form-textarea"
          value={reassignReason}
          onChange={(e) => setReassignReason(e.target.value)}
          placeholder="请说明转派原因"
          rows={3}
        />
      </div>
      <div className="escalation-form-actions">
        <button className="escalation-form-cancel" onClick={onCancel}>取消</button>
        <button
          className="escalation-form-submit"
          style={{ background: '#f59e0b' }}
          onClick={() => onSubmit(newOwner, expectedCompleteTime, reassignReason)}
          disabled={!newOwner || !expectedCompleteTime || !reassignReason.trim()}
        >
          确认转派
        </button>
      </div>
    </div>
  );
}

function ProgressForm({ item, onSubmit, onCancel }) {
  const [progress, setProgress] = useState(item.progress || '');
  const [remark, setRemark] = useState('');

  return (
    <div className="escalation-form-section">
      <h4 className="escalation-form-title">📝 更新处理进展</h4>
      <div className="escalation-form-group">
        <label className="escalation-form-label">处理说明 *</label>
        <textarea
          className="escalation-form-textarea"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="请详细描述当前处理进展"
          rows={4}
        />
      </div>
      <div className="escalation-form-actions">
        <button className="escalation-form-cancel" onClick={onCancel}>取消</button>
        <button
          className="escalation-form-submit"
          style={{ background: '#6366f1' }}
          onClick={() => onSubmit(progress, remark)}
          disabled={!remark.trim()}
        >
          保存进展
        </button>
      </div>
    </div>
  );
}

function RequestReviewForm({ item, onSubmit, onCancel }) {
  const [completionRemark, setCompletionRemark] = useState('');

  return (
    <div className="escalation-form-section">
      <h4 className="escalation-form-title">🔍 申请复核</h4>
      <div className="escalation-form-group">
        <label className="escalation-form-label">完成处理说明 *</label>
        <textarea
          className="escalation-form-textarea"
          value={completionRemark}
          onChange={(e) => setCompletionRemark(e.target.value)}
          placeholder="请详细说明异常处理完成情况，以便复核"
          rows={4}
        />
      </div>
      <div className="escalation-form-actions">
        <button className="escalation-form-cancel" onClick={onCancel}>取消</button>
        <button
          className="escalation-form-submit"
          style={{ background: '#0ea5e9' }}
          onClick={() => onSubmit(completionRemark)}
          disabled={!completionRemark.trim()}
        >
          提交复核
        </button>
      </div>
    </div>
  );
}

function ReviewForm({ item, onSubmit, onCancel, type }) {
  const [reviewRemark, setReviewRemark] = useState('');
  const [returnReason, setReturnReason] = useState('');

  if (type === 'restore') {
    return (
      <div className="escalation-form-section">
        <h4 className="escalation-form-title">✅ 标记已恢复</h4>
        <div className="escalation-form-group">
          <label className="escalation-form-label">复核说明</label>
          <textarea
            className="escalation-form-textarea"
            value={reviewRemark}
            onChange={(e) => setReviewRemark(e.target.value)}
            placeholder="请填写复核意见（可选）"
            rows={3}
          />
        </div>
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '12px',
          color: '#92400e',
          marginBottom: '12px',
        }}>
          ⚠️ 确认恢复后，将自动：
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            <li>更新关联物料/交接/整改的状态为正常</li>
            <li>消除对应的风险提示标识</li>
            <li>更新相关待办事项的状态</li>
          </ul>
        </div>
        <div className="escalation-form-actions">
          <button className="escalation-form-cancel" onClick={onCancel}>取消</button>
          <button
            className="escalation-form-submit"
            style={{ background: '#10b981' }}
            onClick={() => onSubmit(reviewRemark)}
          >
            确认恢复
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="escalation-form-section">
      <h4 className="escalation-form-title">↩️ 退回重处理</h4>
      <div className="escalation-form-group">
        <label className="escalation-form-label">退回原因 *</label>
        <textarea
          className="escalation-form-textarea"
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
          placeholder="请详细说明退回原因和需要补充/修改的内容"
          rows={4}
        />
      </div>
      <div className="escalation-form-actions">
        <button className="escalation-form-cancel" onClick={onCancel}>取消</button>
        <button
          className="escalation-form-submit"
          style={{ background: '#ef4444' }}
          onClick={() => onSubmit(returnReason)}
          disabled={!returnReason.trim()}
        >
          确认退回
        </button>
      </div>
    </div>
  );
}

function CloseForm({ item, onSubmit, onCancel }) {
  const [closeRemark, setCloseRemark] = useState('');

  return (
    <div className="escalation-form-section">
      <h4 className="escalation-form-title">📦 闭环异常</h4>
      <div className="escalation-form-group">
        <label className="escalation-form-label">闭环说明</label>
        <textarea
          className="escalation-form-textarea"
          value={closeRemark}
          onChange={(e) => setCloseRemark(e.target.value)}
          placeholder="请填写闭环说明（可选）"
          rows={3}
        />
      </div>
      <div style={{
        background: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '12px',
        color: '#92400e',
        marginBottom: '12px',
      }}>
        ⚠️ 确认闭环后，该异常将从待处理列表中移除，不再显示醒目标识。
      </div>
      <div className="escalation-form-actions">
        <button className="escalation-form-cancel" onClick={onCancel}>取消</button>
        <button
          className="escalation-form-submit"
          style={{ background: '#10b981' }}
          onClick={() => onSubmit(closeRemark)}
        >
          确认闭环
        </button>
      </div>
    </div>
  );
}

function OperationLogs({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="empty-state small">
        <span className="empty-icon">📋</span>
        <span className="empty-text">暂无操作记录</span>
      </div>
    );
  }

  const actionLabels = {
    created: '创建异常',
    claimed: '认领异常',
    reassigned: '转派异常',
    progress: '更新进展',
    requested_review: '申请复核',
    restored: '标记恢复',
    returned: '退回重处理',
    closed: '闭环异常',
  };

  const actionColors = {
    created: '#6366f1',
    claimed: '#3b82f6',
    reassigned: '#f59e0b',
    progress: '#8b5cf6',
    requested_review: '#0ea5e9',
    restored: '#10b981',
    returned: '#ef4444',
    closed: '#64748b',
  };

  const actionClassMap = {
    created: 'review',
    claimed: 'claim',
    reassigned: 'reassign',
    progress: 'progress',
    requested_review: 'review',
    restored: 'restore',
    returned: 'rework',
    closed: 'close',
  };

  return (
    <div className="operation-logs-list">
      {logs.slice().reverse().map((log, idx) => (
        <div key={idx} className={`operation-log-item ${actionClassMap[log.action] || ''}`}>
          <div className="operation-log-icon">📝</div>
          <div className="operation-log-content">
            <div className="operation-log-action">
              <span
                style={{
                  background: `${actionColors[log.action] || '#6366f1'}15`,
                  color: actionColors[log.action] || '#6366f1',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '500',
                }}
              >
                {actionLabels[log.action] || log.action}
              </span>
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#64748b' }}>
                👤 {log.operator || '系统'}
              </span>
            </div>
            {log.remark && <div className="operation-log-detail">{log.remark}</div>}
            <div className="operation-log-meta">{log.timestamp?.replace('T', ' ') || log.createdAt?.replace('T', ' ') || '-'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EscalationModal() {
  const { state, dispatch, claimEscalation, reassignEscalation, updateEscalationProgress,
          requestEscalationReview, restoreEscalation, returnEscalationForRework, closeEscalation,
          selectedEscalation } = useApp();
  const { showEscalationModal } = state;
  const [actionMode, setActionMode] = useState(null);

  useEffect(() => {
    if (!showEscalationModal) {
      setActionMode(null);
    }
  }, [showEscalationModal]);

  if (!showEscalationModal || !selectedEscalation) {
    return null;
  }

  const item = selectedEscalation;
  const isOverdue = isEscalationOverdue(item);

  const handleClose = () => {
    dispatch({ type: 'CLOSE_ESCALATION_MODAL' });
    dispatch({ type: 'SET_SELECTED_ESCALATION', payload: null });
  };

  const handleClaim = async (owner, expectedCompleteTime) => {
    try {
      await claimEscalation(item, owner, expectedCompleteTime);
      setActionMode(null);
    } catch (err) {
      alert('认领失败：' + err.message);
    }
  };

  const handleReassign = async (newOwner, expectedCompleteTime, reassignReason) => {
    try {
      await reassignEscalation(item, newOwner, expectedCompleteTime, reassignReason);
      setActionMode(null);
    } catch (err) {
      alert('转派失败：' + err.message);
    }
  };

  const handleProgress = async (progress, remark) => {
    try {
      await updateEscalationProgress(item, progress, remark);
      setActionMode(null);
    } catch (err) {
      alert('更新失败：' + err.message);
    }
  };

  const handleRequestReview = async (completionRemark) => {
    try {
      await requestEscalationReview(item, completionRemark);
      setActionMode(null);
    } catch (err) {
      alert('申请失败：' + err.message);
    }
  };

  const handleRestore = async (reviewRemark) => {
    try {
      await restoreEscalation(item, reviewRemark);
      setActionMode(null);
    } catch (err) {
      alert('恢复失败：' + err.message);
    }
  };

  const handleReturn = async (returnReason) => {
    try {
      await returnEscalationForRework(item, returnReason);
      setActionMode(null);
    } catch (err) {
      alert('退回失败：' + err.message);
    }
  };

  const handleCloseItem = async (closeRemark) => {
    try {
      await closeEscalation(item, closeRemark);
      setActionMode(null);
    } catch (err) {
      alert('闭环失败：' + err.message);
    }
  };

  const canClaim = item.status === ESCALATION_STATUS.PENDING_CLAIM;
  const canReassign = [ESCALATION_STATUS.PENDING_CLAIM, ESCALATION_STATUS.IN_PROGRESS].includes(item.status);
  const canUpdateProgress = item.status === ESCALATION_STATUS.IN_PROGRESS;
  const canRequestReview = item.status === ESCALATION_STATUS.IN_PROGRESS;
  const canRestore = item.status === ESCALATION_STATUS.PENDING_REVIEW;
  const canReturn = item.status === ESCALATION_STATUS.PENDING_REVIEW;
  const canClose = [ESCALATION_STATUS.RESTORED].includes(item.status);

  return (
    <div className="escalation-modal-overlay" onClick={handleClose}>
      <div className="escalation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="escalation-modal-header">
          <div className="escalation-modal-title">
            <span style={{ fontSize: '22px' }}>🚨</span>
            <h2>异常详情</h2>
            <div style={{ marginLeft: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span
                className="status-badge"
                style={{
                  background: `${ESCALATION_TYPE_COLORS[item.type]}15`,
                  color: ESCALATION_TYPE_COLORS[item.type],
                  border: `1px solid ${ESCALATION_TYPE_COLORS[item.type]}40`,
                }}
              >
                {ESCALATION_TYPE_ICONS[item.type]} {ESCALATION_TYPE_LABELS[item.type]}
              </span>
              <span
                className="status-badge"
                style={{
                  background: `${ESCALATION_STATUS_COLORS[item.status]}15`,
                  color: ESCALATION_STATUS_COLORS[item.status],
                  border: `1px solid ${ESCALATION_STATUS_COLORS[item.status]}40`,
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
                  }}
                >
                  ⏰ 已超时
                </span>
              )}
            </div>
          </div>
          <button className="escalation-modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="escalation-modal-body">
          <div>
            <EscalationDetailInfo item={item} />

            {actionMode === 'claim' && (
              <ClaimForm item={item} onSubmit={handleClaim} onCancel={() => setActionMode(null)} />
            )}
            {actionMode === 'reassign' && (
              <ReassignForm item={item} onSubmit={handleReassign} onCancel={() => setActionMode(null)} />
            )}
            {actionMode === 'progress' && (
              <ProgressForm item={item} onSubmit={handleProgress} onCancel={() => setActionMode(null)} />
            )}
            {actionMode === 'review' && (
              <RequestReviewForm item={item} onSubmit={handleRequestReview} onCancel={() => setActionMode(null)} />
            )}
            {actionMode === 'restore' && (
              <ReviewForm item={item} onSubmit={handleRestore} onCancel={() => setActionMode(null)} type="restore" />
            )}
            {actionMode === 'return' && (
              <ReviewForm item={item} onSubmit={handleReturn} onCancel={() => setActionMode(null)} type="return" />
            )}
            {actionMode === 'close' && (
              <CloseForm item={item} onSubmit={handleCloseItem} onCancel={() => setActionMode(null)} />
            )}
          </div>

          <div className="escalation-actions-panel">
            <div style={{ marginBottom: '16px' }}>
              <h4 className="escalation-form-title">快捷操作</h4>
              <div className="action-btn-group">
                {canClaim && (
                  <button className="action-btn claim" onClick={() => setActionMode('claim')}>
                    📋 认领异常
                  </button>
                )}
                {canReassign && (
                  <button className="action-btn reassign" onClick={() => setActionMode('reassign')}>
                    🔄 转派他人
                  </button>
                )}
                {canUpdateProgress && (
                  <button className="action-btn progress" onClick={() => setActionMode('progress')}>
                    📝 更新进展
                  </button>
                )}
                {canRequestReview && (
                  <button className="action-btn review" onClick={() => setActionMode('review')}>
                    🔍 申请复核
                  </button>
                )}
                {canRestore && (
                  <button className="action-btn restore" onClick={() => setActionMode('restore')}>
                    ✅ 标记恢复
                  </button>
                )}
                {canReturn && (
                  <button className="action-btn rework" onClick={() => setActionMode('return')}>
                    ↩️ 退回重处理
                  </button>
                )}
                {canClose && (
                  <button className="action-btn close" onClick={() => setActionMode('close')}>
                    📦 闭环异常
                  </button>
                )}
              </div>
            </div>

            <div className="operation-logs-section">
              <h4 className="operation-logs-title">📋 操作日志</h4>
              <OperationLogs logs={item.operationLogs} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
