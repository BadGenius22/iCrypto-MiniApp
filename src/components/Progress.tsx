import React from "react";

interface ProgressProps {
  value: number;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  className = "",
}) => {
  return (
    <div className={`w-full bg-purple-200 rounded-full h-2.5 ${className}`}>
      <div
        className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
};
