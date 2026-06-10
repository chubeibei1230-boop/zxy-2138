import Dexie from 'dexie';

export const db = new Dexie('MeetingMaterialDB');

db.version(2).stores({
  rooms: '++id, name, capacity',
  categories: '++id, name, icon',
  meetings: '++id, title, date, batch, roomId, personInCharge, timeSlot, status',
  materials: '++id, meetingId, categoryId, name, requiredQty, preparedQty, shortageNote, status, roomId, personInCharge, batch',
  handovers: '++id, title, createdAt, handoverTime, handoverPerson, receiverPerson, remark, status, sourceType, materialCount',
  handoverItems: '++id, handoverId, materialId, confirmed, followUp, itemRemark, originalStatus, originalPreparedQty, confirmedPreparedQty',
});

db.version(3).stores({
  rooms: '++id, name, capacity',
  categories: '++id, name, icon',
  meetings: '++id, title, date, batch, roomId, personInCharge, timeSlot, status',
  materials: '++id, meetingId, categoryId, name, requiredQty, preparedQty, shortageNote, status, roomId, personInCharge, batch, followUp, handoverRemark',
  handovers: '++id, title, createdAt, handoverTime, handoverPerson, receiverPerson, remark, status, sourceType, materialCount',
  handoverItems: '++id, handoverId, materialId, confirmed, followUp, itemRemark, originalStatus, originalPreparedQty, confirmedPreparedQty',
});

db.version(4).stores({
  rooms: '++id, name, capacity',
  categories: '++id, name, icon',
  meetings: '++id, title, date, batch, roomId, personInCharge, timeSlot, status',
  materials: '++id, meetingId, categoryId, name, requiredQty, preparedQty, shortageNote, status, roomId, personInCharge, batch, followUp, handoverRemark, followUpStatus, followUpNote, followUpOwner, followUpDueTime, followUpCompletedAt',
  handovers: '++id, title, createdAt, handoverTime, handoverPerson, receiverPerson, remark, status, sourceType, materialCount',
  handoverItems: '++id, handoverId, materialId, confirmed, followUp, itemRemark, originalStatus, originalPreparedQty, confirmedPreparedQty, followUpStatus, followUpNote, followUpOwner, followUpDueTime',
});

db.version(5).stores({
  rooms: '++id, name, capacity',
  categories: '++id, name, icon',
  meetings: '++id, title, date, batch, roomId, personInCharge, timeSlot, status',
  materials: '++id, meetingId, categoryId, name, requiredQty, preparedQty, shortageNote, status, roomId, personInCharge, batch, followUp, handoverRemark, followUpStatus, followUpNote, followUpOwner, followUpDueTime, followUpCompletedAt, rectificationStatus, rectificationOwner, rectificationProgress, rectificationRemark, rectificationAssignedAt, rectificationCompletedAt, rectificationReturnedReason',
  handovers: '++id, title, createdAt, handoverTime, handoverPerson, receiverPerson, remark, status, sourceType, materialCount',
  handoverItems: '++id, handoverId, materialId, confirmed, followUp, itemRemark, originalStatus, originalPreparedQty, confirmedPreparedQty, followUpStatus, followUpNote, followUpOwner, followUpDueTime, rectificationStatus, rectificationOwner, rectificationProgress, rectificationRemark, rectificationAssignedAt, rectificationCompletedAt, rectificationReturnedReason',
  rectifications: '++id, sourceType, sourceId, materialId, meetingId, roomId, type, status, owner, creator, progress, remark, dueTime, assignedAt, completedAt, returnedReason, createdAt, updatedAt',
});

export function getLocalDatetimeLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const DEFAULT_CATEGORIES = [
  { name: '签到物料', icon: '📋' },
  { name: '指引贴', icon: '📍' },
  { name: '桌签', icon: '🏷️' },
  { name: '饮用水', icon: '💧' },
  { name: '备用用品', icon: '📦' },
];

export const DEFAULT_ROOMS = [
  { name: 'A101 大会议室', capacity: 50 },
  { name: 'A203 中会议室', capacity: 20 },
  { name: 'B305 小会议室', capacity: 10 },
  { name: 'C401 多功能厅', capacity: 100 },
];

export const MATERIAL_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  SHORTAGE: 'shortage',
  REVIEW: 'review',
};

export const STATUS_LABELS = {
  pending: '待准备',
  preparing: '准备中',
  ready: '已备齐',
  shortage: '短缺',
  review: '需复核',
};

export const STATUS_COLORS = {
  pending: '#94a3b8',
  preparing: '#f59e0b',
  ready: '#10b981',
  shortage: '#ef4444',
  review: '#8b5cf6',
};

export const HANDOVER_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

export const HANDOVER_STATUS_LABELS = {
  draft: '草稿',
  in_progress: '交接中',
  completed: '已完成',
  archived: '已归档',
};

export const HANDOVER_STATUS_COLORS = {
  draft: '#94a3b8',
  in_progress: '#f59e0b',
  completed: '#10b981',
  archived: '#64748b',
};

export const HANDOVER_SOURCE_TYPE = {
  FILTERED: 'filtered',
  SELECTED: 'selected',
};

export const FOLLOW_UP_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  OVERDUE: 'overdue',
  COMPLETED: 'completed',
};

export const FOLLOW_UP_STATUS_LABELS = {
  none: '无跟进',
  pending: '待跟进',
  overdue: '已逾期',
  completed: '已完成跟进',
};

export const FOLLOW_UP_STATUS_COLORS = {
  none: '#94a3b8',
  pending: '#f59e0b',
  overdue: '#ef4444',
  completed: '#10b981',
};

export const RISK_LEVEL = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  NONE: 'none',
};

export const RISK_LEVEL_LABELS = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
  none: '正常',
};

export const RISK_LEVEL_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
  none: '#10b981',
};

export const RISK_FACTOR_TYPE = {
  SHORTAGE: 'shortage',
  FOLLOW_UP_OVERDUE: 'follow_up_overdue',
  FOLLOW_UP_PENDING: 'follow_up_pending',
  REVIEW: 'review',
  HANDOVER_INCOMPLETE: 'handover_incomplete',
};

export const RISK_FACTOR_LABELS = {
  shortage: '物料短缺',
  follow_up_overdue: '逾期跟进',
  follow_up_pending: '待跟进',
  review: '需复核',
  handover_incomplete: '交接未完成',
};

export const RECTIFICATION_TYPE = {
  SHORTAGE: 'shortage',
  REVIEW: 'review',
  FOLLOW_UP_PENDING: 'follow_up_pending',
  FOLLOW_UP_OVERDUE: 'follow_up_overdue',
  HANDOVER_INCOMPLETE: 'handover_incomplete',
};

export const RECTIFICATION_TYPE_LABELS = {
  shortage: '短缺',
  review: '需复核',
  follow_up_pending: '待跟进',
  follow_up_overdue: '逾期跟进',
  handover_incomplete: '交接未完成',
};

export const RECTIFICATION_TYPE_COLORS = {
  shortage: '#ef4444',
  review: '#8b5cf6',
  follow_up_pending: '#f59e0b',
  follow_up_overdue: '#dc2626',
  handover_incomplete: '#7c3aed',
};

export const RECTIFICATION_TYPE_ICONS = {
  shortage: '📦',
  review: '🔍',
  follow_up_pending: '⏩',
  follow_up_overdue: '⏰',
  handover_incomplete: '🤝',
};

export const RECTIFICATION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  PENDING_REVIEW: 'pending_review',
  COMPLETED: 'completed',
};

export const RECTIFICATION_STATUS_LABELS = {
  pending: '待认领',
  in_progress: '处理中',
  pending_review: '待复核',
  completed: '已完成',
};

export const RECTIFICATION_STATUS_COLORS = {
  pending: '#94a3b8',
  in_progress: '#3b82f6',
  pending_review: '#f59e0b',
  completed: '#10b981',
};

export const RECTIFICATION_SOURCE_TYPE = {
  MATERIAL: 'material',
  HANDOVER_ITEM: 'handover_item',
};

export function getFollowUpStatus(material) {
  if (!material || !material.followUpStatus || material.followUpStatus === FOLLOW_UP_STATUS.NONE) {
    return material.followUp ? FOLLOW_UP_STATUS.PENDING : FOLLOW_UP_STATUS.NONE;
  }
  if (material.followUpStatus === FOLLOW_UP_STATUS.COMPLETED) {
    return FOLLOW_UP_STATUS.COMPLETED;
  }
  if (material.followUpStatus === FOLLOW_UP_STATUS.PENDING && material.followUpDueTime) {
    const now = new Date();
    const due = new Date(material.followUpDueTime);
    if (now > due) {
      return FOLLOW_UP_STATUS.OVERDUE;
    }
  }
  return material.followUpStatus;
}

export async function seedDatabase() {
  const roomsCount = await db.rooms.count();
  if (roomsCount === 0) {
    const roomIds = await db.rooms.bulkAdd(DEFAULT_ROOMS, { allKeys: true });

    const categoryIds = await db.categories.bulkAdd(DEFAULT_CATEGORIES, { allKeys: true });

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    const formatDate = (d) => d.toISOString().split('T')[0];

    const meetings = [
      {
        title: '季度业务复盘会',
        date: formatDate(today),
        batch: '2026-Q2-第一批',
        roomId: roomIds[0],
        personInCharge: '张伟',
        timeSlot: '09:00-12:00',
        status: 'confirmed',
      },
      {
        title: '产品评审会',
        date: formatDate(today),
        batch: '2026-Q2-第一批',
        roomId: roomIds[1],
        personInCharge: '李娜',
        timeSlot: '14:00-17:00',
        status: 'confirmed',
      },
      {
        title: '客户签约仪式',
        date: formatDate(tomorrow),
        batch: '2026-Q2-第二批',
        roomId: roomIds[3],
        personInCharge: '王芳',
        timeSlot: '10:00-11:30',
        status: 'confirmed',
      },
      {
        title: '技术分享会',
        date: formatDate(tomorrow),
        batch: '2026-Q2-第二批',
        roomId: roomIds[2],
        personInCharge: '赵强',
        timeSlot: '15:00-17:00',
        status: 'tentative',
      },
      {
        title: '新员工入职培训',
        date: formatDate(dayAfter),
        batch: '2026-Q2-第三批',
        roomId: roomIds[3],
        personInCharge: '刘敏',
        timeSlot: '09:00-17:00',
        status: 'confirmed',
      },
    ];

    const meetingIds = await db.meetings.bulkAdd(meetings, { allKeys: true });

    const materials = [];
    const categoryConfig = {
      [DEFAULT_CATEGORIES[0].name]: [
        { name: '签到表', baseQty: 5 },
        { name: '签字笔', baseQty: 10 },
        { name: '参会证', baseQty: 30 },
      ],
      [DEFAULT_CATEGORIES[1].name]: [
        { name: '入口指引', baseQty: 2 },
        { name: '楼层指引', baseQty: 3 },
        { name: '卫生间指引', baseQty: 2 },
      ],
      [DEFAULT_CATEGORIES[2].name]: [
        { name: '主桌桌签', baseQty: 5 },
        { name: '嘉宾桌签', baseQty: 10 },
      ],
      [DEFAULT_CATEGORIES[3].name]: [
        { name: '瓶装矿泉水', baseQty: 50 },
        { name: '纸杯', baseQty: 30 },
      ],
      [DEFAULT_CATEGORIES[4].name]: [
        { name: '订书机', baseQty: 2 },
        { name: '便签纸', baseQty: 5 },
        { name: '充电宝', baseQty: 3 },
      ],
    };

    meetings.forEach((meeting, idx) => {
      const meetingId = meetingIds[idx];
      const capacity = DEFAULT_ROOMS.find(r => r.name === DEFAULT_ROOMS[roomIds.indexOf(meeting.roomId)]?.name)?.capacity || 20;
      const factor = Math.max(1, Math.floor(capacity / 20));

      DEFAULT_CATEGORIES.forEach((cat, catIdx) => {
        const categoryId = categoryIds[catIdx];
        const configs = categoryConfig[cat.name] || [];

        configs.forEach(config => {
          const requiredQty = config.baseQty * factor;
          const preparedQty = Math.random() > 0.4 ? requiredQty : Math.floor(requiredQty * Math.random() * 0.7);
          const isShortage = preparedQty < requiredQty;
          const status = isShortage
            ? (Math.random() > 0.5 ? MATERIAL_STATUS.SHORTAGE : MATERIAL_STATUS.PREPARING)
            : (Math.random() > 0.3 ? MATERIAL_STATUS.READY : (Math.random() > 0.5 ? MATERIAL_STATUS.REVIEW : MATERIAL_STATUS.PENDING));

          materials.push({
            meetingId,
            categoryId,
            name: config.name,
            requiredQty,
            preparedQty,
            shortageNote: isShortage ? `缺口${requiredQty - preparedQty}件，需向仓库申请补充` : '',
            status,
            roomId: meeting.roomId,
            personInCharge: meeting.personInCharge,
            batch: meeting.batch,
          });
        });
      });
    });

    await db.materials.bulkAdd(materials);
  }
}
