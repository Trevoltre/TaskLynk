"use client";

import { useEffect, useState } from 'react';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';

type CountdownTimerProps = {
  deadline: string;
  label?: string;
  colorScheme?: 'green' | 'purple' | 'auto';
  className?: string;
  showIcon?: boolean;
  status?: string;
};

export function CountdownTimer({ 
  deadline, 
  label, 
  colorScheme = 'auto',
  className = '',
  showIcon = true,
  status
}: CountdownTimerProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // If completed, show green badge
  if (status === 'completed') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 ${className}`}>
        <CheckCircle className="w-4 h-4" />
        <span className="font-bold">Completed</span>
      </div>
    );
  }

  // If delivered, show completed badge (no red)
  if (status === 'delivered') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 ${className}`}>
        <CheckCircle className="w-4 h-4" />
        <span className="font-bold">Delivered</span>
      </div>
    );
  }

  const getCountdownData = () => {
    const due = new Date(deadline);
    const diffMs = due.getTime() - currentTime.getTime();
    
    if (diffMs <= 0) {
      return { 
        text: 'Overdue', 
        expired: true,
        belowTwelveHours: true,
        totalHours: 0
      };
    }
    
    const totalHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    let text = '';
    if (diffDays > 0) {
      text = `${diffDays}d ${diffHours}h ${diffMins}m`;
    } else if (diffHours > 0) {
      text = `${diffHours}h ${diffMins}m ${diffSecs}s`;
    } else {
      text = `${diffMins}m ${diffSecs}s`;
    }
    
    return { 
      text, 
      expired: false,
      belowTwelveHours: totalHours < 12,
      totalHours
    };
  };

  const countdown = getCountdownData();
  
  // Determine color based on scheme
  let textColor = '';
  let bgColor = '';
  
  if (countdown.expired) {
    textColor = 'text-red-700 dark:text-red-300';
    bgColor = 'bg-red-100 dark:bg-red-950';
  } else if (countdown.belowTwelveHours) {
    textColor = 'text-red-700 dark:text-red-300';
    bgColor = 'bg-red-100 dark:bg-red-950';
  } else {
    if (colorScheme === 'purple') {
      textColor = 'text-purple-700 dark:text-purple-300';
      bgColor = 'bg-purple-100 dark:bg-purple-950';
    } else if (colorScheme === 'green') {
      textColor = 'text-green-700 dark:text-green-300';
      bgColor = 'bg-green-100 dark:bg-green-950';
    } else {
      textColor = 'text-green-700 dark:text-green-300';
      bgColor = 'bg-green-100 dark:bg-green-950';
    }
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${bgColor} ${textColor} ${className}`}>
      {showIcon && <Clock className="w-4 h-4" />}
      {label && <span className="font-medium">{label}:</span>}
      <span className="font-bold">{countdown.text}</span>
      {!countdown.expired && (
        <span className="text-xs opacity-75">remaining</span>
      )}
    </div>
  );
}