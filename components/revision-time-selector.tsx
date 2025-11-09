"use client";

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock } from 'lucide-react';

interface RevisionTimeSelectorProps {
  onTimeChange: (hours: number) => void;
  defaultDays?: number;
  defaultHours?: number;
}

export function RevisionTimeSelector({ 
  onTimeChange, 
  defaultDays = 0, 
  defaultHours = 2 
}: RevisionTimeSelectorProps) {
  const [days, setDays] = useState(defaultDays);
  const [hours, setHours] = useState(defaultHours);
  const [error, setError] = useState('');

  const validateAndUpdate = (newDays: number, newHours: number) => {
    // Calculate total hours
    const totalHours = (newDays * 24) + newHours;

    // Validation: Must be at least 2 hours
    if (totalHours < 2) {
      setError('Revision time must be at least 2 hours');
      return false;
    }

    // If days are 0, hours cannot be 0
    if (newDays === 0 && newHours === 0) {
      setError('Please set at least 2 hours for revision');
      return false;
    }

    setError('');
    onTimeChange(totalHours);
    return true;
  };

  const handleDaysChange = (value: string) => {
    const newDays = parseInt(value) || 0;
    if (newDays < 0) return;
    
    setDays(newDays);
    validateAndUpdate(newDays, hours);
  };

  const handleHoursChange = (value: string) => {
    const newHours = parseInt(value) || 0;
    if (newHours < 0 || newHours > 23) return;
    
    // If days is 0 and user tries to set hours to 0, prevent it
    if (days === 0 && newHours < 2) {
      setError('When days is 0, hours must be at least 2');
      return;
    }
    
    setHours(newHours);
    validateAndUpdate(days, newHours);
  };

  const totalHours = (days * 24) + hours;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-primary" />
        <Label className="text-base font-semibold">Revision Time</Label>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="days">Days</Label>
          <Input
            id="days"
            type="number"
            min="0"
            value={days}
            onChange={(e) => handleDaysChange(e.target.value)}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">Can be 0</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="hours">Hours</Label>
          <Input
            id="hours"
            type="number"
            min={days === 0 ? "2" : "0"}
            max="23"
            value={hours}
            onChange={(e) => handleHoursChange(e.target.value)}
            placeholder={days === 0 ? "2" : "0"}
          />
          <p className="text-xs text-muted-foreground">
            {days === 0 ? 'Min: 2 hours' : '0-23 hours'}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {!error && totalHours >= 2 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Total revision time:</strong> {totalHours} hours
            {totalHours < 8 && (
              <>
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  ⚠️ For urgent revisions (less than 8 hours), consider contacting an admin directly.
                </span>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
