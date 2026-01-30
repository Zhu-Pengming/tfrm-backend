
import React from 'react';

interface LibraryTabsProps {
  isPrivate: boolean;
  onToggle: (isPrivate: boolean) => void;
}

const LibraryTabs: React.FC<LibraryTabsProps> = ({ isPrivate, onToggle }) => {
  return (
    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit mb-8 border border-slate-200">
      <button
        onClick={() => onToggle(true)}
        className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
          isPrivate
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        我的私有库
      </button>
      <button
        onClick={() => onToggle(false)}
        className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
          !isPrivate
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        公共资源池
      </button>
    </div>
  );
};

export default LibraryTabs;
