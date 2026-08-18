import React from "react";
import { AlertTriangle, Trophy, X, ShieldAlert } from "lucide-react";

interface LimitAlertModalProps {
  isOpen: boolean;
  department: string;
  count: number;
  limit: number;
  onClose: () => void;
  onViewLeaderboard: () => void;
}

export const LimitAlertModal: React.FC<LimitAlertModalProps> = ({
  isOpen,
  department,
  count,
  limit,
  onClose,
  onViewLeaderboard,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="limit-alert-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="limit-alert-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full border-2 border-red-400/80 shadow-2xl overflow-hidden animate-scale-up"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-800/80 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Participant Quota Reached</h3>
              <p className="text-xs text-red-100 font-medium">Hospital Department Limit</p>
            </div>
          </div>
          <button
            id="close-limit-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-red-800/60 text-red-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-base font-bold text-red-900 mb-1" id="limit-alert-message">
              Sorry! Your department has reached its 5-participant limit.
            </p>
            <p className="text-sm text-red-700">
              Department: <strong className="text-red-950">{department}</strong> ({count}/{limit} slots completed)
            </p>
          </div>

          <p className="text-sm text-stone-600 leading-relaxed mb-6 text-center">
            To ensure fair competition across all hospital wings, each department is capped at exactly 5 official participants. You can still view the live standings and cheer for your department colleagues on the leaderboard!
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              id="limit-modal-view-leaderboard-btn"
              onClick={onViewLeaderboard}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm"
            >
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span>View Department Standings</span>
            </button>
            <button
              id="limit-modal-dismiss-btn"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-medium text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
