import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  TASK_SOURCE_TYPE, TASK_SOURCE_TYPE_LABELS, TASK_SOURCE_TYPE_COLORS, TASK_SOURCE_TYPE_ICONS,
  TASK_STATUS, TASK_STATUS_LABELS, TASK_STATUS_COLORS,
  RECTIFICATION_TYPE_LABELS,
  STATUS_LABELS, STATUS_COLORS,
  FOLLOW_UP_STATUS_LABELS, FOLLOW_UP_STATUS_COLORS,
  HANDOVER_STATUS_LABELS, HANDOVER_STATUS_COLORS,
  isTaskOverdue,
} from '../db';

function getDefaultDueTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TaskModal() {
  const {
    state, dispatch, selectedTask,
    claimTask, updateTaskProgress, completeTask,
    preMeetingTasks, createEscalationFromTask,
  } = useApp();
  const { showTaskModal, materials, meetings, handovers } = state;

  const [formData, setFormData] = useState({
    owner: '',
    dueTime: '',
    progress: '',
    remark: '',
    completionRemark: '',
    escalationRemark: '',
  });

  const [activeTab, setActiveTab] = useState('detail');
  const [showEscalateForm, setShowEscalateForm] = useState(false);

  const task = selectedTask;

  useEffect(() => {
    if (task) {
      setFormData({
        owner: task.owner || task.personInCharge || '',
        dueTime: task.dueTime || getDefaultDueTime(),
        progress: task.progress || '',
        remark: task.remark || '',
        completionRemark: '',
      });
      setActiveTab('detail');
    }
  }, [task?.id, task?.owner, task?.progress, task?.remark]);

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
    preMeetingTasks.forEach(t => {
      if (t.owner) set.add(t.owner);
    });
    return Array.from(set).sort();
  }, [materials, handovers, preMeetingTasks]);

  if (!showTaskModal || !task) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    dispatch({ type: 'CLOSE_TASK_MODAL' });
  };

  const handleClaim = async () => {
    if (!formData.owner.trim()) {
      alert('请输入责任人姓名');
      return;
    }
    const success = await claimTask(task, formData.owner.trim());
    if (success) {
      alert('任务认领成功！');
      handleClose();
    }
  };

  const handleUpdateProgress = async () => {
    if (!formData.progress.trim()) {
      alert('请输入处理进展');
      return;
    }
    const success = await updateTaskProgress(task, formData.progress.trim(), formData.remark.trim());
    if (success) {
      alert('进度更新成功！');
      handleClose();
    }
  };

  const handleComplete = async () => {
    if (!confirm('确认该任务已完成？完成后将同步更新相关业务状态。')) return;
    const success = await completeTask(task, formData.completionRemark.trim() || formData.progress.trim());
    if (success) {
      alert('任务已完成，相关状态已同步更新！');
      handleClose();
    }
  };

  const handleEscalate = async () => {
    if (!confirm('确认将该任务升级为异常？升级后将进入异常升级池进行统一管理。')) return;
    try {
      const escalation = await createEscalationFromTask(task, formData.escalationRemark.trim());
      if (escalation) {
        alert('任务已成功升级为异常，请在异常升级池中查看和处理！');
        handleClose();
      }
    } catch (err) {
      alert('升级失败：' + err.message);
    }
  };

  const sourceColor = TASK_SOURCE_TYPE_COLORS[task.sourceType];
  const statusColor = TASK_STATUS_COLORS[task.status];
  const isOverdue = isTaskOverdue(task);

  const canClaim = !task.owner || task.owner === '';
  const canUpdateProgress = task.status === TASK_STATUS.PENDING || task.status === TASK_STATUS.IN_PROGRESS;
  const canComplete = task.status === TASK_STATUS.PENDING || task.status === TASK_STATUS.IN_PROGRESS;

  const formatDateTime = (dt) => {
    if (!dt) return '-';
    return dt.replace('T', ' ');
  };

  return (
    <div className="modal-overlay task-modal-overlay" onClick={handleClose}>
      <div className="modal task-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header task-modal-header">
          <div className="modal-title">
            <span>{TASK_SOURCE_TYPE_ICONS[task.sourceType]}</span>
            <span style={{ marginLeft: '6px' }}>
              任务处理 - {task.title}
            </span>
            <span
              className="status-badge"
              style={{
                background: `${sourceColor}15`,
                color: sourceColor,
                border: `1px solid ${sourceColor}40`,
                marginLeft: '10px',
              }}
            >
              {TASK_SOURCE_TYPE_LABELS[task.sourceType]}
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
            {task.priority === 'high' && (
              <span
                className="status-badge"
                style={{
                  background: '#fef2f2',
                  color: '#ef4444',
                  border: '1px solid #fecaca',
                  marginLeft: '6px',
                }}
              >
                🚨 高优先级
              </span>
            )}
          </div>
          <button className="modal-close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="task-modal-tabs">
          <button
            className={`task-modal-tab ${activeTab === 'detail' ? 'active' : ''}`}
            onClick={() => setActiveTab('detail')}
          >
            📋 任务详情
          </button>
          <button
            className={`task-modal-tab ${activeTab === 'process' ? 'active' : ''}`}
            onClick={() => setActiveTab('process')}
          >
            ⚙️ 处理任务
          </button>
        </div>

        <div className="modal-body task-modal-body">
          {activeTab === 'detail' && (
            <div className="task-detail-section">
              <div className="task-detail-grid">
                <div className="task-detail-item">
                  <span className="task-detail-label">任务状态</span>
                  <span
                    className="status-badge"
                    style={{
                      background: `${statusColor}15`,
                      color: statusColor,
                      border: `1px solid ${statusColor}40`,
                    }}
                  >
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                </div>
                <div className="task-detail-item">
                  <span className="task-detail-label">优先级</span>
                  <span
                    className="status-badge"
                    style={{
                      background: task.priority === 'high' ? '#fef2f2' : '#fffbeb',
                      color: task.priority === 'high' ? '#ef4444' : '#d97706',
                      border: `1px solid ${task.priority === 'high' ? '#fecaca' : '#fde68a'}`,
                    }}
                  >
                    {task.priority === 'high' ? '🚨 高' : task.priority === 'medium' ? '⚠️ 中' : '✅ 低'}
                  </span>
                </div>
                <div className="task-detail-item">
                  <span className="task-detail-label">所属会议</span>
                  <span className="task-detail-value">
                    {task.meeting ? `${task.meeting.title} · ${task.meeting.date}` : '-'}
                  </span>
                </div>
                <div className="task-detail-item">
                  <span className="task-detail-label">会议室</span>
                  <span className="task-detail-value">{task.room?.name || '-'}</span>
                </div>
                <div className="task-detail-item">
                  <span className="task-detail-label">责任人</span>
                  <span className="task-detail-value">
                    👤 {task.owner || task.personInCharge || '未分配'}
                  </span>
                </div>
                <div className="task-detail-item">
                  <span className="task-detail-label">截止时间</span>
                  <span className={`task-detail-value ${isOverdue ? 'task-overdue-text' : ''}`}>
                    ⏰ {formatDateTime(task.dueTime)}
                  </span>
                </div>
              </div>

              <div className="task-detail-desc">
                <span className="task-detail-label">任务描述</span>
                <div className="task-detail-desc-content">
                  {task.description}
                </div>
              </div>

              {task.progress && (
                <div className="task-detail-progress">
                  <span className="task-detail-label">当前进展</span>
                  <div className="task-detail-progress-content">
                    {task.progress}
                  </div>
                </div>
              )}

              {task.remark && (
                <div className="task-detail-remark">
                  <span className="task-detail-label">备注说明</span>
                  <div className="task-detail-remark-content">
                    {task.remark}
                  </div>
                </div>
              )}

              {task.material && (
                <div className="task-related-info">
                  <h4 className="task-related-title">📦 关联物料信息</h4>
                  <div className="task-related-grid">
                    <div className="task-related-item">
                      <span className="task-related-label">物料名称</span>
                      <span className="task-related-value">{task.material.name}</span>
                    </div>
                    <div className="task-related-item">
                      <span className="task-related-label">物料分类</span>
                      <span className="task-related-value">{task.category?.name || '-'}</span>
                    </div>
                    <div className="task-related-item">
                      <span className="task-related-label">需求数量</span>
                      <span className="task-related-value">{task.material.requiredQty} 件</span>
                    </div>
                    <div className="task-related-item">
                      <span className="task-related-label">已备数量</span>
                      <span className="task-related-value">{task.material.preparedQty} 件</span>
                    </div>
                    <div className="task-related-item">
                      <span className="task-related-label">物料状态</span>
                      <span
                        className="status-badge"
                        style={{
                          background: `${STATUS_COLORS[task.material.status]}15`,
                          color: STATUS_COLORS[task.material.status],
                          border: `1px solid ${STATUS_COLORS[task.material.status]}40`,
                        }}
                      >
                        {STATUS_LABELS[task.material.status]}
                      </span>
                    </div>
                    {task.material.followUpStatus && task.material.followUpStatus !== 'none' && (
                      <div className="task-related-item">
                        <span className="task-related-label">跟进状态</span>
                        <span
                          className="status-badge"
                          style={{
                            background: `${FOLLOW_UP_STATUS_COLORS[task.material.followUpStatus]}15`,
                            color: FOLLOW_UP_STATUS_COLORS[task.material.followUpStatus],
                            border: `1px solid ${FOLLOW_UP_STATUS_COLORS[task.material.followUpStatus]}40`,
                          }}
                        >
                          {FOLLOW_UP_STATUS_LABELS[task.material.followUpStatus]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {task.handover && (
                <div className="task-related-info">
                  <h4 className="task-related-title">🤝 关联交接信息</h4>
                  <div className="task-related-grid">
                    <div className="task-related-item">
                      <span className="task-related-label">交接标题</span>
                      <span className="task-related-value">{task.handover.title}</span>
                    </div>
                    <div className="task-related-item">
                      <span className="task-related-label">交接状态</span>
                      <span
                        className="status-badge"
                        style={{
                          background: `${HANDOVER_STATUS_COLORS[task.handover.status]}15`,
                          color: HANDOVER_STATUS_COLORS[task.handover.status],
                          border: `1px solid ${HANDOVER_STATUS_COLORS[task.handover.status]}40`,
                        }}
                      >
                        {HANDOVER_STATUS_LABELS[task.handover.status]}
                      </span>
                    </div>
                    <div className="task-related-item">
                      <span className="task-related-label">交接人</span>
                      <span className="task-related-value">👤 {task.handover.handoverPerson || '-'}</span>
                    </div>
                    <div className="task-related-item">
                      <span className="task-related-label">接收人</span>
                      <span className="task-related-value">👤 {task.handover.receiverPerson || '-'}</span>
                    </div>
                    <div className="task-related-item">
                      <span className="task-related-label">交接时间</span>
                      <span className="task-related-value">{formatDateTime(task.handover.handoverTime)}</span>
                    </div>
                  </div>
                </div>
              )}

              {task.rectification && (
                <div className="task-related-info">
                  <h4 className="task-related-title">🔧 关联整改信息</h4>
                  <div className="task-related-grid">
                    <div className="task-related-item">
                      <span className="task-related-label">整改类型</span>
                      <span className="task-related-value">
                        {RECTIFICATION_TYPE_LABELS[task.rectification.type] || task.rectification.type}
                      </span>
                    </div>
                    <div className="task-related-item">
                      <span className="task-related-label">创建时间</span>
                      <span className="task-related-value">{formatDateTime(task.rectification.createdAt)}</span>
                    </div>
                    {task.rectification.assignedAt && (
                      <div className="task-related-item">
                        <span className="task-related-label">分配时间</span>
                        <span className="task-related-value">{formatDateTime(task.rectification.assignedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'process' && (
            <div className="task-process-section">
              {canClaim && (
                <div className="task-process-block">
                  <h4 className="task-process-title">📋 认领任务</h4>
                  <p className="task-process-desc">
                    认领该任务后，您将成为责任人，负责跟进处理直至完成。
                  </p>
                  <div className="task-form-row">
                    <div className="task-form-item">
                      <label className="task-form-label">责任人姓名 *</label>
                      <select
                        value={formData.owner}
                        onChange={(e) => handleChange('owner', e.target.value)}
                        className="task-form-select"
                      >
                        <option value="">请选择或输入责任人</option>
                        {personOptions.map(person => (
                          <option key={person} value={person}>
                            {person}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="或输入新的责任人姓名"
                        value={personOptions.includes(formData.owner) ? '' : formData.owner}
                        onChange={(e) => handleChange('owner', e.target.value)}
                        className="task-form-input"
                        style={{ marginTop: '8px' }}
                      />
                    </div>
                    <div className="task-form-item">
                      <label className="task-form-label">要求完成时间</label>
                      <input
                        type="datetime-local"
                        value={formData.dueTime}
                        onChange={(e) => handleChange('dueTime', e.target.value)}
                        className="task-form-input"
                      />
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleClaim}
                    style={{ marginTop: '12px' }}
                  >
                    ✋ 认领任务
                  </button>
                </div>
              )}

              {canUpdateProgress && (
                <div className="task-process-block">
                  <h4 className="task-process-title">📝 更新进度</h4>
                  <p className="task-process-desc">
                    记录当前处理进展，让相关人员了解任务状态。
                  </p>
                  <div className="task-form-row">
                    <div className="task-form-item task-form-item-full">
                      <label className="task-form-label">处理进展 *</label>
                      <textarea
                        value={formData.progress}
                        onChange={(e) => handleChange('progress', e.target.value)}
                        placeholder="请输入当前处理进展..."
                        className="task-form-textarea"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="task-form-row">
                    <div className="task-form-item task-form-item-full">
                      <label className="task-form-label">备注说明</label>
                      <textarea
                        value={formData.remark}
                        onChange={(e) => handleChange('remark', e.target.value)}
                        placeholder="可补充相关说明、遇到的问题等..."
                        className="task-form-textarea"
                        rows={2}
                      />
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={handleUpdateProgress}
                    style={{ marginTop: '12px' }}
                  >
                    💾 保存进度
                  </button>
                </div>
              )}

              {canComplete && (
                <div className="task-process-block task-process-block-complete">
                  <h4 className="task-process-title">✅ 标记完成</h4>
                  <p className="task-process-desc">
                    确认任务已全部处理完毕。标记完成后，将同步更新相关业务状态（如物料状态、跟进记录、交接状态、整改记录等）。
                  </p>
                  <div className="task-form-row">
                    <div className="task-form-item task-form-item-full">
                      <label className="task-form-label">完成说明</label>
                      <textarea
                        value={formData.completionRemark}
                        onChange={(e) => handleChange('completionRemark', e.target.value)}
                        placeholder="请简要说明完成情况（可选）..."
                        className="task-form-textarea"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="task-process-warning">
                    ⚠️ 完成后将自动同步更新：
                    <ul>
                      {task.sourceType === TASK_SOURCE_TYPE.MATERIAL_SHORTAGE && (
                        <li>物料状态将更新为「已备齐」，已备数量将补全为需求数量</li>
                      )}
                      {task.sourceType === TASK_SOURCE_TYPE.MATERIAL_PREPARATION && (
                        <li>物料状态将更新为「已备齐」</li>
                      )}
                      {task.sourceType === TASK_SOURCE_TYPE.REVIEW_REQUIRED && (
                        <li>物料状态将更新为「已备齐」</li>
                      )}
                      {(task.sourceType === TASK_SOURCE_TYPE.FOLLOW_UP_PENDING || task.sourceType === TASK_SOURCE_TYPE.FOLLOW_UP_OVERDUE) && (
                        <li>物料跟进状态将更新为「已完成跟进」</li>
                      )}
                      {task.sourceType === TASK_SOURCE_TYPE.HANDOVER_INCOMPLETE && (
                        <li>交接记录将标记为「已确认」，同步更新物料状态</li>
                      )}
                      {(task.sourceType === TASK_SOURCE_TYPE.RECTIFICATION_PENDING || task.sourceType === TASK_SOURCE_TYPE.RECTIFICATION_IN_PROGRESS) && (
                        <li>整改记录将更新为「待复核」，完成后将同步更新关联业务状态</li>
                      )}
                    </ul>
                  </div>
                  <button
                    className="btn btn-success"
                    onClick={handleComplete}
                    style={{ marginTop: '12px' }}
                  >
                    ✅ 标记完成
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer task-modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
