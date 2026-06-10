import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { db, seedDatabase, MATERIAL_STATUS, HANDOVER_STATUS, HANDOVER_SOURCE_TYPE, getLocalDatetimeLocal, FOLLOW_UP_STATUS, getFollowUpStatus, RISK_LEVEL, RISK_FACTOR_TYPE } from '../db';

const AppContext = createContext(null);

export const GROUP_BY = {
  ROOM: 'room',
  BATCH: 'batch',
  PERSON: 'person',
};

export const RISK_VIEW = {
  MAIN: 'main',
  DASHBOARD: 'dashboard',
};

const initialState = {
  rooms: [],
  categories: [],
  meetings: [],
  materials: [],
  handovers: [],
  handoverItems: [],
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
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    async function init() {
      await seedDatabase();
      const [rooms, categories, meetings, materials, handovers, handoverItems] = await Promise.all([
        db.rooms.toArray(),
        db.categories.toArray(),
        db.meetings.toArray(),
        db.materials.toArray(),
        db.handovers.toArray(),
        db.handoverItems.toArray(),
      ]);
      dispatch({ type: 'SET_DATA', payload: { rooms, categories, meetings, materials } });
      dispatch({ type: 'SET_HANDOVER_DATA', payload: { handovers, handoverItems } });
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

  const value = {
    state,
    dispatch,
    filteredMaterials,
    groupedMaterials,
    summary,
    riskAnalysis,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
