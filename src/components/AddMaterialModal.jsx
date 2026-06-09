import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MATERIAL_STATUS } from '../db';

export default function AddMaterialModal({ onClose, defaults = {} }) {
  const { state, addMaterial } = useApp();
  const { rooms, categories, meetings } = state;

  const [form, setForm] = useState({
    meetingId: defaults.meetingId || (meetings[0]?.id ?? ''),
    categoryId: defaults.categoryId || (categories[0]?.id ?? ''),
    name: defaults.name || '',
    requiredQty: defaults.requiredQty || 1,
    preparedQty: defaults.preparedQty || 0,
    shortageNote: defaults.shortageNote || '',
    status: defaults.status || MATERIAL_STATUS.PENDING,
    roomId: defaults.roomId || (rooms[0]?.id ?? ''),
    personInCharge: defaults.personInCharge || '',
    batch: defaults.batch || '',
  });

  const handleChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'meetingId') {
        const meeting = meetings.find(m => m.id === Number(value));
        if (meeting) {
          next.roomId = meeting.roomId;
          next.personInCharge = meeting.personInCharge;
          next.batch = meeting.batch;
        }
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert('请输入物料名称');
      return;
    }
    const numericFields = ['meetingId', 'categoryId', 'roomId', 'requiredQty', 'preparedQty'];
    const toSave = { ...form };
    numericFields.forEach(f => {
      if (toSave[f] !== '' && toSave[f] !== undefined) {
        toSave[f] = Number(toSave[f]);
      }
    });
    await addMaterial(toSave);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">➕ 新增物料</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label form-label-required">所属会议</label>
            <select
              className="form-input"
              value={form.meetingId}
              onChange={(e) => handleChange('meetingId', e.target.value)}
            >
              {meetings.map(m => (
                <option key={m.id} value={m.id}>
                  {m.title} · {m.date} · {m.timeSlot}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label form-label-required">物料分类</label>
            <select
              className="form-input"
              value={form.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label form-label-required">物料名称</label>
            <input
              type="text"
              className="form-input"
              placeholder="例如：签字笔、瓶装水..."
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label form-label-required">需求数量</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={form.requiredQty}
                onChange={(e) => handleChange('requiredQty', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">已备数量</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={form.preparedQty}
                onChange={(e) => handleChange('preparedQty', e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">准备状态</label>
              <select
                className="form-input"
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="pending">待准备</option>
                <option value="preparing">准备中</option>
                <option value="ready">已备齐</option>
                <option value="shortage">短缺</option>
                <option value="review">需复核</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">会议室</label>
              <select
                className="form-input"
                value={form.roomId}
                onChange={(e) => handleChange('roomId', e.target.value)}
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">负责人</label>
            <input
              type="text"
              className="form-input"
              placeholder="负责人姓名"
              value={form.personInCharge}
              onChange={(e) => handleChange('personInCharge', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">批次</label>
            <input
              type="text"
              className="form-input"
              placeholder="例如：2026-Q2-第一批"
              value={form.batch}
              onChange={(e) => handleChange('batch', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">短缺说明</label>
            <textarea
              className="form-input"
              rows="2"
              placeholder="如有缺口或问题请在此说明..."
              value={form.shortageNote}
              onChange={(e) => handleChange('shortageNote', e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>确认添加</button>
        </div>
      </div>
    </div>
  );
}
