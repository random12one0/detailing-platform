import React, { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

const DropoffOnlyModal = ({ isOpen, onClose, onSave, onDelete, initialData = {}, isEdit = false }) => {
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Only reset fields when modal transitions from closed to open
  const prevIsOpen = React.useRef(false);
  React.useEffect(() => {
    if (!prevIsOpen.current && isOpen) {
      if (isEdit && initialData) {
        setReason(initialData.reason || '');
        setStartDate(initialData.start_date || '');
        setEndDate(initialData.end_date || '');
        setStartTime(initialData.start_time || '');
        setEndTime(initialData.end_time || '');
      } else if (!isEdit) {
        setReason('');
        setStartDate(initialData.startDate || new Date().toISOString().split('T')[0]);
        setEndDate('');
        setStartTime('');
        setEndTime('');
      }
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialData, isEdit]);

  const handleSave = () => {
    if (!startDate) return;
    onSave({
      reason,
      start_date: startDate,
      end_date: endDate || startDate,
      start_time: startTime || null,
      end_time: endTime || null,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-md flex items-center justify-center">
      <div className="bg-gray-900 rounded-xl p-4 w-full max-w-sm border border-white/10 shadow-xl relative">
        {isEdit && (
          <Button
            variant="destructive"
            type="button"
            onClick={onDelete}
            style={{ minWidth: 80, fontWeight: 'bold', fontSize: '0.95rem' }}
            className="!absolute right-6 top-6 z-10"
          >
            Delete
          </Button>
        )}
        <h2 className="text-2xl font-bold text-white mb-4">{isEdit ? 'Edit Drop-off Only Period' : 'Add Drop-off Only Period'}</h2>
        <div className="space-y-3">
          <div>
            <Label className="text-white mb-1">Reason/Note</Label>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. No mobile service available"
              className="mb-1 bg-white/10 text-white border-white/20 placeholder:text-gray-400"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-white mb-1">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-2 py-1 rounded border border-white/20 bg-black/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ width: '120px' }}
              />
            </div>
            <div className="flex-1">
              <Label className="text-white mb-1">End Date (optional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-2 py-1 rounded border border-white/20 bg-black/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ width: '120px' }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-white mb-1">Start Time (optional)</Label>
              <Input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="px-2 py-1 rounded border border-white/20 bg-black/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ width: '90px' }}
              />
            </div>
            <div className="flex-1">
              <Label className="text-white mb-1">End Time (optional)</Label>
              <Input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="px-2 py-1 rounded border border-white/20 bg-black/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ width: '90px' }}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
};

export default DropoffOnlyModal;
