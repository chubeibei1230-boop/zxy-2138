import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { STATUS_LABELS, STATUS_COLORS } from '../db';

export default function FilterBar() {
  const { state, dispatch } = useApp();
  const { filters, rooms, materials } = state;

  const personOptions = useMemo(() => {
    const set = new Set(materials.map(m => m.personInCharge).filter(Boolean));
    return Array.from(set).sort();
  }, [materials]);

  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
    color: STATUS_COLORS[value],
  }));

  const handleDateChange = (field, value) => {
    dispatch({
      type: 'SET_FILTERS',
      payload: { dateRange: { ...filters.dateRange, [field]: value } },
    });
  };

  const handleMultiChange = (field, value, checked) => {
    const current = filters[field] || [];
    const next = checked ? [...current, value] : current.filter(v => v !== value);
    dispatch({ type: 'SET_FILTERS', payload: { [field]: next } });
  };

  const clearFilters = () => {
    dispatch({
      type: 'SET_FILTERS',
      payload: {
        dateRange: { start: '', end: '' },
        roomIds: [],
        personInCharges: [],
        statuses: [],
        shortageOnly: false,
      },
    });
  };

  const hasActiveFilters =
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.roomIds.length > 0 ||
    filters.personInCharges.length > 0 ||
    filters.statuses.length > 0 ||
    filters.shortageOnly;

  return (
    <div className="filter-bar">
      <div className="filter-row">
        <div className="filter-item">
          <span className="filter-label">会议开始日期</span>
          <input
            type="date"
            value={filters.dateRange.start}
            onChange={(e) => handleDateChange('start', e.target.value)}
          />
        </div>
        <div className="filter-item">
          <span className="filter-label">会议结束日期</span>
          <input
            type="date"
            value={filters.dateRange.end}
            onChange={(e) => handleDateChange('end', e.target.value)}
          />
        </div>
        <div className="filter-item">
          <span className="filter-label">会议室</span>
          <select
            multiple
            value={filters.roomIds.map(String)}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
              dispatch({ type: 'SET_FILTERS', payload: { roomIds: opts } });
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
        <div className="filter-item">
          <span className="filter-label">负责人</span>
          <select
            multiple
            value={filters.personInCharges}
            size={1}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value);
              dispatch({ type: 'SET_FILTERS', payload: { personInCharges: opts } });
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
      </div>
      <div className="filter-row">
        <div className="filter-item">
          <span className="filter-label">准备状态</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '4px 0' }}>
            {statusOptions.map(opt => {
              const checked = filters.statuses.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: checked ? `${opt.color}20` : '#f8fafc',
                    border: `1px solid ${checked ? opt.color : '#e2e8f0'}`,
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: checked ? '500' : '400',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleMultiChange('statuses', opt.value, e.target.checked)}
                    className="checkbox"
                    style={{ margin: 0 }}
                  />
                  <span style={{ color: checked ? opt.color : '#475569' }}>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
      <div className="filter-actions">
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginRight: 'auto',
            fontSize: '13px',
            color: '#dc2626',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={filters.shortageOnly}
            onChange={(e) =>
              dispatch({ type: 'SET_FILTERS', payload: { shortageOnly: e.target.checked } })
            }
            className="checkbox"
            style={{ accentColor: '#dc2626' }}
          />
          只显示短缺/未备齐
        </label>
        {hasActiveFilters && (
          <button className="btn btn-secondary" onClick={clearFilters}>
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}
