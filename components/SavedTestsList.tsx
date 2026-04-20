
import React from 'react';
import type { SavedTest } from '../types.ts';
import { HistoryIcon, TrashIcon, DownloadIcon } from './IconComponents.tsx';

interface SavedTestsListProps {
  savedTests: SavedTest[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

const SavedTestsList: React.FC<SavedTestsListProps> = ({ savedTests, onLoad, onDelete }) => {
  if (savedTests.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 p-4 sm:p-6 lg:p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
      <div className="flex items-center mb-4">
        <HistoryIcon className="w-6 h-6 mr-3 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-800">Lịch sử đề đã tạo</h2>
      </div>
      <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {savedTests.map(test => (
          <li key={test.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
            <div className="flex-grow mb-2 sm:mb-0">
              <button onClick={() => onLoad(test.id)} className="text-left">
                <p className="font-semibold text-blue-700 hover:underline">{test.name}</p>
              </button>
              <p className="text-xs text-gray-500">
                Lưu lúc: {new Date(test.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => onLoad(test.id)}
                className="flex items-center px-3 py-1 text-xs font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                title="Tải lại đề"
              >
                <DownloadIcon className="w-3 h-3 mr-1 transform rotate-180" />
                Tải
              </button>
              <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(test.id);
                }}
                className="flex items-center px-3 py-1 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                title="Xóa đề"
              >
                <TrashIcon className="w-3 h-3 mr-1" />
                Xóa
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SavedTestsList;