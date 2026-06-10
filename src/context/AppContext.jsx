import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { db, seedDatabase, MATERIAL_STATUS, HANDOVER_STATUS, HANDOVER_SOURCE_TYPE, getLocalDatetimeLocal, FOLLOW_UP_STATUS, getFollowUpStatus, RISK_LEVEL, RISK_FACTOR_TYPE, RECTIFICATION_TYPE, RECTIFICATION_STATUS, RECTIFICATION_SOURCE_TYPE, TASK_SOURCE_TYPE, TASK_STATUS, isTaskOverdue } from '../db';

const AppContext = createContext(null);

export const GROUP_BY = {
  ROOM: 'room',
  BATCH: 'batch',
  PERSON: 'person',
};

export const RISK_VIEW = {
  MAIN: 'main',
  DASHBOARD: 'dashboard',
  RECTIFICATION: 'rectification',
  TASK_LIST: 'task_list',
};

export const RECTIFICATION_GROUP_BY = {
  MEETING: 'meeting',
  ROOM: 'room',
  PERSON: 'person',
  TYPE: 'type',
};

const initialState = {
  rooms: [],
  categories: [],
  meetings: [],
  materials: [],
  handovers: [],
  handoverItems: [],
  rectifications: [],
  loading: true,
  filters: {
    dateRange: { start: '', end: '' },
    roomIds: [],
    personInCharges: [],
    statuses: [],
    shortageOnly: false,
    followUpStatuses: [],
  },
  groupBy: GROUP_BY.ROOM,
  reviewMode: false,
  selectedMaterialIds: [],
  detailMaterial: null,
  mobileDetailExpanded: true,
  showHandoverModal: false,
  currentHandoverId: null,
  handoverSourceType: HANDOVER_SOURCE_TYPE.FILTERED,
  currentView: RISK_VIEW.MAIN,
  riskFilters: {
    dateRange: { start: '', end: '' },
    roomIds: [],
    personInCharges: [],
    meetingIds: [],
    riskLevels: [],
  },
  selectedRiskMeetingId: null,
  riskMobileDetailExpanded: false,
  rectificationGroupBy: RECTIFICATION_GROUP_BY.TYPE,
  rectificationFilters: {
    dateRange: { start: '', end: '' },
    roomIds: [],
    personInCharges: [],
    meetingIds: [],
    types: [],
    statuses: [],
    owners: [],
  },
  selectedRectificationId: null,
  selectedRectificationQuery: null,
  showRectificationModal: false,
  rectificationMobileDetailExpanded: false,
  taskFilters: {
    dateRange: { start: '', end: '' },
    roomIds: [],
    meetingIds: [],
    personInCharges: [],
    riskLevels: [],
    sourceTypes: [],
    statuses: [],
  },
  selectedTaskId: null,
  showTaskModal: false,
  taskMobileDetailExpanded: false,
  taskGroupBy: 'meeting',
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return {
        ...state,
        rooms: action.payload.rooms,
        categories: action.payload.categories,
        meetings: action.payload.meetings,
        materials: action.payload.materials,
        loading: false,
      };
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        selectedMaterialIds: [],
      };
    case 'SET_GROUP_BY':
      return { ...state, groupBy: action.payload, selectedMaterialIds: [] };
    case 'TOGGLE_REVIEW_MODE':
      return { ...state, reviewMode: !state.reviewMode, selectedMaterialIds: [] };
    case 'TOGGLE_SELECT_MATERIAL': {
      const id = action.payload;
      const exists = state.selectedMaterialIds.includes(id);
      return {
        ...state,
        selectedMaterialIds: exists
          ? state.selectedMaterialIds.filter(i => i !== id)
          : [...state.selectedMaterialIds, id],
      };
    }
    case 'SET_SELECTED_MATERIALS':
      return { ...state, selectedMaterialIds: action.payload };
    case 'SET_DETAIL_MATERIAL':
      return { ...state, detailMaterial: action.payload };
    case 'TOGGLE_MOBILE_DETAIL':
      return { ...state, mobileDetailExpanded: !state.mobileDetailExpanded };
    case 'UPDATE_MATERIALS': {
      const updatedMap = new Map(action.payload.map(m => [m.id, m]));
      let nextDetailMaterial = state.detailMaterial;
      if (state.detailMaterial && updatedMap.has(state.detailMaterial.id)) {
        nextDetailMaterial = { ...state.detailMaterial, ...updatedMap.get(state.detailMaterial.id) };
      }
      return {
        ...state,
        materials: state.materials.map(m => updatedMap.has(m.id) ? { ...m, ...updatedMap.get(m.id) } : m),
        detailMaterial: nextDetailMaterial,
      };
    }
    case 'ADD_MATERIALS':
      return { ...state, materials: [...state.materials, ...action.payload] };
    case 'DELETE_MATERIALS':
      return {
        ...state,
        materials: state.materials.filter(m => !action.payload.includes(m.id)),
        selectedMaterialIds: state.selectedMaterialIds.filter(id => !action.payload.includes(id)),
        detailMaterial: action.payload.includes(state.detailMaterial?.id) ? null : state.detailMaterial,
      };
    case 'MOVE_MATERIALS': {
      const { ids, targetRoomId, targetMeetingId, targetBatch, targetPerson } = action.payload;
      let nextDetailMaterial = state.detailMaterial;
      const newMaterials = state.materials.map(m => {
        if (!ids.includes(m.id)) return m;
        const updated = {
          ...m,
          roomId: targetRoomId ?? m.roomId,
          meetingId: targetMeetingId ?? m.meetingId,
          batch: targetBatch ?? m.batch,
          personInCharge: targetPerson ?? m.personInCharge,
        };
        if (state.detailMaterial && state.detailMaterial.id === m.id) {
          nextDetailMaterial = updated;
        }
        return updated;
      });
      return {
        ...state,
        materials: newMaterials,
        detailMaterial: nextDetailMaterial,
      };
    }
    case 'SET_HANDOVER_DATA':
      return {
        ...state,
        handovers: action.payload.handovers,
        handoverItems: action.payload.handoverItems,
      };
    case 'SET_RECTIFICATIONS':
      return { ...state, rectifications: action.payload };
    case 'UPDATE_RECTIFICATIONS': {
      const updatedMap = new Map(action.payload.map(r => [r.id, r]));
      return {
        ...state,
        rectifications: state.rectifications.map(r => updatedMap.has(r.id) ? { ...r, ...updatedMap.get(r.id) } : r),
      };
    }
    case 'ADD_RECTIFICATIONS':
      return { ...state, rectifications: [...state.rectifications, ...action.payload] };
    case 'DELETE_RECTIFICATIONS':
      return {
        ...state,
        rectifications: state.rectifications.filter(r => !action.payload.includes(r.id)),
        selectedRectificationId: action.payload.includes(state.selectedRectificationId) ? null : state.selectedRectificationId,
      };
    case 'OPEN_HANDOVER_MODAL':
      return {
        ...state,
        showHandoverModal: true,
        currentHandoverId: action.payload?.handoverId ?? null,
        handoverSourceType: action.payload?.sourceType ?? HANDOVER_SOURCE_TYPE.FILTERED,
      };
    case 'CLOSE_HANDOVER_MODAL':
      return {
        ...state,
        showHandoverModal: false,
        currentHandoverId: null,
      };
    case 'ADD_HANDOVER':
      return {
        ...state,
        handovers: [...state.handovers, action.payload.handover],
        handoverItems: [...state.handoverItems, ...action.payload.items],
        currentHandoverId: action.payload.handover.id,
      };
    case 'UPDATE_HANDOVER': {
      const updatedMap = new Map([[action.payload.id, action.payload]]);
      return {
        ...state,
        handovers: state.handovers.map(h => updatedMap.has(h.id) ? { ...h, ...updatedMap.get(h.id) } : h),
      };
    }
    case 'UPDATE_HANDOVER_ITEMS': {
      const updatedMap = new Map(action.payload.map(i => [i.id, i]));
      return {
        ...state,
        handoverItems: state.handoverItems.map(i => updatedMap.has(i.id) ? { ...i, ...updatedMap.get(i.id) } : i),
      };
    }
    case 'DELETE_HANDOVER':
      return {
        ...state,
        handovers: state.handovers.filter(h => h.id !== action.payload),
        handoverItems: state.handoverItems.filter(i => i.handoverId !== action.payload),
        currentHandoverId: state.currentHandoverId === action.payload ? null : state.currentHandoverId,
      };
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_RISK_FILTERS':
      return {
        ...state,
        riskFilters: { ...state.riskFilters, ...action.payload },
        selectedRiskMeetingId: null,
      };
    case 'SET_SELECTED_RISK_MEETING':
      return { ...state, selectedRiskMeetingId: action.payload, riskMobileDetailExpanded: true };
    case 'TOGGLE_RISK_MOBILE_DETAIL':
      return { ...state, riskMobileDetailExpanded: !state.riskMobileDetailExpanded };
    case 'SET_RECTIFICATION_GROUP_BY':
      return { ...state, rectificationGroupBy: action.payload };
    case 'SET_RECTIFICATION_FILTERS':
      return {
        ...state,
        rectificationFilters: { ...state.rectificationFilters, ...action.payload },
        selectedRectificationId: null,
      };
    case 'SET_SELECTED_RECTIFICATION':
      return { ...state, selectedRectificationId: action.payload, rectificationMobileDetailExpanded: true };
    case 'TOGGLE_RECTIFICATION_MOBILE_DETAIL':
      return { ...state, rectificationMobileDetailExpanded: !state.rectificationMobileDetailExpanded };
    case 'OPEN_RECTIFICATION_MODAL':
      return { ...state, showRectificationModal: true, selectedRectificationId: action.payload?.id ?? state.selectedRectificationId };
    case 'CLOSE_RECTIFICATION_MODAL':
      return { ...state, showRectificationModal: false };
    case 'SET_SELECTED_RECTIFICATION_QUERY':
      return { ...state, selectedRectificationQuery: action.payload };
    case 'SET_TASK_FILTERS':
      return {
        ...state,
        taskFilters: { ...state.taskFilters, ...action.payload },
        selectedTaskId: null,
      };
    case 'SET_SELECTED_TASK':
      return { ...state, selectedTaskId: action.payload, taskMobileDetailExpanded: true };
    case 'TOGGLE_TASK_MOBILE_DETAIL':
      return { ...state, taskMobileDetailExpanded: !state.taskMobileDetailExpanded };
    case 'OPEN_TASK_MODAL':
      return { ...state, showTaskModal: true, selectedTaskId: action.payload?.id ?? state.selectedTaskId };
    case 'CLOSE_TASK_MODAL':
      return { ...state, showTaskModal: false };
    case 'SET_TASK_GROUP_BY':
      return { ...state, taskGroupBy: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    async function init() {
      await seedDatabase();
      const [rooms, categories, meetings, materials, handovers, handoverItems, rectifications] = await Promise.all([
        db.rooms.toArray(),
        db.categories.toArray(),
        db.meetings.toArray(),
        db.materials.toArray(),
        db.handovers.toArray(),
        db.handoverItems.toArray(),
        db.rectifications.toArray(),
      ]);
      dispatch({ type: 'SET_DATA', payload: { rooms, categories, meetings, materials } });
      dispatch({ type: 'SET_HANDOVER_DATA', payload: { handovers, handoverItems } });
      dispatch({ type: 'SET_RECTIFICATIONS', payload: rectifications });
    }
    init();
  }, []);

  const filteredMaterials = useMemo(() => {
    const { dateRange, roomIds, personInCharges, statuses, shortageOnly, followUpStatuses } = state.filters;
    let result = [...state.materials];

    if (dateRange.start) {
      result = result.filter(m => {
        const meeting = state.meetings.find(met => met.id === m.meetingId);
        return meeting && meeting.date >= dateRange.start;
      });
    }
    if (dateRange.end) {
      result = result.filter(m => {
        const meeting = state.meetings.find(met => met.id === m.meetingId);
        return meeting && meeting.date <= dateRange.end;
      });
    }
    if (roomIds.length > 0) {
      result = result.filter(m => roomIds.includes(m.roomId));
    }
    if (personInCharges.length > 0) {
      result = result.filter(m => personInCharges.includes(m.personInCharge));
    }
    if (statuses.length > 0) {
      result = result.filter(m => statuses.includes(m.status));
    }
    if (shortageOnly) {
      result = result.filter(m => m.preparedQty < m.requiredQty || m.status === MATERIAL_STATUS.SHORTAGE);
    }
    if (followUpStatuses.length > 0) {
      result = result.filter(m => followUpStatuses.includes(getFollowUpStatus(m)));
    }

    if (state.reviewMode) {
      result = result.filter(m =>
        m.status !== MATERIAL_STATUS.READY ||
        m.preparedQty < m.requiredQty ||
        m.status === MATERIAL_STATUS.REVIEW
      );
    }

    return result;
  }, [state.materials, state.meetings, state.filters, state.reviewMode]);

  const summary = useMemo(() => {
    const all = state.materials;
    const totalRequired = all.reduce((s, m) => s + m.requiredQty, 0);
    const totalPrepared = all.reduce((s, m) => s + Math.min(m.preparedQty, m.requiredQty), 0);
    const shortageQty = all.reduce((s, m) => s + Math.max(0, m.requiredQty - m.preparedQty), 0);
    const shortageItems = all.filter(m => m.preparedQty < m.requiredQty || m.status === MATERIAL_STATUS.SHORTAGE).length;
    const readyCount = all.filter(m => m.status === MATERIAL_STATUS.READY && m.preparedQty >= m.requiredQty).length;

    const followUpPendingCount = all.filter(m => getFollowUpStatus(m) === FOLLOW_UP_STATUS.PENDING).length;
    const followUpOverdueCount = all.filter(m => getFollowUpStatus(m) === FOLLOW_UP_STATUS.OVERDUE).length;
    const followUpCompletedCount = all.filter(m => getFollowUpStatus(m) === FOLLOW_UP_STATUS.COMPLETED).length;

    const roomStats = {};
    state.rooms.forEach(room => {
      const roomMaterials = all.filter(m => m.roomId === room.id);
      const roomTotal = roomMaterials.length;
      const roomReady = roomMaterials.filter(m => m.status === MATERIAL_STATUS.READY && m.preparedQty >= m.requiredQty).length;
      const roomShortage = roomMaterials.reduce((s, m) => s + Math.max(0, m.requiredQty - m.preparedQty), 0);
      const roomFollowUpPending = roomMaterials.filter(m => getFollowUpStatus(m) === FOLLOW_UP_STATUS.PENDING).length;
      const roomFollowUpOverdue = roomMaterials.filter(m => getFollowUpStatus(m) === FOLLOW_UP_STATUS.OVERDUE).length;
      roomStats[room.id] = {
        roomName: room.name,
        total: roomTotal,
        ready: roomReady,
        shortageQty: roomShortage,
        rate: roomTotal > 0 ? Math.round((roomReady / roomTotal) * 100) : 0,
        followUpPending: roomFollowUpPending,
        followUpOverdue: roomFollowUpOverdue,
      };
    });

    return {
      totalRequired,
      totalPrepared,
      shortageQty,
      shortageItems,
      readyCount,
      totalItems: all.length,
      roomStats,
      followUpPendingCount,
      followUpOverdueCount,
      followUpCompletedCount,
    };
  }, [state.materials, state.rooms]);

  const riskAnalysis = useMemo(() => {
    const { dateRange, roomIds, personInCharges, meetingIds, riskLevels } = state.riskFilters;
    const all = state.materials;

    const meetingsMap = new Map();
    state.meetings.forEach(m => meetingsMap.set(m.id, m));

    const roomsMap = new Map();
    state.rooms.forEach(r => roomsMap.set(r.id, r));

    const incompleteHandoverMap = new Map();
    state.handovers.forEach(h => {
      if (h.status !== HANDOVER_STATUS.COMPLETED && h.status !== HANDOVER_STATUS.ARCHIVED) {
        const items = state.handoverItems.filter(hi => hi.handoverId === h.id && !hi.confirmed);
        items.forEach(item => {
          const material = all.find(m => m.id === item.materialId);
          if (!material) return;
          if (!incompleteHandoverMap.has(material.meetingId)) {
            incompleteHandoverMap.set(material.meetingId, []);
          }
          incompleteHandoverMap.get(material.meetingId).push({
            handover: h,
            handoverItem: item,
            material,
          });
        });
      }
    });

    const meetingRiskMap = new Map();

    all.forEach(material => {
      const meeting = meetingsMap.get(material.meetingId);
      if (!meeting) return;

      if (!meetingRiskMap.has(meeting.id)) {
        meetingRiskMap.set(meeting.id, {
          meetingId: meeting.id,
          meeting,
          room: roomsMap.get(meeting.roomId),
          materials: [],
          riskFactors: [],
          shortageMaterials: [],
          overdueFollowUpMaterials: [],
          pendingFollowUpMaterials: [],
          reviewMaterials: [],
          handoverIncompleteItems: [],
          totalShortageQty: 0,
          involvedRoomIds: new Set(),
          involvedPersons: new Set(),
        });
      }

      const riskData = meetingRiskMap.get(meeting.id);
      riskData.materials.push(material);
      riskData.involvedRoomIds.add(material.roomId);
      if (material.personInCharge) riskData.involvedPersons.add(material.personInCharge);
      if (meeting.personInCharge) riskData.involvedPersons.add(meeting.personInCharge);

      const isShortage = material.preparedQty < material.requiredQty || material.status === MATERIAL_STATUS.SHORTAGE;
      if (isShortage) {
        riskData.shortageMaterials.push(material);
        riskData.totalShortageQty += Math.max(0, material.requiredQty - material.preparedQty);
      }

      const fStatus = getFollowUpStatus(material);
      if (fStatus === FOLLOW_UP_STATUS.OVERDUE) {
        riskData.overdueFollowUpMaterials.push(material);
      } else if (fStatus === FOLLOW_UP_STATUS.PENDING) {
        riskData.pendingFollowUpMaterials.push(material);
      }

      if (material.status === MATERIAL_STATUS.REVIEW) {
        riskData.reviewMaterials.push(material);
      }
    });

    incompleteHandoverMap.forEach((items, meetingId) => {
      if (meetingRiskMap.has(meetingId)) {
        const riskData = meetingRiskMap.get(meetingId);
        riskData.handoverIncompleteItems = items;
        items.forEach(({ material }) => {
          riskData.involvedRoomIds.add(material.roomId);
          if (material.personInCharge) riskData.involvedPersons.add(material.personInCharge);
        });
      } else {
        const meeting = meetingsMap.get(meetingId);
        if (meeting) {
          const involvedRoomIds = new Set();
          const involvedPersons = new Set();
          items.forEach(({ material }) => {
            involvedRoomIds.add(material.roomId);
            if (material.personInCharge) involvedPersons.add(material.personInCharge);
          });
          if (meeting.personInCharge) involvedPersons.add(meeting.personInCharge);
          involvedRoomIds.add(meeting.roomId);
          meetingRiskMap.set(meetingId, {
            meetingId: meeting.id,
            meeting,
            room: roomsMap.get(meeting.roomId),
            materials: [],
            riskFactors: [],
            shortageMaterials: [],
            overdueFollowUpMaterials: [],
            pendingFollowUpMaterials: [],
            reviewMaterials: [],
            handoverIncompleteItems: items,
            totalShortageQty: 0,
            involvedRoomIds,
            involvedPersons,
          });
        }
      }
    });

    let meetingsRisk = Array.from(meetingRiskMap.values()).map(riskData => {
      const riskFactors = [];
      let riskScore = 0;

      if (riskData.shortageMaterials.length > 0) {
        const severity = riskData.totalShortageQty >= 20 || riskData.shortageMaterials.length >= 5 ? 'high' : riskData.totalShortageQty >= 5 ? 'medium' : 'low';
        riskFactors.push({
          type: RISK_FACTOR_TYPE.SHORTAGE,
          count: riskData.shortageMaterials.length,
          qty: riskData.totalShortageQty,
          severity,
        });
        riskScore += severity === 'high' ? 40 : severity === 'medium' ? 20 : 10;
      }

      if (riskData.overdueFollowUpMaterials.length > 0) {
        const severity = riskData.overdueFollowUpMaterials.length >= 3 ? 'high' : riskData.overdueFollowUpMaterials.length >= 1 ? 'medium' : 'low';
        riskFactors.push({
          type: RISK_FACTOR_TYPE.FOLLOW_UP_OVERDUE,
          count: riskData.overdueFollowUpMaterials.length,
          severity,
        });
        riskScore += severity === 'high' ? 50 : severity === 'medium' ? 30 : 15;
      }

      if (riskData.pendingFollowUpMaterials.length > 0) {
        const severity = riskData.pendingFollowUpMaterials.length >= 5 ? 'medium' : 'low';
        riskFactors.push({
          type: RISK_FACTOR_TYPE.FOLLOW_UP_PENDING,
          count: riskData.pendingFollowUpMaterials.length,
          severity,
        });
        riskScore += severity === 'medium' ? 12 : 6;
      }

      if (riskData.reviewMaterials.length > 0) {
        const severity = riskData.reviewMaterials.length >= 5 ? 'medium' : 'low';
        riskFactors.push({
          type: RISK_FACTOR_TYPE.REVIEW,
          count: riskData.reviewMaterials.length,
          severity,
        });
        riskScore += severity === 'medium' ? 15 : 8;
      }

      if (riskData.handoverIncompleteItems.length > 0) {
        const severity = riskData.handoverIncompleteItems.length >= 10 ? 'high' : riskData.handoverIncompleteItems.length >= 3 ? 'medium' : 'low';
        riskFactors.push({
          type: RISK_FACTOR_TYPE.HANDOVER_INCOMPLETE,
          count: riskData.handoverIncompleteItems.length,
          severity,
        });
        riskScore += severity === 'high' ? 35 : severity === 'medium' ? 18 : 9;
      }

      let riskLevel;
      if (riskScore >= 50) riskLevel = RISK_LEVEL.HIGH;
      else if (riskScore >= 25) riskLevel = RISK_LEVEL.MEDIUM;
      else if (riskScore >= 8) riskLevel = RISK_LEVEL.LOW;
      else riskLevel = RISK_LEVEL.NONE;

      const readyCount = riskData.materials.filter(m =>
        m.status === MATERIAL_STATUS.READY && m.preparedQty >= m.requiredQty
      ).length;
      const completionRate = riskData.materials.length > 0
        ? Math.round((readyCount / riskData.materials.length) * 100)
        : 0;

      return {
        ...riskData,
        riskFactors,
        riskLevel,
        riskScore,
        completionRate,
        readyCount,
        totalMaterials: riskData.materials.length,
      };
    });

    meetingsRisk = meetingsRisk.map(riskData => ({
      ...riskData,
      involvedRoomIds: Array.from(riskData.involvedRoomIds),
      involvedPersons: Array.from(riskData.involvedPersons),
    }));

    meetingsRisk = meetingsRisk.filter(risk => {
      const meeting = risk.meeting;
      if (dateRange.start && meeting.date < dateRange.start) return false;
      if (dateRange.end && meeting.date > dateRange.end) return false;
      if (roomIds.length > 0) {
        const hasMatch = roomIds.some(rid => risk.involvedRoomIds.includes(rid));
        if (!hasMatch) return false;
      }
      if (personInCharges.length > 0) {
        const hasMatch = personInCharges.some(pic => risk.involvedPersons.includes(pic));
        if (!hasMatch) return false;
      }
      if (meetingIds.length > 0 && !meetingIds.includes(meeting.id)) return false;
      if (riskLevels.length === 0) {
        if (risk.riskLevel === RISK_LEVEL.NONE) return false;
      } else {
        if (!riskLevels.includes(risk.riskLevel)) return false;
      }
      return true;
    });

    const riskLevelPriority = { high: 0, medium: 1, low: 2, none: 3 };
    meetingsRisk.sort((a, b) => {
      if (riskLevelPriority[a.riskLevel] !== riskLevelPriority[b.riskLevel]) {
        return riskLevelPriority[a.riskLevel] - riskLevelPriority[b.riskLevel];
      }
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      return a.meeting.date.localeCompare(b.meeting.date);
    });

    let highRiskCount = 0;
    let overdueFollowUpTotal = 0;
    let shortageMaterialsTotal = 0;
    let handoverPendingTotal = 0;
    let pendingFollowUpTotal = 0;
    let reviewTotal = 0;

    meetingsRisk.forEach(r => {
      if (r.riskLevel === RISK_LEVEL.HIGH) highRiskCount++;
      overdueFollowUpTotal += r.overdueFollowUpMaterials.length;
      shortageMaterialsTotal += r.shortageMaterials.length;
      handoverPendingTotal += r.handoverIncompleteItems.length;
      pendingFollowUpTotal += r.pendingFollowUpMaterials.length;
      reviewTotal += r.reviewMaterials.length;
    });

    return {
      meetingsRisk,
      summary: {
        highRiskCount,
        overdueFollowUpTotal,
        shortageMaterialsTotal,
        handoverPendingTotal,
        pendingFollowUpTotal,
        reviewTotal,
        totalMeetings: meetingsRisk.length,
        riskMeetingsCount: meetingsRisk.filter(r => r.riskLevel !== RISK_LEVEL.NONE).length,
      },
    };
  }, [state.materials, state.meetings, state.rooms, state.handovers, state.handoverItems, state.riskFilters]);

  const groupedMaterials = useMemo(() => {
    const groups = {};
    const getKey = (m) => {
      switch (state.groupBy) {
        case GROUP_BY.ROOM:
          return m.roomId;
        case GROUP_BY.BATCH:
          return m.batch;
        case GROUP_BY.PERSON:
          return m.personInCharge;
        default:
          return m.roomId;
      }
    };
    const getLabel = (m) => {
      switch (state.groupBy) {
        case GROUP_BY.ROOM: {
          const room = state.rooms.find(r => r.id === m.roomId);
          return room?.name || '未知会议室';
        }
        case GROUP_BY.BATCH:
          return m.batch || '未分组批次';
        case GROUP_BY.PERSON:
          return m.personInCharge || '未分配';
        default:
          return '未分组';
      }
    };

    filteredMaterials.forEach(m => {
      const key = getKey(m);
      if (!groups[key]) {
        groups[key] = { key, label: getLabel(m), items: [] };
      }
      groups[key].items.push(m);
    });

    return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredMaterials, state.groupBy, state.rooms]);

  const rectificationItems = useMemo(() => {
    const items = [];
    const meetingsMap = new Map();
    state.meetings.forEach(m => meetingsMap.set(m.id, m));
    const roomsMap = new Map();
    state.rooms.forEach(r => roomsMap.set(r.id, r));
    const categoriesMap = new Map();
    state.categories.forEach(c => categoriesMap.set(c.id, c));

    state.materials.forEach(material => {
      const meeting = meetingsMap.get(material.meetingId);
      const room = roomsMap.get(material.roomId);
      const category = categoriesMap.get(material.categoryId);
      const fStatus = getFollowUpStatus(material);
      const isShortage = material.preparedQty < material.requiredQty || material.status === MATERIAL_STATUS.SHORTAGE;

      const baseItem = {
        id: `mat_${material.id}_`,
        sourceType: RECTIFICATION_SOURCE_TYPE.MATERIAL,
        sourceId: material.id,
        materialId: material.id,
        material,
        meetingId: material.meetingId,
        meeting,
        roomId: material.roomId,
        room,
        category,
        personInCharge: material.personInCharge || meeting?.personInCharge || '',
        shortageQty: Math.max(0, material.requiredQty - material.preparedQty),
      };

      if (isShortage) {
        const existingRect = state.rectifications.find(
          r => r.sourceType === RECTIFICATION_SOURCE_TYPE.MATERIAL && r.sourceId === material.id && r.type === RECTIFICATION_TYPE.SHORTAGE
        );
        const rectStatus = existingRect?.status || RECTIFICATION_STATUS.PENDING;
        if (rectStatus !== RECTIFICATION_STATUS.COMPLETED) {
          items.push({
            ...baseItem,
            id: `mat_${material.id}_shortage`,
            type: RECTIFICATION_TYPE.SHORTAGE,
            status: rectStatus,
            owner: existingRect?.owner || '',
            progress: existingRect?.progress || '',
            remark: existingRect?.remark || material.shortageNote || '',
            dueTime: existingRect?.dueTime || '',
            assignedAt: existingRect?.assignedAt || '',
            completedAt: existingRect?.completedAt || '',
            returnedReason: existingRect?.returnedReason || '',
            _rectId: existingRect?.id || null,
          });
        }
      }

      if (material.status === MATERIAL_STATUS.REVIEW) {
        const existingRect = state.rectifications.find(
          r => r.sourceType === RECTIFICATION_SOURCE_TYPE.MATERIAL && r.sourceId === material.id && r.type === RECTIFICATION_TYPE.REVIEW
        );
        const rectStatus = existingRect?.status || RECTIFICATION_STATUS.PENDING;
        if (rectStatus !== RECTIFICATION_STATUS.COMPLETED) {
          items.push({
            ...baseItem,
            id: `mat_${material.id}_review`,
            type: RECTIFICATION_TYPE.REVIEW,
            status: rectStatus,
            owner: existingRect?.owner || '',
            progress: existingRect?.progress || '',
            remark: existingRect?.remark || '',
            dueTime: existingRect?.dueTime || '',
            assignedAt: existingRect?.assignedAt || '',
            completedAt: existingRect?.completedAt || '',
            returnedReason: existingRect?.returnedReason || '',
            _rectId: existingRect?.id || null,
          });
        }
      }

      if (fStatus === FOLLOW_UP_STATUS.OVERDUE) {
        const existingRect = state.rectifications.find(
          r => r.sourceType === RECTIFICATION_SOURCE_TYPE.MATERIAL && r.sourceId === material.id && r.type === RECTIFICATION_TYPE.FOLLOW_UP_OVERDUE
        );
        const rectStatus = existingRect?.status || RECTIFICATION_STATUS.PENDING;
        if (rectStatus !== RECTIFICATION_STATUS.COMPLETED) {
          items.push({
            ...baseItem,
            id: `mat_${material.id}_f_overdue`,
            type: RECTIFICATION_TYPE.FOLLOW_UP_OVERDUE,
            status: rectStatus,
            owner: existingRect?.owner || material.followUpOwner || '',
            progress: existingRect?.progress || '',
            remark: existingRect?.remark || material.followUpNote || '',
            dueTime: existingRect?.dueTime || material.followUpDueTime || '',
            assignedAt: existingRect?.assignedAt || '',
            completedAt: existingRect?.completedAt || '',
            returnedReason: existingRect?.returnedReason || '',
            _rectId: existingRect?.id || null,
          });
        }
      } else if (fStatus === FOLLOW_UP_STATUS.PENDING) {
        const existingRect = state.rectifications.find(
          r => r.sourceType === RECTIFICATION_SOURCE_TYPE.MATERIAL && r.sourceId === material.id && r.type === RECTIFICATION_TYPE.FOLLOW_UP_PENDING
        );
        const rectStatus = existingRect?.status || RECTIFICATION_STATUS.PENDING;
        if (rectStatus !== RECTIFICATION_STATUS.COMPLETED) {
          items.push({
            ...baseItem,
            id: `mat_${material.id}_f_pending`,
            type: RECTIFICATION_TYPE.FOLLOW_UP_PENDING,
            status: rectStatus,
            owner: existingRect?.owner || material.followUpOwner || '',
            progress: existingRect?.progress || '',
            remark: existingRect?.remark || material.followUpNote || '',
            dueTime: existingRect?.dueTime || material.followUpDueTime || '',
            assignedAt: existingRect?.assignedAt || '',
            completedAt: existingRect?.completedAt || '',
            returnedReason: existingRect?.returnedReason || '',
            _rectId: existingRect?.id || null,
          });
        }
      }
    });

    state.handovers.forEach(handover => {
      if (handover.status === HANDOVER_STATUS.COMPLETED || handover.status === HANDOVER_STATUS.ARCHIVED) return;
      const handoverMeetingId = handover;
    });

    state.handoverItems.forEach(hi => {
      if (hi.confirmed) return;
      const handover = state.handovers.find(h => h.id === hi.handoverId);
      if (!handover || handover.status === HANDOVER_STATUS.COMPLETED || handover.status === HANDOVER_STATUS.ARCHIVED) return;

      const material = state.materials.find(m => m.id === hi.materialId);
      if (!material) return;
      const meeting = meetingsMap.get(material.meetingId);
      const room = roomsMap.get(material.roomId);
      const category = categoriesMap.get(material.categoryId);

      const existingRect = state.rectifications.find(
        r => r.sourceType === RECTIFICATION_SOURCE_TYPE.HANDOVER_ITEM && r.sourceId === hi.id && r.type === RECTIFICATION_TYPE.HANDOVER_INCOMPLETE
      );
      const rectStatus = existingRect?.status || RECTIFICATION_STATUS.PENDING;

      items.push({
        id: `hi_${hi.id}_handover`,
        sourceType: RECTIFICATION_SOURCE_TYPE.HANDOVER_ITEM,
        sourceId: hi.id,
        handoverItemId: hi.id,
        handover,
        handoverItem: hi,
        materialId: material.id,
        material,
        meetingId: material.meetingId,
        meeting,
        roomId: material.roomId,
        room,
        category,
        personInCharge: handover.receiverPerson || material.personInCharge || meeting?.personInCharge || '',
        shortageQty: Math.max(0, material.requiredQty - (hi.confirmedPreparedQty ?? material.preparedQty)),
        type: RECTIFICATION_TYPE.HANDOVER_INCOMPLETE,
        status: rectStatus,
        owner: existingRect?.owner || handover.receiverPerson || '',
        progress: existingRect?.progress || '',
        remark: existingRect?.remark || hi.itemRemark || '',
        dueTime: existingRect?.dueTime || handover.handoverTime || '',
        assignedAt: existingRect?.assignedAt || '',
        completedAt: existingRect?.completedAt || '',
        returnedReason: existingRect?.returnedReason || '',
        _rectId: existingRect?.id || null,
      });
    });

    return items;
  }, [state.materials, state.handovers, state.handoverItems, state.meetings, state.rooms, state.categories, state.rectifications]);

  const filteredRectificationItems = useMemo(() => {
    const { dateRange, roomIds, personInCharges, meetingIds, types, statuses, owners } = state.rectificationFilters;
    let result = [...rectificationItems];

    if (dateRange.start) {
      result = result.filter(item => item.meeting && item.meeting.date >= dateRange.start);
    }
    if (dateRange.end) {
      result = result.filter(item => item.meeting && item.meeting.date <= dateRange.end);
    }
    if (roomIds.length > 0) {
      result = result.filter(item => roomIds.includes(item.roomId));
    }
    if (personInCharges.length > 0) {
      result = result.filter(item => personInCharges.includes(item.personInCharge));
    }
    if (meetingIds.length > 0) {
      result = result.filter(item => meetingIds.includes(item.meetingId));
    }
    if (types.length > 0) {
      result = result.filter(item => types.includes(item.type));
    }
    if (statuses.length > 0) {
      result = result.filter(item => statuses.includes(item.status));
    }
    if (owners.length > 0) {
      result = result.filter(item => owners.includes(item.owner));
    }

    return result;
  }, [rectificationItems, state.rectificationFilters]);

  const rectificationSummary = useMemo(() => {
    const items = rectificationItems;
    const total = items.length;
    const typeStats = {};
    const statusStats = {};
    const byMeeting = new Map();
    const byRoom = new Map();
    const byPerson = new Map();
    const byOwner = new Map();

    Object.values(RECTIFICATION_TYPE).forEach(v => typeStats[v] = 0);
    Object.values(RECTIFICATION_STATUS).forEach(v => statusStats[v] = 0);

    items.forEach(item => {
      typeStats[item.type] = (typeStats[item.type] || 0) + 1;
      statusStats[item.status] = (statusStats[item.status] || 0) + 1;

      if (item.meetingId) {
        if (!byMeeting.has(item.meetingId)) byMeeting.set(item.meetingId, []);
        byMeeting.get(item.meetingId).push(item);
      }
      if (item.roomId) {
        if (!byRoom.has(item.roomId)) byRoom.set(item.roomId, []);
        byRoom.get(item.roomId).push(item);
      }
      const person = item.personInCharge;
      if (person) {
        if (!byPerson.has(person)) byPerson.set(person, []);
        byPerson.get(person).push(item);
      }
      const owner = item.owner;
      if (owner) {
        if (!byOwner.has(owner)) byOwner.set(owner, []);
        byOwner.get(owner).push(item);
      }
    });

    const pendingCount = statusStats[RECTIFICATION_STATUS.PENDING] || 0;
    const inProgressCount = statusStats[RECTIFICATION_STATUS.IN_PROGRESS] || 0;
    const pendingReviewCount = statusStats[RECTIFICATION_STATUS.PENDING_REVIEW] || 0;
    const completedCount = statusStats[RECTIFICATION_STATUS.COMPLETED] || 0;
    const activeCount = total - completedCount;

    return {
      total,
      activeCount,
      typeStats,
      statusStats,
      pendingCount,
      inProgressCount,
      pendingReviewCount,
      completedCount,
      byMeeting,
      byRoom,
      byPerson,
      byOwner,
    };
  }, [rectificationItems]);

  const groupedRectifications = useMemo(() => {
    const { rectificationGroupBy } = state;
    const groups = {};
    const getKey = (item) => {
      switch (rectificationGroupBy) {
        case RECTIFICATION_GROUP_BY.MEETING:
          return String(item.meetingId || 'unknown');
        case RECTIFICATION_GROUP_BY.ROOM:
          return String(item.roomId || 'unknown');
        case RECTIFICATION_GROUP_BY.PERSON:
          return item.personInCharge || item.owner || '未分配';
        case RECTIFICATION_GROUP_BY.TYPE:
          return item.type;
        default:
          return item.type;
      }
    };
    const getLabel = (item) => {
      switch (rectificationGroupBy) {
        case RECTIFICATION_GROUP_BY.MEETING:
          return item.meeting ? `${item.meeting.title} · ${item.meeting.date}` : '未知会议';
        case RECTIFICATION_GROUP_BY.ROOM:
          return item.room?.name || '未知会议室';
        case RECTIFICATION_GROUP_BY.PERSON:
          return item.personInCharge || item.owner || '未分配';
        case RECTIFICATION_GROUP_BY.TYPE: {
          const labels = {
            [RECTIFICATION_TYPE.SHORTAGE]: '📦 短缺',
            [RECTIFICATION_TYPE.REVIEW]: '🔍 需复核',
            [RECTIFICATION_TYPE.FOLLOW_UP_PENDING]: '⏩ 待跟进',
            [RECTIFICATION_TYPE.FOLLOW_UP_OVERDUE]: '⏰ 逾期跟进',
            [RECTIFICATION_TYPE.HANDOVER_INCOMPLETE]: '🤝 交接未完成',
          };
          return labels[item.type] || item.type;
        }
        default:
          return '未分组';
      }
    };

    filteredRectificationItems.forEach(item => {
      const key = getKey(item);
      if (!groups[key]) {
        groups[key] = { key, label: getLabel(item), items: [] };
      }
      groups[key].items.push(item);
    });

    return Object.values(groups).sort((a, b) => {
      const statusPriority = { pending: 0, in_progress: 1, pending_review: 2, completed: 3 };
      const aMaxStatus = Math.min(...a.items.map(i => statusPriority[i.status] ?? 4));
      const bMaxStatus = Math.min(...b.items.map(i => statusPriority[i.status] ?? 4));
      if (aMaxStatus !== bMaxStatus) return aMaxStatus - bMaxStatus;
      return a.label.localeCompare(b.label);
    });
  }, [filteredRectificationItems, state.rectificationGroupBy]);

  const updateMaterial = useCallback(async (material) => {
    await db.materials.update(material.id, material);
    dispatch({ type: 'UPDATE_MATERIALS', payload: [material] });
  }, []);

  const updateMaterialField = useCallback(async (id, field, value) => {
    await db.materials.update(id, { [field]: value });
    dispatch({ type: 'UPDATE_MATERIALS', payload: [{ id, [field]: value }] });
  }, []);

  const bulkUpdateStatus = useCallback(async (ids, status) => {
    const updates = [];
    await Promise.all(ids.map(async id => {
      const material = await db.materials.get(id);
      const updateData = { status };
      if (status === MATERIAL_STATUS.READY && material && material.preparedQty < material.requiredQty) {
        updateData.preparedQty = material.requiredQty;
      }
      await db.materials.update(id, updateData);
      updates.push({ id, ...updateData });
    }));
    dispatch({ type: 'UPDATE_MATERIALS', payload: updates });
  }, []);

  const bulkUpdateFollowUp = useCallback(async (ids, followUpUpdates) => {
    const { followUpStatus, followUpNote, followUpOwner, followUpDueTime, followUpCompletedAt, followUp } = followUpUpdates;
    const updates = {};
    if (followUpStatus !== undefined) updates.followUpStatus = followUpStatus;
    if (followUpNote !== undefined) updates.followUpNote = followUpNote;
    if (followUpOwner !== undefined) updates.followUpOwner = followUpOwner;
    if (followUpDueTime !== undefined) updates.followUpDueTime = followUpDueTime;
    if (followUpCompletedAt !== undefined) updates.followUpCompletedAt = followUpCompletedAt;
    if (followUp !== undefined) updates.followUp = followUp;

    if (Object.keys(updates).length === 0) return;

    await Promise.all(ids.map(id => db.materials.update(id, updates)));
    const payload = ids.map(id => ({ id, ...updates }));
    dispatch({ type: 'UPDATE_MATERIALS', payload });
  }, []);

  const markFollowUpCompleted = useCallback(async (ids) => {
    const updates = {
      followUpStatus: FOLLOW_UP_STATUS.COMPLETED,
      followUpCompletedAt: new Date().toISOString(),
    };
    await Promise.all(ids.map(id => db.materials.update(id, updates)));
    const payload = ids.map(id => ({ id, ...updates }));
    dispatch({ type: 'UPDATE_MATERIALS', payload });
  }, []);

  const addMaterial = useCallback(async (material) => {
    const id = await db.materials.add(material);
    dispatch({ type: 'ADD_MATERIALS', payload: [{ ...material, id }] });
    return id;
  }, []);

  const deleteMaterials = useCallback(async (ids) => {
    await db.materials.bulkDelete(ids);
    dispatch({ type: 'DELETE_MATERIALS', payload: ids });
  }, []);

  const moveMaterials = useCallback(async (ids, target) => {
    const updates = {};
    if (target.roomId !== undefined) updates.roomId = target.roomId;
    if (target.meetingId !== undefined) updates.meetingId = target.meetingId;
    if (target.batch !== undefined) updates.batch = target.batch;
    if (target.personInCharge !== undefined) updates.personInCharge = target.personInCharge;

    await Promise.all(ids.map(id => db.materials.update(id, updates)));
    dispatch({ type: 'MOVE_MATERIALS', payload: { ids, ...target } });
  }, []);

  const createHandover = useCallback(async ({ sourceType, title, handoverTime, handoverPerson, receiverPerson, remark, materialIds }) => {
    const ids = materialIds || (sourceType === HANDOVER_SOURCE_TYPE.SELECTED
      ? state.selectedMaterialIds
      : filteredMaterials.map(m => m.id));

    if (ids.length === 0) return null;

    const sourceMaterials = state.materials.filter(m => ids.includes(m.id));

    const handover = {
      title: title || `会前交接清单 - ${new Date().toLocaleDateString('zh-CN')}`,
      createdAt: new Date().toISOString(),
      handoverTime: handoverTime || getLocalDatetimeLocal(),
      handoverPerson: handoverPerson || '',
      receiverPerson: receiverPerson || '',
      remark: remark || '',
      status: HANDOVER_STATUS.DRAFT,
      sourceType,
      materialCount: sourceMaterials.length,
    };

    const handoverId = await db.handovers.add(handover);

    const items = sourceMaterials.map(m => ({
      handoverId,
      materialId: m.id,
      confirmed: false,
      followUp: m.followUp || false,
      itemRemark: '',
      originalStatus: m.status,
      originalPreparedQty: m.preparedQty,
      confirmedPreparedQty: m.preparedQty,
      followUpStatus: m.followUpStatus || FOLLOW_UP_STATUS.NONE,
      followUpNote: m.followUpNote || '',
      followUpOwner: m.followUpOwner || '',
      followUpDueTime: m.followUpDueTime || '',
    }));

    const itemIds = await db.handoverItems.bulkAdd(items, { allKeys: true });
    const itemsWithIds = items.map((item, idx) => ({ ...item, id: itemIds[idx] }));

    dispatch({
      type: 'ADD_HANDOVER',
      payload: { handover: { ...handover, id: handoverId }, items: itemsWithIds },
    });

    return handoverId;
  }, [state.materials, state.selectedMaterialIds, filteredMaterials]);

  const updateHandover = useCallback(async (handoverId, updates) => {
    await db.handovers.update(handoverId, updates);
    dispatch({ type: 'UPDATE_HANDOVER', payload: { id: handoverId, ...updates } });
  }, []);

  const updateHandoverItem = useCallback(async (itemId, updates, syncMaterial = false) => {
    await db.handoverItems.update(itemId, updates);
    dispatch({ type: 'UPDATE_HANDOVER_ITEMS', payload: [{ id: itemId, ...updates }] });

    const item = state.handoverItems.find(i => i.id === itemId);
    if (!item) return;

    if (updates.confirmed) {
      const handover = state.handovers.find(h => h.id === item.handoverId);
      if (handover && handover.status === HANDOVER_STATUS.DRAFT) {
        await db.handovers.update(handover.id, { status: HANDOVER_STATUS.IN_PROGRESS });
        dispatch({ type: 'UPDATE_HANDOVER', payload: { id: handover.id, status: HANDOVER_STATUS.IN_PROGRESS } });
      }
    }

    const material = state.materials.find(m => m.id === item.materialId);
    if (!material) return;

    const materialUpdates = {};
    let hasMaterialUpdate = false;

    if (updates.confirmedPreparedQty !== undefined) {
      materialUpdates.preparedQty = updates.confirmedPreparedQty;
      hasMaterialUpdate = true;
      if (updates.confirmedPreparedQty >= material.requiredQty) {
        materialUpdates.status = MATERIAL_STATUS.READY;
      }
    }

    if (updates.confirmed !== undefined) {
      const preparedQty = (updates.confirmedPreparedQty !== undefined ? updates.confirmedPreparedQty : item.confirmedPreparedQty);
      if (updates.confirmed && preparedQty >= material.requiredQty) {
        materialUpdates.status = MATERIAL_STATUS.READY;
        if (materialUpdates.preparedQty === undefined) {
          materialUpdates.preparedQty = preparedQty;
        }
        hasMaterialUpdate = true;
      }
      if (updates.confirmed && preparedQty < material.requiredQty) {
        if (material.status !== MATERIAL_STATUS.SHORTAGE) {
          materialUpdates.status = MATERIAL_STATUS.PREPARING;
          hasMaterialUpdate = true;
        }
      }
    }

    if (updates.followUp !== undefined) {
      materialUpdates.followUp = updates.followUp;
      if (updates.followUp && (!material.followUpStatus || material.followUpStatus === FOLLOW_UP_STATUS.NONE || material.followUpStatus === FOLLOW_UP_STATUS.COMPLETED)) {
        materialUpdates.followUpStatus = FOLLOW_UP_STATUS.PENDING;
      }
      if (!updates.followUp && material.followUpStatus && material.followUpStatus !== FOLLOW_UP_STATUS.COMPLETED) {
        materialUpdates.followUpStatus = FOLLOW_UP_STATUS.NONE;
      }
      hasMaterialUpdate = true;
    }

    if (updates.followUpStatus !== undefined) {
      materialUpdates.followUpStatus = updates.followUpStatus;
      hasMaterialUpdate = true;
      if (updates.followUpStatus === FOLLOW_UP_STATUS.COMPLETED) {
        materialUpdates.followUpCompletedAt = new Date().toISOString();
      }
    }

    if (updates.followUpNote !== undefined) {
      materialUpdates.followUpNote = updates.followUpNote;
      hasMaterialUpdate = true;
    }

    if (updates.followUpOwner !== undefined) {
      materialUpdates.followUpOwner = updates.followUpOwner;
      hasMaterialUpdate = true;
    }

    if (updates.followUpDueTime !== undefined) {
      materialUpdates.followUpDueTime = updates.followUpDueTime;
      hasMaterialUpdate = true;
    }

    if (updates.itemRemark !== undefined) {
      materialUpdates.handoverRemark = updates.itemRemark;
      hasMaterialUpdate = true;
    }

    if (hasMaterialUpdate) {
      await db.materials.update(item.materialId, materialUpdates);
      dispatch({ type: 'UPDATE_MATERIALS', payload: [{ id: item.materialId, ...materialUpdates }] });
    }
  }, [state.handoverItems, state.materials]);

  const bulkConfirmHandoverItems = useCallback(async (itemIds, confirmed, syncFollowUp = false) => {
    const updates = itemIds.map(id => ({ id, confirmed }));
    const itemUpdates = { confirmed };
    if (confirmed && syncFollowUp) {
      itemUpdates.followUpStatus = FOLLOW_UP_STATUS.COMPLETED;
      itemUpdates.followUpCompletedAt = new Date().toISOString();
    }
    await Promise.all(itemIds.map(id => db.handoverItems.update(id, itemUpdates)));
    dispatch({ type: 'UPDATE_HANDOVER_ITEMS', payload: updates.map(u => ({ ...u, ...(confirmed && syncFollowUp ? itemUpdates : {}) })) });

    if (confirmed && itemIds.length > 0) {
      const firstItem = state.handoverItems.find(i => i.id === itemIds[0]);
      if (firstItem) {
        const handover = state.handovers.find(h => h.id === firstItem.handoverId);
        if (handover && handover.status === HANDOVER_STATUS.DRAFT) {
          await db.handovers.update(handover.id, { status: HANDOVER_STATUS.IN_PROGRESS });
          dispatch({ type: 'UPDATE_HANDOVER', payload: { id: handover.id, status: HANDOVER_STATUS.IN_PROGRESS } });
        }
      }
    }

    const items = state.handoverItems.filter(i => itemIds.includes(i.id));
    const materialUpdates = items.map(item => {
      const material = state.materials.find(m => m.id === item.materialId);
      if (!material) return null;
      const mu = {};
      let changed = false;

      if (confirmed) {
        if (item.confirmedPreparedQty >= material.requiredQty) {
          mu.status = MATERIAL_STATUS.READY;
          mu.preparedQty = item.confirmedPreparedQty;
          changed = true;
        } else {
          if (material.status !== MATERIAL_STATUS.SHORTAGE) {
            mu.status = MATERIAL_STATUS.PREPARING;
            changed = true;
          }
          mu.preparedQty = item.confirmedPreparedQty;
          changed = true;
        }
        if (syncFollowUp && material.followUpStatus && material.followUpStatus !== FOLLOW_UP_STATUS.COMPLETED) {
          mu.followUpStatus = FOLLOW_UP_STATUS.COMPLETED;
          mu.followUpCompletedAt = new Date().toISOString();
          changed = true;
        }
      }

      return changed ? { id: item.materialId, ...mu } : null;
    }).filter(Boolean);

    if (materialUpdates.length > 0) {
      await Promise.all(materialUpdates.map(u => db.materials.update(u.id, { ...u })));
      dispatch({ type: 'UPDATE_MATERIALS', payload: materialUpdates });
    }
  }, [state.handoverItems, state.materials]);

  const deleteHandover = useCallback(async (handoverId) => {
    await db.handovers.delete(handoverId);
    await db.handoverItems.where('handoverId').equals(handoverId).delete();
    dispatch({ type: 'DELETE_HANDOVER', payload: handoverId });
  }, []);

  const getHandoverWithItems = useCallback((handoverId) => {
    const handover = state.handovers.find(h => h.id === handoverId);
    if (!handover) return null;
    const items = state.handoverItems.filter(i => i.handoverId === handoverId);
    const materialsWithItems = items.map(item => {
      const material = state.materials.find(m => m.id === item.materialId);
      return { ...item, material };
    }).filter(x => x.material);
    return { handover, items: materialsWithItems };
  }, [state.handovers, state.handoverItems, state.materials]);

  const currentHandover = useMemo(() => {
    if (!state.currentHandoverId) return null;
    return getHandoverWithItems(state.currentHandoverId);
  }, [state.currentHandoverId, getHandoverWithItems]);

  const assignRectification = useCallback(async (rectItem, owner, dueTime = '') => {
    const now = new Date().toISOString();

    let rectRecord = null;
    if (rectItem._rectId) {
      rectRecord = {
        id: rectItem._rectId,
        owner,
        status: RECTIFICATION_STATUS.IN_PROGRESS,
        assignedAt: now,
        dueTime: dueTime || rectItem.dueTime,
        updatedAt: now,
      };
      await db.rectifications.update(rectItem._rectId, rectRecord);
    } else {
      rectRecord = {
        sourceType: rectItem.sourceType,
        sourceId: rectItem.sourceId,
        materialId: rectItem.materialId,
        meetingId: rectItem.meetingId,
        roomId: rectItem.roomId,
        type: rectItem.type,
        status: RECTIFICATION_STATUS.IN_PROGRESS,
        owner,
        creator: '',
        progress: rectItem.progress || '',
        remark: rectItem.remark || '',
        dueTime: dueTime || rectItem.dueTime,
        assignedAt: now,
        completedAt: '',
        returnedReason: '',
        createdAt: now,
        updatedAt: now,
      };
      const id = await db.rectifications.add(rectRecord);
      rectRecord.id = id;
    }

    if (rectRecord) {
      dispatch({ type: rectItem._rectId ? 'UPDATE_RECTIFICATIONS' : 'ADD_RECTIFICATIONS', payload: rectItem._rectId ? [rectRecord] : [rectRecord] });
    }
  }, [state.materials, state.handoverItems]);

  const updateRectificationProgress = useCallback(async (rectItem, progress, remark = '') => {
    const now = new Date().toISOString();

    if (rectItem._rectId) {
      const recordUpdate = {
        progress,
        remark: remark || rectItem.remark,
        updatedAt: now,
      };
      await db.rectifications.update(rectItem._rectId, recordUpdate);
      dispatch({ type: 'UPDATE_RECTIFICATIONS', payload: [{ id: rectItem._rectId, ...recordUpdate }] });
    }
  }, [state.materials, state.handoverItems]);

  const completeRectification = useCallback(async (rectItem, completionRemark = '') => {
    const now = new Date().toISOString();

    if (rectItem._rectId) {
      const recordUpdate = {
        status: RECTIFICATION_STATUS.PENDING_REVIEW,
        progress: '已完成处理，待复核确认',
        completedAt: now,
        remark: completionRemark || rectItem.remark,
        updatedAt: now,
      };
      await db.rectifications.update(rectItem._rectId, recordUpdate);
      dispatch({ type: 'UPDATE_RECTIFICATIONS', payload: [{ id: rectItem._rectId, ...recordUpdate }] });
    } else {
      const rectRecord = {
        sourceType: rectItem.sourceType,
        sourceId: rectItem.sourceId,
        materialId: rectItem.materialId,
        meetingId: rectItem.meetingId,
        roomId: rectItem.roomId,
        type: rectItem.type,
        status: RECTIFICATION_STATUS.PENDING_REVIEW,
        owner: rectItem.owner || '',
        creator: '',
        progress: '已完成处理，待复核确认',
        remark: completionRemark || rectItem.remark || '',
        dueTime: rectItem.dueTime || '',
        assignedAt: rectItem.assignedAt || now,
        completedAt: now,
        returnedReason: '',
        createdAt: now,
        updatedAt: now,
      };
      const id = await db.rectifications.add(rectRecord);
      rectRecord.id = id;
      dispatch({ type: 'ADD_RECTIFICATIONS', payload: [rectRecord] });
    }
  }, [state.materials, state.handoverItems]);

  const confirmRectificationCompleted = useCallback(async (rectItem) => {
    const now = new Date().toISOString();

    if (rectItem.sourceType === RECTIFICATION_SOURCE_TYPE.MATERIAL) {
      const material = state.materials.find(m => m.id === rectItem.sourceId);
      if (material) {
        const matUpdates = {};
        if (rectItem.type === RECTIFICATION_TYPE.SHORTAGE && material.preparedQty < material.requiredQty) {
          matUpdates.preparedQty = material.requiredQty;
          if (material.status === MATERIAL_STATUS.SHORTAGE) {
            matUpdates.status = MATERIAL_STATUS.READY;
          }
        }
        if (rectItem.type === RECTIFICATION_TYPE.REVIEW && material.status === MATERIAL_STATUS.REVIEW) {
          matUpdates.status = MATERIAL_STATUS.READY;
          if (material.preparedQty < material.requiredQty) {
            matUpdates.preparedQty = material.requiredQty;
          }
        }
        if ((rectItem.type === RECTIFICATION_TYPE.FOLLOW_UP_OVERDUE || rectItem.type === RECTIFICATION_TYPE.FOLLOW_UP_PENDING)
          && material.followUpStatus !== FOLLOW_UP_STATUS.COMPLETED) {
          matUpdates.followUpStatus = FOLLOW_UP_STATUS.COMPLETED;
          matUpdates.followUpCompletedAt = now;
        }
        if (Object.keys(matUpdates).length > 0) {
          await db.materials.update(rectItem.sourceId, matUpdates);
          dispatch({ type: 'UPDATE_MATERIALS', payload: [{ id: rectItem.sourceId, ...matUpdates }] });
        }
      }
    } else if (rectItem.sourceType === RECTIFICATION_SOURCE_TYPE.HANDOVER_ITEM) {
      const hi = state.handoverItems.find(h => h.id === rectItem.sourceId);
      if (hi && !hi.confirmed) {
        const hiUpdates = { confirmed: true };
        await db.handoverItems.update(rectItem.sourceId, hiUpdates);
        dispatch({ type: 'UPDATE_HANDOVER_ITEMS', payload: [{ id: rectItem.sourceId, ...hiUpdates }] });
        const handover = state.handovers.find(h => h.id === hi.handoverId);
        if (handover && handover.status === HANDOVER_STATUS.DRAFT) {
          await db.handovers.update(hi.handoverId, { status: HANDOVER_STATUS.IN_PROGRESS });
          dispatch({ type: 'UPDATE_HANDOVER', payload: { id: hi.handoverId, status: HANDOVER_STATUS.IN_PROGRESS } });
        }
        const material = state.materials.find(m => m.id === hi.materialId);
        if (material) {
          const confQty = hi.confirmedPreparedQty ?? material.preparedQty;
          const matUpdates = {};
          if (confQty >= material.requiredQty) {
            matUpdates.status = MATERIAL_STATUS.READY;
          } else if (material.status !== MATERIAL_STATUS.SHORTAGE) {
            matUpdates.status = MATERIAL_STATUS.PREPARING;
          }
          if (Object.keys(matUpdates).length > 0) {
            await db.materials.update(hi.materialId, matUpdates);
            dispatch({ type: 'UPDATE_MATERIALS', payload: [{ id: hi.materialId, ...matUpdates }] });
          }
        }
      }
    }

    if (rectItem._rectId) {
      const recordUpdate = {
        status: RECTIFICATION_STATUS.COMPLETED,
        completedAt: now,
        updatedAt: now,
      };
      await db.rectifications.update(rectItem._rectId, recordUpdate);
      dispatch({ type: 'UPDATE_RECTIFICATIONS', payload: [{ id: rectItem._rectId, ...recordUpdate }] });
    } else {
      const rectRecord = {
        sourceType: rectItem.sourceType,
        sourceId: rectItem.sourceId,
        materialId: rectItem.materialId,
        meetingId: rectItem.meetingId,
        roomId: rectItem.roomId,
        type: rectItem.type,
        status: RECTIFICATION_STATUS.COMPLETED,
        owner: rectItem.owner || '',
        creator: '',
        progress: rectItem.progress || '',
        remark: rectItem.remark || '',
        dueTime: rectItem.dueTime || '',
        assignedAt: rectItem.assignedAt || '',
        completedAt: now,
        returnedReason: '',
        createdAt: now,
        updatedAt: now,
      };
      const id = await db.rectifications.add(rectRecord);
      rectRecord.id = id;
      dispatch({ type: 'ADD_RECTIFICATIONS', payload: [rectRecord] });
    }
  }, [state.materials, state.handoverItems, state.handovers]);

  const returnRectificationForReview = useCallback(async (rectItem, returnReason) => {
    const now = new Date().toISOString();

    if (rectItem._rectId) {
      const recordUpdate = {
        status: RECTIFICATION_STATUS.IN_PROGRESS,
        returnedReason: returnReason || '',
        completedAt: '',
        updatedAt: now,
      };
      await db.rectifications.update(rectItem._rectId, recordUpdate);
      dispatch({ type: 'UPDATE_RECTIFICATIONS', payload: [{ id: rectItem._rectId, ...recordUpdate }] });
    } else {
      const rectRecord = {
        sourceType: rectItem.sourceType,
        sourceId: rectItem.sourceId,
        materialId: rectItem.materialId,
        meetingId: rectItem.meetingId,
        roomId: rectItem.roomId,
        type: rectItem.type,
        status: RECTIFICATION_STATUS.IN_PROGRESS,
        owner: rectItem.owner || '',
        creator: '',
        progress: rectItem.progress || '',
        remark: rectItem.remark || '',
        dueTime: rectItem.dueTime || '',
        assignedAt: rectItem.assignedAt || '',
        completedAt: '',
        returnedReason: returnReason || '',
        createdAt: now,
        updatedAt: now,
      };
      const id = await db.rectifications.add(rectRecord);
      rectRecord.id = id;
      dispatch({ type: 'ADD_RECTIFICATIONS', payload: [rectRecord] });
    }
  }, [state.materials, state.handoverItems]);

  const selectedRectification = useMemo(() => {
    if (!state.selectedRectificationId) return null;
    return rectificationItems.find(item => item.id === state.selectedRectificationId) || null;
  }, [rectificationItems, state.selectedRectificationId]);

  useEffect(() => {
    if (!state.selectedRectificationQuery || rectificationItems.length === 0) return;
    const query = state.selectedRectificationQuery;
    let found = null;
    if (query.materialId) {
      found = rectificationItems.find(item => item.materialId === query.materialId);
    } else if (query.id) {
      found = rectificationItems.find(item => item.id === query.id);
    }
    if (found) {
      dispatch({ type: 'SET_SELECTED_RECTIFICATION', payload: found.id });
    }
    dispatch({ type: 'SET_SELECTED_RECTIFICATION_QUERY', payload: null });
  }, [rectificationItems, state.selectedRectificationQuery]);

  const preMeetingTasks = useMemo(() => {
    const tasks = [];
    const meetingsMap = new Map();
    const roomsMap = new Map();
    const categoriesMap = new Map();

    state.meetings.forEach(m => meetingsMap.set(m.id, m));
    state.rooms.forEach(r => roomsMap.set(r.id, r));
    state.categories.forEach(c => categoriesMap.set(c.id, c));

    state.materials.forEach(material => {
      const meeting = meetingsMap.get(material.meetingId);
      const room = roomsMap.get(material.roomId);
      const category = categoriesMap.get(material.categoryId);
      const fStatus = getFollowUpStatus(material);
      const isShortage = material.preparedQty < material.requiredQty || material.status === MATERIAL_STATUS.SHORTAGE;

      const baseTask = {
        materialId: material.id,
        material,
        meetingId: material.meetingId,
        meeting,
        roomId: material.roomId,
        room,
        category,
        title: material.name,
        personInCharge: material.personInCharge || meeting?.personInCharge || '',
        createdAt: material.createdAt || new Date().toISOString(),
      };

      if (material.status !== MATERIAL_STATUS.READY && !isShortage) {
        const taskStatus = material.status === MATERIAL_STATUS.PREPARING ? TASK_STATUS.IN_PROGRESS : TASK_STATUS.PENDING;
        tasks.push({
          ...baseTask,
          id: `task_mat_${material.id}_prep`,
          sourceType: TASK_SOURCE_TYPE.MATERIAL_PREPARATION,
          status: taskStatus,
          description: `${category?.name || ''} - ${material.name}，需求${material.requiredQty}件，已备${material.preparedQty}件`,
          progress: material.status === MATERIAL_STATUS.PREPARING ? '准备中' : '待准备',
          dueTime: meeting ? `${meeting.date}T${meeting.timeSlot?.split('-')[0] || '09:00'}` : '',
          priority: isTaskOverdue({ dueTime: meeting ? `${meeting.date}T${meeting.timeSlot?.split('-')[0] || '09:00'}` : '' }) ? 'high' : 'medium',
          owner: material.personInCharge || '',
          remark: '',
        });
      }

      if (isShortage) {
        tasks.push({
          ...baseTask,
          id: `task_mat_${material.id}_shortage`,
          sourceType: TASK_SOURCE_TYPE.MATERIAL_SHORTAGE,
          status: TASK_STATUS.PENDING,
          description: `${category?.name || ''} - ${material.name}，需求${material.requiredQty}件，缺${Math.max(0, material.requiredQty - material.preparedQty)}件`,
          progress: material.shortageNote || '待补充',
          dueTime: meeting ? `${meeting.date}T${meeting.timeSlot?.split('-')[0] || '09:00'}` : '',
          priority: 'high',
          owner: material.personInCharge || '',
          remark: material.shortageNote || '',
        });
      }

      if (fStatus === FOLLOW_UP_STATUS.OVERDUE) {
        tasks.push({
          ...baseTask,
          id: `task_mat_${material.id}_f_overdue`,
          sourceType: TASK_SOURCE_TYPE.FOLLOW_UP_OVERDUE,
          status: TASK_STATUS.IN_PROGRESS,
          description: `${category?.name || ''} - ${material.name}，跟进事项已逾期`,
          progress: material.followUpNote || '待跟进',
          dueTime: material.followUpDueTime || '',
          priority: 'high',
          owner: material.followUpOwner || material.personInCharge || '',
          remark: material.followUpNote || '',
        });
      } else if (fStatus === FOLLOW_UP_STATUS.PENDING) {
        tasks.push({
          ...baseTask,
          id: `task_mat_${material.id}_f_pending`,
          sourceType: TASK_SOURCE_TYPE.FOLLOW_UP_PENDING,
          status: TASK_STATUS.PENDING,
          description: `${category?.name || ''} - ${material.name}，有待跟进事项`,
          progress: material.followUpNote || '待跟进',
          dueTime: material.followUpDueTime || '',
          priority: isTaskOverdue({ dueTime: material.followUpDueTime }) ? 'high' : 'medium',
          owner: material.followUpOwner || material.personInCharge || '',
          remark: material.followUpNote || '',
        });
      }

      if (material.status === MATERIAL_STATUS.REVIEW) {
        tasks.push({
          ...baseTask,
          id: `task_mat_${material.id}_review`,
          sourceType: TASK_SOURCE_TYPE.REVIEW_REQUIRED,
          status: TASK_STATUS.PENDING,
          description: `${category?.name || ''} - ${material.name}，需要复核确认`,
          progress: '待复核',
          dueTime: meeting ? `${meeting.date}T${meeting.timeSlot?.split('-')[0] || '09:00'}` : '',
          priority: 'medium',
          owner: material.personInCharge || '',
          remark: '',
        });
      }
    });

    state.handoverItems.forEach(hi => {
      if (hi.confirmed) return;
      const handover = state.handovers.find(h => h.id === hi.handoverId);
      if (!handover || handover.status === HANDOVER_STATUS.COMPLETED || handover.status === HANDOVER_STATUS.ARCHIVED) return;

      const material = state.materials.find(m => m.id === hi.materialId);
      if (!material) return;
      const meeting = meetingsMap.get(material.meetingId);
      const room = roomsMap.get(material.roomId);
      const category = categoriesMap.get(material.categoryId);

      tasks.push({
        id: `task_hi_${hi.id}_handover`,
        sourceType: TASK_SOURCE_TYPE.HANDOVER_INCOMPLETE,
        status: TASK_STATUS.PENDING,
        materialId: material.id,
        material,
        handoverItemId: hi.id,
        handoverItem: hi,
        handover,
        meetingId: material.meetingId,
        meeting,
        roomId: material.roomId,
        room,
        category,
        title: `${handover.title} - ${material.name}`,
        description: `${category?.name || ''} - ${material.name}，交接待确认`,
        personInCharge: handover.receiverPerson || material.personInCharge || meeting?.personInCharge || '',
        progress: hi.itemRemark || '待交接确认',
        dueTime: handover.handoverTime || '',
        priority: isTaskOverdue({ dueTime: handover.handoverTime }) ? 'high' : 'medium',
        owner: handover.receiverPerson || '',
        remark: hi.itemRemark || '',
        createdAt: handover.createdAt,
      });
    });

    state.rectifications.forEach(rect => {
      if (rect.status === RECTIFICATION_STATUS.COMPLETED) return;

      const material = state.materials.find(m => m.id === rect.materialId);
      const meeting = rect.meetingId ? meetingsMap.get(rect.meetingId) : null;
      const room = rect.roomId ? roomsMap.get(rect.roomId) : null;
      const category = material ? categoriesMap.get(material.categoryId) : null;

      const sourceType = rect.status === RECTIFICATION_STATUS.PENDING
        ? TASK_SOURCE_TYPE.RECTIFICATION_PENDING
        : TASK_SOURCE_TYPE.RECTIFICATION_IN_PROGRESS;

      tasks.push({
        id: `task_rect_${rect.id}`,
        sourceType,
        status: rect.status === RECTIFICATION_STATUS.PENDING ? TASK_STATUS.PENDING : TASK_STATUS.IN_PROGRESS,
        rectificationId: rect.id,
        rectification: rect,
        materialId: rect.materialId,
        material,
        meetingId: rect.meetingId,
        meeting,
        roomId: rect.roomId,
        room,
        category,
        title: material ? material.name : `整改事项 ${rect.id}`,
        description: `整改类型: ${RECTIFICATION_TYPE_LABELS[rect.type] || rect.type}`,
        personInCharge: rect.owner || meeting?.personInCharge || '',
        progress: rect.progress || '',
        dueTime: rect.dueTime || '',
        priority: isTaskOverdue({ dueTime: rect.dueTime }) ? 'high' : (rect.status === RECTIFICATION_STATUS.PENDING ? 'medium' : 'low'),
        owner: rect.owner || '',
        remark: rect.remark || '',
        createdAt: rect.createdAt,
      });
    });

    return tasks;
  }, [state.materials, state.meetings, state.rooms, state.categories, state.handovers, state.handoverItems, state.rectifications]);

  const filteredPreMeetingTasks = useMemo(() => {
    const { dateRange, roomIds, meetingIds, personInCharges, riskLevels, sourceTypes, statuses } = state.taskFilters;
    let result = [...preMeetingTasks];

    if (dateRange.start) {
      result = result.filter(t => t.meeting && t.meeting.date >= dateRange.start);
    }
    if (dateRange.end) {
      result = result.filter(t => t.meeting && t.meeting.date <= dateRange.end);
    }
    if (roomIds.length > 0) {
      result = result.filter(t => roomIds.includes(t.roomId));
    }
    if (meetingIds.length > 0) {
      result = result.filter(t => meetingIds.includes(t.meetingId));
    }
    if (personInCharges.length > 0) {
      result = result.filter(t =>
        personInCharges.includes(t.personInCharge) ||
        personInCharges.includes(t.owner)
      );
    }
    if (riskLevels.length > 0) {
      result = result.filter(t => riskLevels.includes(t.priority));
    }
    if (sourceTypes.length > 0) {
      result = result.filter(t => sourceTypes.includes(t.sourceType));
    }
    if (statuses.length > 0) {
      result = result.filter(t => statuses.includes(t.status));
    }

    return result;
  }, [preMeetingTasks, state.taskFilters]);

  const preMeetingTasksByMeeting = useMemo(() => {
    const byMeeting = new Map();

    filteredPreMeetingTasks.forEach(task => {
      const meetingId = task.meetingId || 'unknown';
      if (!byMeeting.has(meetingId)) {
        byMeeting.set(meetingId, {
          meetingId,
          meeting: task.meeting,
          room: task.room,
          tasks: [],
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          highPriorityTasks: 0,
          ownerDistribution: {},
          sourceTypeDistribution: {},
        });
      }
      const group = byMeeting.get(meetingId);
      group.tasks.push(task);
      group.totalTasks++;

      if (task.status === TASK_STATUS.COMPLETED) {
        group.completedTasks++;
      } else if (task.status === TASK_STATUS.IN_PROGRESS) {
        group.inProgressTasks++;
      } else {
        group.pendingTasks++;
      }

      if (isTaskOverdue(task)) {
        group.overdueTasks++;
      }

      if (task.priority === 'high') {
        group.highPriorityTasks++;
      }

      const owner = task.owner || task.personInCharge || '未分配';
      group.ownerDistribution[owner] = (group.ownerDistribution[owner] || 0) + 1;
      group.sourceTypeDistribution[task.sourceType] = (group.sourceTypeDistribution[task.sourceType] || 0) + 1;
    });

    return Array.from(byMeeting.values()).map(group => ({
      ...group,
      progressRate: group.totalTasks > 0 ? Math.round((group.completedTasks / group.totalTasks) * 100) : 0,
    })).sort((a, b) => {
      if (a.overdueTasks !== b.overdueTasks) return b.overdueTasks - a.overdueTasks;
      if (a.highPriorityTasks !== b.highPriorityTasks) return b.highPriorityTasks - a.highPriorityTasks;
      if (a.pendingTasks !== b.pendingTasks) return b.pendingTasks - a.pendingTasks;
      return (a.meeting?.date || '').localeCompare(b.meeting?.date || '');
    });
  }, [filteredPreMeetingTasks]);

  const preMeetingTasksByRoom = useMemo(() => {
    const byRoom = new Map();

    filteredPreMeetingTasks.forEach(task => {
      const roomId = task.roomId || 'unknown';
      if (!byRoom.has(roomId)) {
        byRoom.set(roomId, {
          roomId,
          room: task.room,
          tasks: [],
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          highPriorityTasks: 0,
          ownerDistribution: {},
          sourceTypeDistribution: {},
          meetingCount: new Set(),
        });
      }
      const group = byRoom.get(roomId);
      group.tasks.push(task);
      group.totalTasks++;

      if (task.meetingId) {
        group.meetingCount.add(task.meetingId);
      }

      if (task.status === TASK_STATUS.COMPLETED) {
        group.completedTasks++;
      } else if (task.status === TASK_STATUS.IN_PROGRESS) {
        group.inProgressTasks++;
      } else {
        group.pendingTasks++;
      }

      if (isTaskOverdue(task)) {
        group.overdueTasks++;
      }

      if (task.priority === 'high') {
        group.highPriorityTasks++;
      }

      const owner = task.owner || task.personInCharge || '未分配';
      group.ownerDistribution[owner] = (group.ownerDistribution[owner] || 0) + 1;
      group.sourceTypeDistribution[task.sourceType] = (group.sourceTypeDistribution[task.sourceType] || 0) + 1;
    });

    return Array.from(byRoom.values()).map(group => ({
      ...group,
      meetingCount: group.meetingCount.size,
      progressRate: group.totalTasks > 0 ? Math.round((group.completedTasks / group.totalTasks) * 100) : 0,
    })).sort((a, b) => {
      if (a.overdueTasks !== b.overdueTasks) return b.overdueTasks - a.overdueTasks;
      if (a.highPriorityTasks !== b.highPriorityTasks) return b.highPriorityTasks - a.highPriorityTasks;
      if (a.pendingTasks !== b.pendingTasks) return b.pendingTasks - a.pendingTasks;
      return (a.room?.name || '').localeCompare(b.room?.name || '');
    });
  }, [filteredPreMeetingTasks]);

  const preMeetingTasksByPerson = useMemo(() => {
    const byPerson = new Map();

    filteredPreMeetingTasks.forEach(task => {
      const person = task.owner || task.personInCharge || '未分配';
      if (!byPerson.has(person)) {
        byPerson.set(person, {
          person,
          tasks: [],
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          highPriorityTasks: 0,
          roomDistribution: {},
          sourceTypeDistribution: {},
          meetingCount: new Set(),
        });
      }
      const group = byPerson.get(person);
      group.tasks.push(task);
      group.totalTasks++;

      if (task.meetingId) {
        group.meetingCount.add(task.meetingId);
      }

      if (task.status === TASK_STATUS.COMPLETED) {
        group.completedTasks++;
      } else if (task.status === TASK_STATUS.IN_PROGRESS) {
        group.inProgressTasks++;
      } else {
        group.pendingTasks++;
      }

      if (isTaskOverdue(task)) {
        group.overdueTasks++;
      }

      if (task.priority === 'high') {
        group.highPriorityTasks++;
      }

      const roomName = task.room?.name || '未知会议室';
      group.roomDistribution[roomName] = (group.roomDistribution[roomName] || 0) + 1;
      group.sourceTypeDistribution[task.sourceType] = (group.sourceTypeDistribution[task.sourceType] || 0) + 1;
    });

    return Array.from(byPerson.values()).map(group => ({
      ...group,
      meetingCount: group.meetingCount.size,
      progressRate: group.totalTasks > 0 ? Math.round((group.completedTasks / group.totalTasks) * 100) : 0,
    })).sort((a, b) => {
      if (a.overdueTasks !== b.overdueTasks) return b.overdueTasks - a.overdueTasks;
      if (a.highPriorityTasks !== b.highPriorityTasks) return b.highPriorityTasks - a.highPriorityTasks;
      if (a.pendingTasks !== b.pendingTasks) return b.pendingTasks - a.pendingTasks;
      return a.person.localeCompare(b.person);
    });
  }, [filteredPreMeetingTasks]);

  const preMeetingTaskSummary = useMemo(() => {
    const tasks = preMeetingTasks;
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === TASK_STATUS.PENDING).length;
    const inProgress = tasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length;
    const completed = tasks.filter(t => t.status === TASK_STATUS.COMPLETED).length;
    const overdue = tasks.filter(t => isTaskOverdue(t)).length;
    const highPriority = tasks.filter(t => t.priority === 'high').length;

    const bySourceType = {};
    const byOwner = {};
    const byMeeting = {};

    tasks.forEach(t => {
      bySourceType[t.sourceType] = (bySourceType[t.sourceType] || 0) + 1;
      const owner = t.owner || t.personInCharge || '未分配';
      byOwner[owner] = (byOwner[owner] || 0) + 1;
      if (t.meetingId) {
        byMeeting[t.meetingId] = (byMeeting[t.meetingId] || 0) + 1;
      }
    });

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
      highPriority,
      bySourceType,
      byOwner,
      byMeeting,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [preMeetingTasks]);

  const selectedTask = useMemo(() => {
    if (!state.selectedTaskId) return null;
    return preMeetingTasks.find(t => t.id === state.selectedTaskId) || null;
  }, [preMeetingTasks, state.selectedTaskId]);

  const claimTask = useCallback(async (task, owner) => {
    if (!owner.trim()) {
      alert('请输入责任人姓名');
      return false;
    }

    const now = new Date().toISOString();

    if (task.sourceType === TASK_SOURCE_TYPE.RECTIFICATION_PENDING || task.sourceType === TASK_SOURCE_TYPE.RECTIFICATION_IN_PROGRESS) {
      await assignRectification(task.rectification || task, owner.trim(), task.dueTime);
    } else if (task.materialId) {
      await db.materials.update(task.materialId, {
        personInCharge: owner.trim(),
        updatedAt: now,
      });
      dispatch({ type: 'UPDATE_MATERIALS', payload: [{ id: task.materialId, personInCharge: owner.trim(), updatedAt: now }] });
    }

    return true;
  }, [assignRectification]);

  const updateTaskProgress = useCallback(async (task, progress, remark = '') => {
    if (!progress.trim()) {
      alert('请输入处理进展');
      return false;
    }

    const now = new Date().toISOString();

    if (task.sourceType === TASK_SOURCE_TYPE.RECTIFICATION_PENDING || task.sourceType === TASK_SOURCE_TYPE.RECTIFICATION_IN_PROGRESS) {
      await updateRectificationProgress(task.rectification || task, progress, remark);
    } else if (task.materialId) {
      const updates = { updatedAt: now };
      if (task.sourceType === TASK_SOURCE_TYPE.FOLLOW_UP_PENDING || task.sourceType === TASK_SOURCE_TYPE.FOLLOW_UP_OVERDUE) {
        updates.followUpNote = remark || progress;
        if (task.status === TASK_STATUS.PENDING) {
          updates.followUpStatus = FOLLOW_UP_STATUS.PENDING;
        }
      }
      await db.materials.update(task.materialId, updates);
      dispatch({ type: 'UPDATE_MATERIALS', payload: [{ id: task.materialId, ...updates }] });
    } else if (task.handoverItemId) {
      await db.handoverItems.update(task.handoverItemId, {
        itemRemark: remark || progress,
      });
      dispatch({ type: 'UPDATE_HANDOVER_ITEMS', payload: [{ id: task.handoverItemId, itemRemark: remark || progress }] });
    }

    return true;
  }, [updateRectificationProgress]);

  const completeTask = useCallback(async (task, completionRemark = '') => {
    const now = new Date().toISOString();

    if (task.sourceType === TASK_SOURCE_TYPE.RECTIFICATION_PENDING || task.sourceType === TASK_SOURCE_TYPE.RECTIFICATION_IN_PROGRESS) {
      await completeRectification(task.rectification || task, completionRemark);
    } else if (task.sourceType === TASK_SOURCE_TYPE.MATERIAL_SHORTAGE && task.materialId) {
      const material = state.materials.find(m => m.id === task.materialId);
      if (material) {
        const updates = {
          preparedQty: material.requiredQty,
          status: MATERIAL_STATUS.READY,
          shortageNote: completionRemark || material.shortageNote,
          updatedAt: now,
        };
        await db.materials.update(task.materialId, updates);
        dispatch({ type: 'UPDATE_MATERIALS', payload: [{ id: task.materialId, ...updates }] });
      }
    } else if (task.sourceType === TASK_SOURCE_TYPE.REVIEW_REQUIRED && task.materialId) {
      const updates = {
        status: MATERIAL_STATUS.READY,
        updatedAt: now,
      };
      await db.materials.update(task.materialId, updates);
      dispatch({ type: 'UPDATE_MATERIALS', payload: [{ id: task.materialId, ...updates }] });
    } else if (task.sourceType === TASK_SOURCE_TYPE.FOLLOW_UP_PENDING || task.sourceType === TASK_SOURCE_TYPE.FOLLOW_UP_OVERDUE) {
      if (task.materialId) {
        const updates = {
          followUpStatus: FOLLOW_UP_STATUS.COMPLETED,
          followUpCompletedAt: now,
          followUpNote: completionRemark || '',
          updatedAt: now,
        };
        await db.materials.update(task.materialId, updates);
        dispatch({ type: 'UPDATE_MATERIALS', payload: [{ id: task.materialId, ...updates }] });
      }
    } else if (task.sourceType === TASK_SOURCE_TYPE.MATERIAL_PREPARATION && task.materialId) {
      const material = state.materials.find(m => m.id === task.materialId);
      if (material) {
        const updates = {
          status: MATERIAL_STATUS.READY,
          preparedQty: material.requiredQty,
          updatedAt: now,
        };
        await db.materials.update(task.materialId, updates);
        dispatch({ type: 'UPDATE_MATERIALS', payload: [{ id: task.materialId, ...updates }] });
      }
    } else if (task.sourceType === TASK_SOURCE_TYPE.HANDOVER_INCOMPLETE && task.handoverItemId) {
      const hi = state.handoverItems.find(i => i.id === task.handoverItemId);
      if (hi) {
        await updateHandoverItem(task.handoverItemId, {
          confirmed: true,
          itemRemark: completionRemark || '',
        }, true);
      }
    }

    return true;
  }, [completeRectification, state.materials, state.handoverItems, updateHandoverItem]);

  const value = {
    state,
    dispatch,
    filteredMaterials,
    groupedMaterials,
    summary,
    riskAnalysis,
    rectificationItems,
    filteredRectificationItems,
    rectificationSummary,
    groupedRectifications,
    selectedRectification,
    preMeetingTasks,
    filteredPreMeetingTasks,
    preMeetingTasksByMeeting,
    preMeetingTasksByRoom,
    preMeetingTasksByPerson,
    preMeetingTaskSummary,
    selectedTask,
    claimTask,
    updateTaskProgress,
    completeTask,
    updateMaterial,
    updateMaterialField,
    bulkUpdateStatus,
    bulkUpdateFollowUp,
    markFollowUpCompleted,
    addMaterial,
    deleteMaterials,
    moveMaterials,
    createHandover,
    updateHandover,
    updateHandoverItem,
    bulkConfirmHandoverItems,
    deleteHandover,
    getHandoverWithItems,
    currentHandover,
    assignRectification,
    updateRectificationProgress,
    completeRectification,
    confirmRectificationCompleted,
    returnRectificationForReview,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
