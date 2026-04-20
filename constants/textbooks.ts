
export interface Lesson {
  id: string;
  name: string;
  startPage: number;
  endPage: number;
}

export interface SubjectTheme {
  id: string;
  name: string;
  lessons: Lesson[];
}

export const TEXTBOOKS: Record<string, Record<string, SubjectTheme[]>> = {
  'Tin học': {
    '3': [
      {
        id: 'th3-cd1',
        name: 'Chủ đề 1. Máy tính và em',
        lessons: [
          { id: 'th3-b1', name: 'Bài 1. Thông tin và quyết định', startPage: 5, endPage: 8 },
          { id: 'th3-b2', name: 'Bài 2. Xử lí thông tin', startPage: 9, endPage: 12 },
          { id: 'th3-b3', name: 'Bài 3. Máy tính và em', startPage: 13, endPage: 17 },
          { id: 'th3-b4', name: 'Bài 4. Làm việc với máy tính', startPage: 18, endPage: 24 },
          { id: 'th3-b5', name: 'Bài 5. Sử dụng bàn phím', startPage: 25, endPage: 29 },
        ]
      },
      {
        id: 'th3-cd2',
        name: 'Chủ đề 2. Mạng máy tính và Internet',
        lessons: [
          { id: 'th3-b6', name: 'Bài 6. Khám phá thông tin trên Internet', startPage: 30, endPage: 33 },
        ]
      },
      {
        id: 'th3-cd3',
        name: 'Chủ đề 3. Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin',
        lessons: [
          { id: 'th3-b7', name: 'Bài 7. Sắp xếp để dễ tìm', startPage: 34, endPage: 37 },
          { id: 'th3-b8', name: 'Bài 8. Sơ đồ hình cây. Tổ chức thông tin trong máy tính', startPage: 38, endPage: 41 },
          { id: 'th3-b9', name: 'Bài 9. Thực hành với tệp và thư mục trong máy tính', startPage: 42, endPage: 45 },
        ]
      },
      {
        id: 'th3-cd4',
        name: 'Chủ đề 4. Đạo đức, pháp luật và văn hoá trong môi trường số',
        lessons: [
          { id: 'th3-b10', name: 'Bài 10. Bảo vệ thông tin khi dùng máy tính', startPage: 46, endPage: 49 },
        ]
      },
      {
        id: 'th3-cd5',
        name: 'Chủ đề 5. Tin học ứng dụng',
        lessons: [
          { id: 'th3-b11', name: 'Bài 11. Bài trình chiếu của em', startPage: 50, endPage: 54 },
          { id: 'th3-b12', name: 'Bài 12. Tìm hiểu về thế giới tự nhiên', startPage: 55, endPage: 58 },
          { id: 'th3-b13', name: 'Bài 13. Luyện tập sử dụng chuột', startPage: 59, endPage: 62 },
        ]
      },
      {
        id: 'th3-cd6',
        name: 'Chủ đề 6. Giải quyết vấn đề với sự trợ giúp của máy tính',
        lessons: [
          { id: 'th3-b14', name: 'Bài 14. Em thực hiện công việc như thế nào?', startPage: 63, endPage: 66 },
          { id: 'th3-b15', name: 'Bài 15. Công việc được thực hiện theo điều kiện', startPage: 67, endPage: 70 },
          { id: 'th3-b16', name: 'Bài 16. Công việc của em và sự trợ giúp của máy tính', startPage: 71, endPage: 74 },
        ]
      }
    ],
    '4': [
      {
        id: 'th4-cd1',
        name: 'Chủ đề 1. Máy tính và em',
        lessons: [
          { id: 'th4-b1', name: 'Bài 1. Phần cứng và phần mềm máy tính', startPage: 5, endPage: 9 },
          { id: 'th4-b2', name: 'Bài 2. Gõ bàn phím đúng cách', startPage: 10, endPage: 13 },
        ]
      },
      {
        id: 'th4-cd2',
        name: 'Chủ đề 2. Mạng máy tính và Internet',
        lessons: [
          { id: 'th4-b3', name: 'Bài 3. Thông tin trên trang web', startPage: 14, endPage: 17 },
        ]
      },
      {
        id: 'th4-cd3',
        name: 'Chủ đề 3. Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin',
        lessons: [
          { id: 'th4-b4', name: 'Bài 4. Tìm kiếm thông tin trên Internet', startPage: 18, endPage: 21 },
          { id: 'th4-b5', name: 'Bài 5. Thao tác với tệp và thư mục', startPage: 22, endPage: 26 },
        ]
      },
      {
        id: 'th4-cd4',
        name: 'Chủ đề 4. Đạo đức, pháp luật và văn hoá trong môi trường số',
        lessons: [
          { id: 'th4-b6', name: 'Bài 6. Sử dụng phần mềm khi được phép', startPage: 27, endPage: 29 },
        ]
      },
      {
        id: 'th4-cd5',
        name: 'Chủ đề 5. Ứng dụng tin học',
        lessons: [
          { id: 'th4-b7', name: 'Bài 7. Tạo bài trình chiếu', startPage: 30, endPage: 33 },
          { id: 'th4-b8', name: 'Bài 8. Định dạng văn bản trên trang chiếu', startPage: 34, endPage: 38 },
          { id: 'th4-b9', name: 'Bài 9. Hiệu ứng chuyển trang', startPage: 39, endPage: 42 },
          { id: 'th4-b10', name: 'Bài 10. Phần mềm soạn thảo văn bản', startPage: 43, endPage: 46 },
          { id: 'th4-b11', name: 'Bài 11. Chỉnh sửa văn bản', startPage: 47, endPage: 51 },
          { id: 'th4-b12a', name: 'Bài 12A. Thực hành đa phương tiện', startPage: 52, endPage: 54 },
          { id: 'th4-b12b', name: 'Bài 12B. Phần mềm luyện tập gõ bàn phím', startPage: 55, endPage: 58 },
        ]
      },
      {
        id: 'th4-cd6',
        name: 'Chủ đề 6. Giải quyết vấn đề với sự trợ giúp của máy tính',
        lessons: [
          { id: 'th4-b13', name: 'Bài 13. Chơi với máy tính', startPage: 59, endPage: 62 },
          { id: 'th4-b14', name: 'Bài 14. Khám phá môi trường lập trình trực quan', startPage: 63, endPage: 67 },
          { id: 'th4-b15', name: 'Bài 15. Tạo chương trình máy tính để diễn tả ý tưởng', startPage: 68, endPage: 71 },
          { id: 'th4-b16', name: 'Bài 16. Chương trình của em', startPage: 72, endPage: 75 },
        ]
      }
    ],
    '5': [
      {
        id: 'th5-cd1',
        name: 'Chủ đề 1. Máy tính và em',
        lessons: [
          { id: 'th5-b1', name: 'Bài 1. Em có thể làm gì với máy tính?', startPage: 5, endPage: 7 },
        ]
      },
      {
        id: 'th5-cd2',
        name: 'Chủ đề 2. Mạng máy tính và Internet',
        lessons: [
          { id: 'th5-b2', name: 'Bài 2. Tìm kiếm thông tin trên website', startPage: 8, endPage: 13 },
        ]
      },
      {
        id: 'th5-cd3',
        name: 'Chủ đề 3. Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin',
        lessons: [
          { id: 'th5-b3', name: 'Bài 3. Tìm kiếm thông tin trong giải quyết vấn đề', startPage: 14, endPage: 18 },
          { id: 'th5-b4', name: 'Bài 4. Cây thư mục', startPage: 19, endPage: 23 },
        ]
      },
      {
        id: 'th5-cd4',
        name: 'Chủ đề 4. Đạo đức, pháp luật và văn hoá trong môi trường số',
        lessons: [
          { id: 'th5-b5', name: 'Bài 5. Bản quyền nội dung thông tin', startPage: 24, endPage: 28 },
        ]
      },
      {
        id: 'th5-cd5',
        name: 'Chủ đề 5. Ứng dụng tin học',
        lessons: [
          { id: 'th5-b6', name: 'Bài 6. Định dạng kí tự và bố trí hình ảnh trong văn bản', startPage: 29, endPage: 33 },
          { id: 'th5-b7', name: 'Bài 7. Thực hành soạn thảo văn bản', startPage: 34, endPage: 36 },
          { id: 'th5-b8a', name: 'Bài 8A. Làm quen với phần mềm đồ hoạ', startPage: 37, endPage: 42 },
          { id: 'th5-b9a', name: 'Bài 9A. Sử dụng phần mềm đồ hoạ tạo sản phẩm số', startPage: 43, endPage: 45 },
          { id: 'th5-b8b', name: 'Bài 8B. Làm sản phẩm thủ công theo video hướng dẫn', startPage: 46, endPage: 48 },
          { id: 'th5-b9b', name: 'Bài 9B. Thực hành tạo đồ dùng gia đình theo video hướng dẫn', startPage: 49, endPage: 51 },
        ]
      },
      {
        id: 'th5-cd6',
        name: 'Chủ đề 6. Giải quyết vấn đề với sự trợ giúp của máy tính',
        lessons: [
          { id: 'th5-b10', name: 'Bài 10. Cấu trúc tuần tự', startPage: 52, endPage: 55 },
          { id: 'th5-b11', name: 'Bài 11. Cấu trúc lặp', startPage: 56, endPage: 58 },
          { id: 'th5-b12', name: 'Bài 12. Thực hành sử dụng lệnh lặp', startPage: 59, endPage: 61 },
          { id: 'th5-b13', name: 'Bài 13. Cấu trúc rẽ nhánh', startPage: 62, endPage: 66 },
          { id: 'th5-b14', name: 'Bài 14. Sử dụng biến trong chương trình', startPage: 67, endPage: 72 },
          { id: 'th5-b15', name: 'Bài 15. Sử dụng biểu thức trong chương trình', startPage: 73, endPage: 77 },
          { id: 'th5-b16', name: 'Bài 16. Từ kịch bản đến chương trình', startPage: 78, endPage: 82 },
        ]
      }
    ]
  },
  'Công nghệ': {
    '3': [
      {
        id: 'cn3-cd1',
        name: 'Phần 1. Công nghệ và đời sống',
        lessons: [
          { id: 'cn3-b1', name: 'Bài 1. Tự nhiên và công nghệ', startPage: 7, endPage: 9 },
          { id: 'cn3-b2', name: 'Bài 2. Sử dụng đèn học', startPage: 10, endPage: 13 },
          { id: 'cn3-b3', name: 'Bài 3. Sử dụng quạt điện', startPage: 14, endPage: 18 },
          { id: 'cn3-b4', name: 'Bài 4. Sử dụng máy thu thanh', startPage: 19, endPage: 23 },
          { id: 'cn3-b5', name: 'Bài 5. Sử dụng máy thu hình', startPage: 24, endPage: 28 },
          { id: 'cn3-b6', name: 'Bài 6. An toàn với môi trường công nghệ trong gia đình', startPage: 29, endPage: 34 },
        ]
      },
      {
        id: 'cn3-cd2',
        name: 'Phần 2. Thủ công kĩ thuật',
        lessons: [
          { id: 'cn3-b7', name: 'Bài 7. Dụng cụ và vật liệu làm thủ công', startPage: 35, endPage: 40 },
          { id: 'cn3-b8', name: 'Bài 8. Làm đồ dùng học tập', startPage: 41, endPage: 45 },
          { id: 'cn3-b9', name: 'Bài 9. Làm biển báo giao thông', startPage: 46, endPage: 53 },
          { id: 'cn3-b10', name: 'Bài 10. Làm đồ chơi', startPage: 54, endPage: 62 },
        ]
      }
    ],
    '4': [
      {
        id: 'cn4-cd1',
        name: 'Phần 1. Công nghệ và đời sống',
        lessons: [
          { id: 'cn4-b1', name: 'Bài 1. Lợi ích của hoa, cây cảnh đối với đời sống', startPage: 6, endPage: 10 },
          { id: 'cn4-b2', name: 'Bài 2. Một số loại hoa, cây cảnh phổ biến', startPage: 11, endPage: 16 },
          { id: 'cn4-b3', name: 'Bài 3. Vật liệu và dụng cụ trồng hoa, cây cảnh trong chậu', startPage: 17, endPage: 20 },
          { id: 'cn4-b4', name: 'Bài 4. Gieo hạt hoa, cây cảnh trong chậu', startPage: 21, endPage: 23 },
          { id: 'cn4-b5', name: 'Bài 5. Trồng hoa, cây cảnh trong chậu', startPage: 24, endPage: 26 },
          { id: 'cn4-b6', name: 'Bài 6. Chăm sóc hoa, cây cảnh trong chậu', startPage: 27, endPage: 31 },
        ]
      },
      {
        id: 'cn4-cd2',
        name: 'Phần 2. Thủ công kĩ thuật',
        lessons: [
          { id: 'cn4-b7', name: 'Bài 7. Giới thiệu bộ lắp ghép mô hình kĩ thuật', startPage: 32, endPage: 38 },
          { id: 'cn4-b8', name: 'Bài 8. Lắp ghép mô hình bập bênh', startPage: 39, endPage: 41 },
          { id: 'cn4-b9', name: 'Bài 9. Lắp ghép mô hình robot', startPage: 42, endPage: 46 },
          { id: 'cn4-b10', name: 'Bài 10. Đồ chơi dân gian', startPage: 47, endPage: 50 },
          { id: 'cn4-b11', name: 'Bài 11. Làm đèn lồng', startPage: 51, endPage: 56 },
          { id: 'cn4-b12', name: 'Bài 12. Làm chuồn chuồn thăng bằng', startPage: 57, endPage: 63 },
        ]
      }
    ],
    '5': [
      {
        id: 'cn5-cd1',
        name: 'Phần 1. Công nghệ và đời sống',
        lessons: [
          { id: 'cn5-b1', name: 'Bài 1. Vai trò của công nghệ', startPage: 6, endPage: 8 },
          { id: 'cn5-b2', name: 'Bài 2. Nhà sáng chế', startPage: 9, endPage: 13 },
          { id: 'cn5-b3', name: 'Bài 3. Tìm hiểu thiết kế', startPage: 14, endPage: 16 },
          { id: 'cn5-b4', name: 'Bài 4. Thiết kế sản phẩm', startPage: 17, endPage: 18 },
          { id: 'cn5-b5', name: 'Bài 5. Sử dụng điện thoại', startPage: 19, endPage: 25 },
          { id: 'cn5-b6', name: 'Bài 6. Sử dụng tủ lạnh', startPage: 26, endPage: 30 },
        ]
      },
      {
        id: 'cn5-cd2',
        name: 'Phần 2. Thủ công kĩ thuật',
        lessons: [
          { id: 'cn5-b7', name: 'Bài 7. Lắp ráp mô hình xe điện chạy bằng pin', startPage: 32, endPage: 37 },
          { id: 'cn5-b8', name: 'Bài 8. Mô hình máy phát điện gió', startPage: 38, endPage: 43 },
          { id: 'cn5-b9', name: 'Bài 9. Mô hình điện mặt trời', startPage: 44, endPage: 50 },
        ]
      }
    ]
  }
};
