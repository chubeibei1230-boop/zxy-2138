import React, { useState, useMemo } from 'react';
import { useApp, GROUP_BY } from '../context/AppContext';
import { MATERIAL_STATUS } from '../db';

export default function MoveMaterialModal({ materialIds, onClose }) {
  const { state, moveMaterials } = useApp();
  const { rooms, meetings, materials, groupBy } = state;

  const persons = useMemo(() => {
    const set = new Set(materials.map(m => m.personInCharge).filter(Boolean));
    return Array.from(set).sort();
  }, [materials]);

  const batches = useMemo(() => {
    const set = new Set(materials.map(m => m.batch).filter(Boolean));
    return Array.from(set).sort();
  }, [materials]);

  const [target, setTarget] = useState({
    roomId: '',
    meetingId: '',
    personInCharge: '',
    batch: '',
  });

  const handleChange = (field, value) => {
    setTarget(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'meetingId' && value) {
        const meeting = meetings.find(m => m.id === Number(value));
        if (meeting) {
          next.roomId = String(meeting.roomId);
          next.personInCharge = meeting.personInCharge;
          next.batch = meeting.batch;
        }
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const hasAny = target.roomId || target.meetingId || target.personInCharge || target.batch;
    if (!hasAny) {
      alert('请至少选择一个移动目标');
      return;
    }
    const toUpdate = {};
    if (target.roomId) toUpdate.roomId = Number(target.roomId);
    if (target.meetingId) toUpdate.meetingId = Number(target.meetingId);
    if (target.personInCharge) toUpdate.personInCharge = target.personInCharge;
    if (target.batch) toUpdate.batch = target.batch;
    await moveMaterials(materialIds, toUpdate);
    onClose();
  };

  const groupLabel = {
    [GROUP_BY.ROOM]: '会议室',
    [GROUP_BY.BATCH]: '会议批次',
    [GROUP_BY.PERSON]: '负责人',
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">📦 移动 {materialIds.length} 条物料</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div
            style={{
              padding: '12px',
              background: '#eff6ff',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#1e40af',
              marginBottom: '16px',
            }}
          >
            当前分组方式：<strong>{groupLabel[groupBy]}</strong>。移动后，相关分组的统计数据将实时更新。
          </div>

          <div className="form-group">
            <label className="form-label">移动到会议室</label>
            <select
              className="form-input"
              value={target.roomId}
              onChange={(e) => handleChange('roomId', e.target.value)}
            >
              <option value="">-- 不改变 --</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">关联到会议</label>
            <select
              className="form-input"
              value={target.meetingId}
              onChange={(e) => handleChange('meetingId', e.target.value)}
            >
              <option value="">-- 不改变 --</option>
              {meetings.map(m => (
                <option key={m.id} value={m.id}>
                  {m.title} · {m.date} · {m.timeSlot}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">更改负责人</label>
            <select
              className="form-input"
              value={target.personInCharge}
              onChange={(e) => handleChange('personInCharge', e.target.value)}
            >
              <option value="">-- 不改变 --</option>
              {persons.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">更改批次</label>
            <select
              className="form-input"
              value={target.batch}
              onChange={(e) => handleChange('batch', e.target.value)}
            >
              <option value="">-- 不改变 --</option>
              {batches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>确认移动</button>
        </div>
      </div>
    </div>
  );
}
