
import React from 'react';

interface ProgressBarProps {
  progress: number;
  text: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, text }) => {
  const progressPercentage = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      <p className="text-center text-lg font-semibold text-blue-600 mb-4">{text}</p>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      <p className="text-center text-sm text-gray-500 mt-2">{Math.round(progressPercentage)}%</p>
    </div>
  );
};

export default ProgressBar;