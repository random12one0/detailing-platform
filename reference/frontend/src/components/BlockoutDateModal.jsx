import React, { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';


const BlockoutDateModal = ({ isOpen, onClose, onSave, onDelete, initialData = {}, isEdit = false }) => {
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [repeat, setRepeat] = useState('none');


  // Only reset fields when modal transitions from closed to open
  const prevIsOpen = React.useRef(false);
  React.useEffect(() => {
    if (!prevIsOpen.current && isOpen) {
      if (isEdit && initialData) {
        setEventName(initialData.eventName || '');
        setStartDate(initialData.startDate || '');
        setEndDate(initialData.endDate || '');
        setAllDay(initialData.allDay || false);
        setStartTime(initialData.startTime || '');
        setEndTime(initialData.endTime || '');
        setRepeat(initialData.repeat || 'none');
      } else if (!isEdit) {
        setEventName('');
        setStartDate(initialData.startDate || new Date().toISOString().split('T')[0]);
        setEndDate('');
        setAllDay(false);
        setStartTime('');
        setEndTime('');
        setRepeat('none');
      }
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialData, isEdit]);

  const handleSave = () => {
    if (!eventName || !startDate) return;
    onSave({
      eventName,
      startDate,
      endDate: endDate || startDate,
      allDay,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      repeat
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
        <h2 className="text-2xl font-bold text-white mb-4">{isEdit ? 'Edit Blockout Date' : 'Add Blockout Date'}</h2>
        <div className="space-y-3">
          <div>
            <Label className="text-white mb-1">Event Name</Label>
            <Input
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="e.g. Staff Meeting"
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
          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              checked={allDay}
              onChange={e => setAllDay(e.target.checked)}
              className="accent-purple-600 w-4 h-4"
              id="blockout-all-day"
            />
            <Label htmlFor="blockout-all-day" className="text-white">All Day</Label>
          </div>
          {!allDay && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-white mb-1">Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="px-2 py-1 rounded border border-white/20 bg-black/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ width: '90px' }}
                />
              </div>
              <div className="flex-1">
                <Label className="text-white mb-1">End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="px-2 py-1 rounded border border-white/20 bg-black/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ width: '90px' }}
                />
              </div>
            </div>
          )}
          <div>
            <Label className="text-white mb-1">Repeat</Label>
            <select
              className="w-full rounded-md border border-white/20 bg-black/80 text-white px-2 py-2 mb-1 focus:bg-black focus:text-white"
              value={repeat}
              onChange={e => setRepeat(e.target.value)}
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
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

export default BlockoutDateModal;
