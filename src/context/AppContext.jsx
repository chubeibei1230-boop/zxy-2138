import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { db, seedDatabase, MATERIAL_STATUS, HANDOVER_STATUS, HANDOVER_SOURCE_TYPE, getLocalDatetimeLocal } from '../db';

const AppContext = createContext(null);

export const GROUP_BY = {
  ROOM: 'room',
  BATCH: 'batch',
  PERSON: 'person',
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
  },
  groupBy: GROUP_BY.ROOM,
  reviewMode: false,
  selectedMaterialIds: [],
  detailMaterial: null,
  mobileDetailExpanded: true,
  showHandoverModal: false,
  currentHandoverId: null,
  handoverSourceType: HANDOVER_SOURCE_TYPE.FILTERED,
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
    const { dateRange, roomIds, personInCharges, statuses, shortageOnly } = state.filters;
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

    const roomStats = {};
    state.rooms.forEach(room => {
      const roomMaterials = all.filter(m => m.roomId === room.id);
      const roomTotal = roomMaterials.length;
      const roomReady = roomMaterials.filter(m => m.status === MATERIAL_STATUS.READY && m.preparedQty >= m.requiredQty).length;
      const roomShortage = roomMaterials.reduce((s, m) => s + Math.max(0, m.requiredQty - m.preparedQty), 0);
      roomStats[room.id] = {
        roomName: room.name,
        total: roomTotal,
        ready: roomReady,
        shortageQty: roomShortage,
        rate: roomTotal > 0 ? Math.round((roomReady / roomTotal) * 100) : 0,
      };
    });

    return { totalRequired, totalPrepared, shortageQty, shortageItems, readyCount, totalItems: all.length, roomStats };
  }, [state.materials, state.rooms]);

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
    await Promise.all(ids.map(id => db.materials.update(id, { status })));
    const updates = ids.map(id => ({ id, status }));
    dispatch({ type: 'UPDATE_MATERIALS', payload: updates });
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
      followUp: false,
      itemRemark: '',
      originalStatus: m.status,
      originalPreparedQty: m.preparedQty,
      confirmedPreparedQty: m.preparedQty,
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

  const bulkConfirmHandoverItems = useCallback(async (itemIds, confirmed) => {
    const updates = itemIds.map(id => ({ id, confirmed }));
    await Promise.all(itemIds.map(id => db.handoverItems.update(id, { confirmed })));
    dispatch({ type: 'UPDATE_HANDOVER_ITEMS', payload: updates });

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
    updateMaterial,
    updateMaterialField,
    bulkUpdateStatus,
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
