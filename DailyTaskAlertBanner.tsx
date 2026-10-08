import React from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface DailyTaskAlertBannerProps {
  status: 'OPEN' | 'CLOSED';
}

export const DailyTaskAlertBanner: React.FC<DailyTaskAlertBannerProps> = ({ status }) => {
  if (status === 'OPEN') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            <strong className="font-semibold text-emerald-900">Daily Task Session is Open:</strong>{' '}
            You can claim rating task tasks, submit verified ratings, and earn direct credits.
          </span>
        </div>
        <span className="hidden sm:inline text-[11px] font-medium text-emerald-700">
          Submissions active
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-amber-100 p-1.5 text-amber-700 shrink-0">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <div className="font-semibold text-amber-900 text-sm">
            Today's tasks are closed. Please return when tasks reopen.
          </div>
          <p className="text-amber-800 text-xs mt-0.5">
            The Operations Team has paused task submissions for this cycle. All new review completions
            are temporarily halted.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-100/80 px-2.5 py-1 text-xs font-medium text-amber-800 shrink-0">
        <Clock className="h-3.5 w-3.5" />
        <span>Submissions Paused</span>
      </div>
    </div>
  );
};
