import React, { useMemo } from 'react';
import { useApp, RISK_VIEW } from '../context/AppContext';
import {
  TASK_SOURCE_TYPE, TASK_SOURCE_TYPE_LABELS, TASK_SOURCE_TYPE_COLORS, TASK_SOURCE_TYPE_ICONS,
  TASK_STATUS, TASK_STATUS_LABELS, TASK_STATUS_COLORS,
  RISK_LEVEL, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS,
  isTaskOverdue,
} from '../db';

function TaskSummaryCards() {
  const { preMeetingTaskSummary } = useApp();
  const { total, pending, inProgress, completed, overdue, highPriority, completionRate } = preMeetingTaskSummary;

  const cards = [
    {
      label: '总任务数',
      value: total,
      sub: '会前保障任务',
      color: '#3b82f6',
      icon: '📋',
    },
    {
      label: '待处理',
      value: pending,
      sub: '需要立即关注',
      color: TASK_STATUS_COLORS.pending,
      icon: '⏳',
    },
    {
      label: '处理中',
      value: inProgress,
      sub: '正在跟进',
      color: TASK_STATUS_COLORS.in_progress,
      icon: '⚙️',
    },
    {
      label: '已完成',
      value: completed,
      sub: `${completionRate}% 完成率`,
      color: TASK_STATUS_COLORS.completed,
      icon: '✅',
    },
    {
      label: '已超时',
      value: overdue,
      sub: '超过截止时间',
      color: '#dc2626',
      icon: '⏰',
    },
    {
      label: '高优先级',
      value: highPriority,
      sub: '需优先处理',
      color: RISK_LEVEL_COLORS.high,
      icon: '🚨',
    },
  ];

  return (
    <div className="task-summary-grid">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="task-summary-card"
          style={{ borderLeftColor: card.color }}
        >
          <div className="task-summary-card-top">
            <span className="task-summary-icon">{card.icon}</span>
            <span className="task-summary-label">{card.label}</span>
          </div>
          <div className="task-summary-value" style={{ color: card.color }}>
            {card.value}
          </div>
          <div className="task-summary-sub">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

function TaskFilterBar() {
  const { state, dispatch, preMeetingTasks } = useApp();
  const { taskFilters, rooms, meetings, materials } = state;

  const personOptions = useMemo(() => {
    const set = new Set();
    materials.forEach(m => {
      if (m.personInCharge) set.add(m.personInCharge);
      if (m.followUpOwner) set.add(m.followUpOwner);
    });
    meetings.forEach(m => {
      if (m.personInCharge) set.add(m.personInCharge);
    });
    preMeetingTasks.forEach(t => {
      if (t.owner) set.add(t.owner);
    });
    return Array.from(set).sort();
  }, [materials, meetings, preMeetingTasks]);

  const riskLevelOptions = [
    { value: 'high', label: RISK_LEVEL_LABELS.high, color: RISK_LEVEL_COLORS.high },
    { value: 'medium', label: RISK_LEVEL_LABELS.medium, color: RISK_LEVEL_COLORS.medium },
    { value: 'low', label: RISK_LEVEL_LABELS.low, color: RISK_LEVEL_COLORS.low },
  ];

  const sourceTypeOptions = Object.entries(TASK_SOURCE_TYPE).map(([key, value]) => ({
    value,
    label: TASK_SOURCE_TYPE_LABELS[value],
    color: TASK_SOURCE_TYPE_COLORS[value],
    icon: TASK_SOURCE_TYPE_ICONS[value],
  }));

  const statusOptions = Object.entries(TASK_STATUS).map(([key, value]) => ({
    value,
    label: TASK_STATUS_LABELS[value],
    color: TASK_STATUS_COLORS[value],
  }));

  const handleDateChange = (field, value) => {
    dispatch({
      type: 'SET_TASK_FILTERS',
      payload: { dateRange: { ...taskFilters.dateRange, [field]: value } },
    });
  };

  const handleMultiChange = (field, value, checked) => {
    const current = taskFilters[field] || [];
    const next = checked ? [...current, value] : current.filter(v => v !== value);
    dispatch({ type: 'SET_TASK_FILTERS', payload: { [field]: next } });
  };

  const clearFilters = () => {
    dispatch({
      type: 'SET_TASK_FILTERS',
      payload: {
        dateRange: { start: '', end: '' },
        roomIds: [],
        meetingIds: [],
        personInCharges: [],
        riskLevels: [],
        sourceTypes: [],
        statuses: [],
      },
    });
  };

  const hasActiveFilters =
    taskFilters.dateRange.start ||
    taskFilters.dateRange.end ||
    taskFilters.roomIds.length > 0 ||
    taskFilters.meetingIds.length > 0 ||
    taskFilters.personInCharges.length > 0 ||
    taskFilters.riskLevels.length > 0 ||
    taskFilters.sourceTypes.length > 0 ||
    taskFilters.statuses.length > 0;

  return (
    <div className="task-filter-bar">
      <div className="task-filter-row">
        <div className="task-filter-item">
          <span className="task-filter-label">会议开始日期</span>
          <input
            type="date"
            value={taskFilters.dateRange.start}
            onChange={(e) => handleDateChange('start', e.target.value)}
          />
        </div>
        <div className="task-filter-item">
          <span className="task-filter-label">会议结束日期</span>
          <input
            type="date"
            value={taskFilters.dateRange.end}
            onChange={(e) => handleDateChange('end', e.target.value)}
          />
        </div>
        <div className="task-filter-item">
          <span className="task-filter-label">会议室</span>
          <select
            multiple
            value={taskFilters.roomIds.map(String)}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
              dispatch({ type: 'SET_TASK_FILTERS', payload: { roomIds: opts } });
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
        <div className="task-filter-item">
          <span className="task-filter-label">会议</span>
          <select
            multiple
            value={taskFilters.meetingIds.map(String)}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
              dispatch({ type: 'SET_TASK_FILTERS', payload: { meetingIds: opts } });
            }}
            style={{ minHeight: '38px' }}
          >
            {meetings.map(meeting => (
              <option key={meeting.id} value={meeting.id}>
                {meeting.title} · {meeting.date}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="task-filter-row">
        <div className="task-filter-item">
          <span className="task-filter-label">负责人</span>
          <select
            multiple
            value={taskFilters.personInCharges}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value);
              dispatch({ type: 'SET_TASK_FILTERS', payload: { personInCharges: opts } });
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
        <div className="task-filter-item">
          <span className="task-filter-label">风险等级</span>
          <div className="task-filter-checkboxes">
            {riskLevelOptions.map(opt => (
              <label key={opt.value} className="task-filter-checkbox">
                <input
                  type="checkbox"
                  checked={taskFilters.riskLevels.includes(opt.value)}
                  onChange={(e) => handleMultiChange('riskLevels', opt.value, e.target.checked)}
                />
                <span style={{ color: opt.color }}>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="task-filter-item">
          <span className="task-filter-label">任务类型</span>
          <div className="task-filter-checkboxes">
            {sourceTypeOptions.map(opt => (
              <label key={opt.value} className="task-filter-checkbox">
                <input
                  type="checkbox"
                  checked={taskFilters.sourceTypes.includes(opt.value)}
                  onChange={(e) => handleMultiChange('sourceTypes', opt.value, e.target.checked)}
                />
                <span>{opt.icon}</span>
                <span style={{ color: opt.color }}>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="task-filter-item">
          <span className="task-filter-label">任务状态</span>
          <div className="task-filter-checkboxes">
            {statusOptions.map(opt => (
              <label key={opt.value} className="task-filter-checkbox">
                <input
                  type="checkbox"
                  checked={taskFilters.statuses.includes(opt.value)}
                  onChange={(e) => handleMultiChange('statuses', opt.value, e.target.checked)}
                />
                <span style={{ color: opt.color }}>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      {hasActiveFilters && (
        <div className="task-filter-actions">
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
            清除筛选
          </button>
        </div>
      )}
    </div>
  );
}

function RoomTaskCard({ roomGroup }) {
  const { dispatch } = useApp();
  const {
    room, tasks, totalTasks, completedTasks,
    pendingTasks, inProgressTasks, overdueTasks,
    highPriorityTasks, progressRate, ownerDistribution, sourceTypeDistribution, meetingCount
  } = roomGroup;

  const handleViewDetail = (taskId) => {
    dispatch({ type: 'SET_SELECTED_TASK', payload: taskId });
    dispatch({ type: 'OPEN_TASK_MODAL' });
  };

  const topOwners = Object.entries(ownerDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="meeting-task-card">
      <div className="meeting-task-header">
        <div className="meeting-task-info">
          <h3 className="meeting-task-title">📍 {room?.name || '未知会议室'}</h3>
          <div className="meeting-task-meta">
            <span className="meeting-task-meta-item">
              📅 涉及 {meetingCount} 场会议
            </span>
            <span className="meeting-task-meta-item">
              📋 共 {totalTasks} 项任务
            </span>
          </div>
        </div>
        <div className="meeting-task-progress">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progressRate}%`,
                background: progressRate >= 100 ? TASK_STATUS_COLORS.completed :
                  progressRate >= 50 ? TASK_STATUS_COLORS.in_progress :
                  TASK_STATUS_COLORS.pending,
              }}
            />
          </div>
          <span className="progress-text">{progressRate}%</span>
        </div>
      </div>

      <div className="meeting-task-stats">
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: TASK_STATUS_COLORS.pending }}>
            {pendingTasks}
          </span>
          <span className="meeting-task-stat-label">待处理</span>
        </div>
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: TASK_STATUS_COLORS.in_progress }}>
            {inProgressTasks}
          </span>
          <span className="meeting-task-stat-label">处理中</span>
        </div>
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: TASK_STATUS_COLORS.completed }}>
            {completedTasks}
          </span>
          <span className="meeting-task-stat-label">已完成</span>
        </div>
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: '#dc2626' }}>
            {overdueTasks}
          </span>
          <span className="meeting-task-stat-label">已超时</span>
        </div>
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: RISK_LEVEL_COLORS.high }}>
            {highPriorityTasks}
          </span>
          <span className="meeting-task-stat-label">高优先级</span>
        </div>
      </div>

      {Object.keys(sourceTypeDistribution).length > 0 && (
        <div className="meeting-task-source-types">
          <span className="meeting-task-section-label">任务类型分布：</span>
          {Object.entries(sourceTypeDistribution).map(([type, count]) => (
            <span
              key={type}
              className="source-type-badge"
              style={{
                background: `${TASK_SOURCE_TYPE_COLORS[type]}15`,
                color: TASK_SOURCE_TYPE_COLORS[type],
                borderColor: `${TASK_SOURCE_TYPE_COLORS[type]}40`,
              }}
            >
              {TASK_SOURCE_TYPE_ICONS[type]} {TASK_SOURCE_TYPE_LABELS[type]} {count}
            </span>
          ))}
        </div>
      )}

      {topOwners.length > 0 && (
        <div className="meeting-task-owners">
          <span className="meeting-task-section-label">责任人分布：</span>
          {topOwners.map(([owner, count]) => (
            <span key={owner} className="owner-badge">
              👤 {owner} ({count})
            </span>
          ))}
        </div>
      )}

      <div className="meeting-task-list">
        {tasks.slice(0, 5).map(task => {
          const isOverdue = isTaskOverdue(task);
          const sourceColor = TASK_SOURCE_TYPE_COLORS[task.sourceType];
          const statusColor = TASK_STATUS_COLORS[task.status];

          return (
            <div
              key={task.id}
              className={`task-item ${isOverdue ? 'task-item-overdue' : ''}`}
              onClick={() => handleViewDetail(task.id)}
            >
              <div className="task-item-left">
                <span
                  className="task-item-type-icon"
                  style={{ background: `${sourceColor}15`, color: sourceColor }}
                >
                  {TASK_SOURCE_TYPE_ICONS[task.sourceType]}
                </span>
                <div className="task-item-content">
                  <div className="task-item-title">
                    {task.title}
                    {isOverdue && <span className="task-overdue-badge">已超时</span>}
                    {task.priority === 'high' && <span className="task-high-priority-badge">高优先级</span>}
                  </div>
                  <div className="task-item-desc">{task.description}</div>
                  <div className="task-item-meta">
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
                    <span className="task-item-meta-item">
                      👤 {task.owner || task.personInCharge || '未分配'}
                    </span>
                    {task.meeting && (
                      <span className="task-item-meta-item">
                        📅 {task.meeting.title}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="task-item-right">
                <button className="btn btn-primary btn-sm">处理</button>
              </div>
            </div>
          );
        })}
        {tasks.length > 5 && (
          <div className="task-more-hint">
            还有 {tasks.length - 5} 项任务...
          </div>
        )}
      </div>
    </div>
  );
}

function PersonTaskCard({ personGroup }) {
  const { dispatch } = useApp();
  const {
    person, tasks, totalTasks, completedTasks,
    pendingTasks, inProgressTasks, overdueTasks,
    highPriorityTasks, progressRate, roomDistribution, sourceTypeDistribution, meetingCount
  } = personGroup;

  const handleViewDetail = (taskId) => {
    dispatch({ type: 'SET_SELECTED_TASK', payload: taskId });
    dispatch({ type: 'OPEN_TASK_MODAL' });
  };

  const topRooms = Object.entries(roomDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="meeting-task-card">
      <div className="meeting-task-header">
        <div className="meeting-task-info">
          <h3 className="meeting-task-title">👤 {person || '未分配'}</h3>
          <div className="meeting-task-meta">
            <span className="meeting-task-meta-item">
              📅 涉及 {meetingCount} 场会议
            </span>
            <span className="meeting-task-meta-item">
              📋 共 {totalTasks} 项任务
            </span>
          </div>
        </div>
        <div className="meeting-task-progress">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progressRate}%`,
                background: progressRate >= 100 ? TASK_STATUS_COLORS.completed :
                  progressRate >= 50 ? TASK_STATUS_COLORS.in_progress :
                  TASK_STATUS_COLORS.pending,
              }}
            />
          </div>
          <span className="progress-text">{progressRate}%</span>
        </div>
      </div>

      <div className="meeting-task-stats">
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: TASK_STATUS_COLORS.pending }}>
            {pendingTasks}
          </span>
          <span className="meeting-task-stat-label">待处理</span>
        </div>
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: TASK_STATUS_COLORS.in_progress }}>
            {inProgressTasks}
          </span>
          <span className="meeting-task-stat-label">处理中</span>
        </div>
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: TASK_STATUS_COLORS.completed }}>
            {completedTasks}
          </span>
          <span className="meeting-task-stat-label">已完成</span>
        </div>
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: '#dc2626' }}>
            {overdueTasks}
          </span>
          <span className="meeting-task-stat-label">已超时</span>
        </div>
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: RISK_LEVEL_COLORS.high }}>
            {highPriorityTasks}
          </span>
          <span className="meeting-task-stat-label">高优先级</span>
        </div>
      </div>

      {Object.keys(sourceTypeDistribution).length > 0 && (
        <div className="meeting-task-source-types">
          <span className="meeting-task-section-label">任务类型分布：</span>
          {Object.entries(sourceTypeDistribution).map(([type, count]) => (
            <span
              key={type}
              className="source-type-badge"
              style={{
                background: `${TASK_SOURCE_TYPE_COLORS[type]}15`,
                color: TASK_SOURCE_TYPE_COLORS[type],
                borderColor: `${TASK_SOURCE_TYPE_COLORS[type]}40`,
              }}
            >
              {TASK_SOURCE_TYPE_ICONS[type]} {TASK_SOURCE_TYPE_LABELS[type]} {count}
            </span>
          ))}
        </div>
      )}

      {topRooms.length > 0 && (
        <div className="meeting-task-owners">
          <span className="meeting-task-section-label">涉及会议室：</span>
          {topRooms.map(([roomName, count]) => (
            <span key={roomName} className="owner-badge">
              📍 {roomName} ({count})
            </span>
          ))}
        </div>
      )}

      <div className="meeting-task-list">
        {tasks.slice(0, 5).map(task => {
          const isOverdue = isTaskOverdue(task);
          const sourceColor = TASK_SOURCE_TYPE_COLORS[task.sourceType];
          const statusColor = TASK_STATUS_COLORS[task.status];

          return (
            <div
              key={task.id}
              className={`task-item ${isOverdue ? 'task-item-overdue' : ''}`}
              onClick={() => handleViewDetail(task.id)}
            >
              <div className="task-item-left">
                <span
                  className="task-item-type-icon"
                  style={{ background: `${sourceColor}15`, color: sourceColor }}
                >
                  {TASK_SOURCE_TYPE_ICONS[task.sourceType]}
                </span>
                <div className="task-item-content">
                  <div className="task-item-title">
                    {task.title}
                    {isOverdue && <span className="task-overdue-badge">已超时</span>}
                    {task.priority === 'high' && <span className="task-high-priority-badge">高优先级</span>}
                  </div>
                  <div className="task-item-desc">{task.description}</div>
                  <div className="task-item-meta">
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
                    <span className="task-item-meta-item">
                      📍 {task.room?.name || '未知会议室'}
                    </span>
                    {task.meeting && (
                      <span className="task-item-meta-item">
                        📅 {task.meeting.title}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="task-item-right">
                <button className="btn btn-primary btn-sm">处理</button>
              </div>
            </div>
          );
        })}
        {tasks.length > 5 && (
          <div className="task-more-hint">
            还有 {tasks.length - 5} 项任务...
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingTaskCard({ meetingGroup }) {
  const { dispatch } = useApp();
  const {
    meeting, room, tasks, totalTasks, completedTasks,
    pendingTasks, inProgressTasks, overdueTasks,
    highPriorityTasks, progressRate, ownerDistribution, sourceTypeDistribution
  } = meetingGroup;

  const handleViewDetail = (taskId) => {
    dispatch({ type: 'SET_SELECTED_TASK', payload: taskId });
    dispatch({ type: 'OPEN_TASK_MODAL' });
  };

  const topOwners = Object.entries(ownerDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="meeting-task-card">
      <div className="meeting-task-header">
        <div className="meeting-task-info">
          <h3 className="meeting-task-title">{meeting?.title || '未知会议'}</h3>
          <div className="meeting-task-meta">
            <span className="meeting-task-meta-item">
              📅 {meeting?.date || '-'} {meeting?.timeSlot || ''}
            </span>
            <span className="meeting-task-meta-item">
              📍 {room?.name || '未知会议室'}
            </span>
            <span className="meeting-task-meta-item">
              👤 {meeting?.personInCharge || '未分配'}
            </span>
          </div>
        </div>
        <div className="meeting-task-progress">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progressRate}%`,
                background: progressRate >= 100 ? TASK_STATUS_COLORS.completed :
                  progressRate >= 50 ? TASK_STATUS_COLORS.in_progress :
                  TASK_STATUS_COLORS.pending,
              }}
            />
          </div>
          <span className="progress-text">{progressRate}%</span>
        </div>
      </div>

      <div className="meeting-task-stats">
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: TASK_STATUS_COLORS.pending }}>
            {pendingTasks}
          </span>
          <span className="meeting-task-stat-label">待处理</span>
        </div>
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: TASK_STATUS_COLORS.in_progress }}>
            {inProgressTasks}
          </span>
          <span className="meeting-task-stat-label">处理中</span>
        </div>
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: TASK_STATUS_COLORS.completed }}>
            {completedTasks}
          </span>
          <span className="meeting-task-stat-label">已完成</span>
        </div>
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: '#dc2626' }}>
            {overdueTasks}
          </span>
          <span className="meeting-task-stat-label">已超时</span>
        </div>
        <div className="meeting-task-stat">
          <span className="meeting-task-stat-value" style={{ color: RISK_LEVEL_COLORS.high }}>
            {highPriorityTasks}
          </span>
          <span className="meeting-task-stat-label">高优先级</span>
        </div>
      </div>

      {Object.keys(sourceTypeDistribution).length > 0 && (
        <div className="meeting-task-source-types">
          <span className="meeting-task-section-label">任务类型分布：</span>
          {Object.entries(sourceTypeDistribution).map(([type, count]) => (
            <span
              key={type}
              className="source-type-badge"
              style={{
                background: `${TASK_SOURCE_TYPE_COLORS[type]}15`,
                color: TASK_SOURCE_TYPE_COLORS[type],
                borderColor: `${TASK_SOURCE_TYPE_COLORS[type]}40`,
              }}
            >
              {TASK_SOURCE_TYPE_ICONS[type]} {TASK_SOURCE_TYPE_LABELS[type]} {count}
            </span>
          ))}
        </div>
      )}

      {topOwners.length > 0 && (
        <div className="meeting-task-owners">
          <span className="meeting-task-section-label">责任人分布：</span>
          {topOwners.map(([owner, count]) => (
            <span key={owner} className="owner-badge">
              👤 {owner} ({count})
            </span>
          ))}
        </div>
      )}

      <div className="meeting-task-list">
        {tasks.slice(0, 5).map(task => {
          const isOverdue = isTaskOverdue(task);
          const sourceColor = TASK_SOURCE_TYPE_COLORS[task.sourceType];
          const statusColor = TASK_STATUS_COLORS[task.status];

          return (
            <div
              key={task.id}
              className={`task-item ${isOverdue ? 'task-item-overdue' : ''}`}
              onClick={() => handleViewDetail(task.id)}
            >
              <div className="task-item-left">
                <span
                  className="task-item-type-icon"
                  style={{ background: `${sourceColor}15`, color: sourceColor }}
                >
                  {TASK_SOURCE_TYPE_ICONS[task.sourceType]}
                </span>
                <div className="task-item-content">
                  <div className="task-item-title">
                    {task.title}
                    {isOverdue && <span className="task-overdue-badge">已超时</span>}
                    {task.priority === 'high' && <span className="task-high-priority-badge">高优先级</span>}
                  </div>
                  <div className="task-item-desc">{task.description}</div>
                  <div className="task-item-meta">
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
                    <span className="task-item-meta-item">
                      👤 {task.owner || task.personInCharge || '未分配'}
                    </span>
                    {task.dueTime && (
                      <span className="task-item-meta-item">
                        ⏰ {task.dueTime.replace('T', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="task-item-right">
                <button className="btn btn-primary btn-sm">处理</button>
              </div>
            </div>
          );
        })}
        {tasks.length > 5 && (
          <div className="task-more-hint">
            还有 {tasks.length - 5} 项任务...
          </div>
        )}
      </div>
    </div>
  );
}

export default function PreMeetingTaskList() {
  const { state, dispatch, preMeetingTasksByMeeting, preMeetingTasksByRoom, preMeetingTasksByPerson, preMeetingTaskSummary } = useApp();
  const { taskGroupBy } = state;

  const groupByOptions = [
    { value: 'meeting', label: '按会议分组', icon: '📅' },
    { value: 'room', label: '按会议室分组', icon: '📍' },
    { value: 'person', label: '按负责人分组', icon: '👤' },
  ];

  const getGroupData = () => {
    switch (taskGroupBy) {
      case 'room':
        return { groups: preMeetingTasksByRoom, keyField: 'roomId' };
      case 'person':
        return { groups: preMeetingTasksByPerson, keyField: 'person' };
      case 'meeting':
      default:
        return { groups: preMeetingTasksByMeeting, keyField: 'meetingId' };
    }
  };

  const { groups, keyField } = getGroupData();

  const renderGroupCard = (group) => {
    switch (taskGroupBy) {
      case 'room':
        return <RoomTaskCard key={group[keyField]} roomGroup={group} />;
      case 'person':
        return <PersonTaskCard key={group[keyField]} personGroup={group} />;
      case 'meeting':
      default:
        return <MeetingTaskCard key={group[keyField]} meetingGroup={group} />;
    }
  };

  return (
    <div className="pre-meeting-task-container">
      <div className="app-header">
        <div className="app-title">
          <span className="app-title-icon">📋</span>
          会前保障任务清单
        </div>
        <div className="header-actions">
          <div className="task-group-toggle">
            {groupByOptions.map(opt => (
              <button
                key={opt.value}
                className={`btn-toggle ${taskGroupBy === opt.value ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SET_TASK_GROUP_BY', payload: opt.value })}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: RISK_VIEW.MAIN })}
          >
            🔙 返回物料准备
          </button>
        </div>
      </div>

      <TaskSummaryCards />

      <TaskFilterBar />

      <div className="meeting-tasks-container">
        {groups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <div className="empty-state-text">
              暂无会前保障任务，所有会议准备工作已就绪！
            </div>
          </div>
        ) : (
          groups.map(group => renderGroupCard(group))
        )}
      </div>
    </div>
  );
}
