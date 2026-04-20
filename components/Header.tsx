
import React from 'react';
import { BrainCircuitIcon } from './IconComponents.tsx';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center space-x-3">
          <BrainCircuitIcon className="w-10 h-10 text-blue-600"/>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tạo đề kiểm tra cho Giáo viên Tiểu học</h1>
            <p className="text-sm text-gray-500">Tạo đề thi nhanh chóng theo Thông tư 27/2020/TT-BGDĐT</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;