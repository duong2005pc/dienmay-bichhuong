
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ===============================
// 1. KẾT NỐI MONGODB
// ===============================

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Đã kết nối MongoDB thành công!'))
  .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// ===============================
// 2. CẤU HÌNH CLOUDINARY
// ===============================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ được tải lên file hình ảnh!'));
    }
  }
});

// ===============================
// 3. DANH MỤC SẢN PHẨM
// ===============================

const DANH_MUC = [
  'dieuhoa',
  'tivi',
  'tulanh',
  'maygiat',
  'quat',
  'noicom',
  'loc',
  'locnuoc',
  'hutbui'
];

// ===============================
// 4. MODEL ĐƠN HÀNG
// ===============================

const OrderSchema = new mongoose.Schema({
  hoTen: String,
  soDienThoai: String,
  sanPham: String,
  diaChi: String,
  ngayDat: {
    type: Date,
    default: Date.now
  }
});

const Order = mongoose.models.Order ||
  mongoose.model('Order', OrderSchema);

// ===============================
// 5. MODEL SẢN PHẨM
// ===============================

const ProductSchema = new mongoose.Schema({
  ten: {
    type: String,
    required: true,
    trim: true
  },
  gia: {
    type: Number,
    required: true,
    min: 0
  },
  moTa: {
    type: String,
    default: ''
  },
  danhMuc: {
    type: String,
    required: true,
    enum: DANH_MUC
  },
  anh: {
    type: String,
    default: ''
  },
  maCu: {
    type: String,
    default: undefined
  },
  thuongHieu: {
    type: String,
    default: ''
  },
  giaCu: {
    type: Number,
    default: 0
  },
  thongSo: {
    type: Number,
    default: 0
  },
  daBan: {
    type: Number,
    default: 0
  },
  ngayTao: {
    type: Date,
    default: Date.now
  }
});

const Product = mongoose.models.Product ||
  mongoose.model('Product', ProductSchema);

// ===============================
// 6. KIỂM TRA ĐĂNG NHẬP ADMIN
// ===============================

function kiemTraAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        thanhCong: false,
        thongBao: 'Bạn cần đăng nhập Admin!'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        thanhCong: false,
        thongBao: 'Bạn không có quyền truy cập!'
      });
    }

    next();

  } catch (error) {
    return res.status(401).json({
      thanhCong: false,
      thongBao: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn!'
    });
  }
}

// ===============================
// 7. TRANG CHỦ BACKEND
// ===============================

app.get('/', (req, res) => {
  res.send('Server Điện máy Bích Hương đang hoạt động!');
});

// ===============================
// 8. MỞ TRANG QUẢN TRỊ ADMIN
// ===============================

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

// ===============================
// 9. ĐĂNG NHẬP ADMIN
// ===============================

app.post('/api/admin/dang-nhap', (req, res) => {
  try {
    const { tenDangNhap, matKhau } = req.body;

    if (
      !process.env.ADMIN_USERNAME ||
      !process.env.ADMIN_PASSWORD ||
      !process.env.JWT_SECRET
    ) {
      return res.status(500).json({
        thanhCong: false,
        thongBao: 'Backend chưa được cấu hình tài khoản Admin!'
      });
    }

    if (
      tenDangNhap !== process.env.ADMIN_USERNAME ||
      matKhau !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        thanhCong: false,
        thongBao: 'Tên đăng nhập hoặc mật khẩu không đúng!'
      });
    }

    const token = jwt.sign(
      {
        role: 'admin',
        username: tenDangNhap
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '12h'
      }
    );

    res.json({
      thanhCong: true,
      thongBao: 'Đăng nhập thành công!',
      token: token
    });

  } catch (error) {
    res.status(500).json({
      thanhCong: false,
      thongBao: 'Không thể đăng nhập!'
    });
  }
});

// ===============================
// 10. LẤY DANH SÁCH SẢN PHẨM
// ===============================

app.get('/api/san-pham', async (req, res) => {
  try {
    const { danhMuc } = req.query;

    const dieuKien = {};

    if (danhMuc) {
      if (!DANH_MUC.includes(danhMuc)) {
        return res.status(400).json({
          thanhCong: false,
          thongBao: 'Danh mục không hợp lệ!'
        });
      }

      dieuKien.danhMuc = danhMuc;
    }

    const danhSach = await Product.find(dieuKien)
      .sort({ ngayTao: -1 });

    res.json({
      thanhCong: true,
      duLieu: danhSach
    });

  } catch (error) {
    res.status(500).json({
      thanhCong: false,
      thongBao: 'Không thể lấy danh sách sản phẩm!'
    });
  }
});

// ===============================
// 11. NHẬP DỮ LIỆU SẢN PHẨM CŨ (CHỈ TẠO MỘT LẦN)
// ===============================

app.post('/api/admin/import-san-pham-cu', kiemTraAdmin, async (req, res) => {
  try {
    const duLieuCu = require(path.join(__dirname, '..', 'du-lieu-san-pham-cu.json'));

    const operations = duLieuCu.map(sp => ({
      updateOne: {
        filter: { maCu: sp.maCu },
        update: { $setOnInsert: sp },
        upsert: true
      }
    }));

    const ketQua = await Product.bulkWrite(operations, { ordered: false });

    res.json({
      thanhCong: true,
      thongBao: `Đã nhập ${ketQua.upsertedCount || 0} sản phẩm cũ mới. Dữ liệu cũ đã có sẽ không bị nhân đôi.`,
      soLuongMoi: ketQua.upsertedCount || 0,
      tongDuLieuCu: duLieuCu.length
    });
  } catch (error) {
    console.error('Lỗi nhập dữ liệu sản phẩm cũ:', error);
    res.status(500).json({
      thanhCong: false,
      thongBao: 'Không thể nhập dữ liệu sản phẩm cũ!'
    });
  }
});

// ===============================
// 12. THÊM SẢN PHẨM
// ===============================

app.post('/api/admin/san-pham', kiemTraAdmin, async (req, res) => {
  try {
    const { ten, gia, moTa, danhMuc, anh } = req.body;

    if (!ten || gia === undefined || gia === '' || !danhMuc) {
      return res.status(400).json({
        thanhCong: false,
        thongBao: 'Vui lòng nhập tên, giá và danh mục!'
      });
    }

    if (!Number.isFinite(Number(gia)) || Number(gia) < 0) {
      return res.status(400).json({
        thanhCong: false,
        thongBao: 'Giá sản phẩm không hợp lệ!'
      });
    }

    if (!DANH_MUC.includes(danhMuc)) {
      return res.status(400).json({
        thanhCong: false,
        thongBao: 'Danh mục không hợp lệ!'
      });
    }

    const sanPhamMoi = await Product.create({
      ten,
      gia: Number(gia),
      moTa,
      danhMuc,
      anh
    });

    res.status(201).json({
      thanhCong: true,
      thongBao: 'Thêm sản phẩm thành công!',
      duLieu: sanPhamMoi
    });

  } catch (error) {
    res.status(500).json({
      thanhCong: false,
      thongBao: 'Không thể thêm sản phẩm!'
    });
  }
});

// ===============================
// 12. SỬA SẢN PHẨM
// ===============================

app.put('/api/admin/san-pham/:id', kiemTraAdmin, async (req, res) => {
  try {
    const { ten, gia, moTa, danhMuc, anh } = req.body;

    if (
      gia !== undefined &&
      (!Number.isFinite(Number(gia)) || Number(gia) < 0)
    ) {
      return res.status(400).json({
        thanhCong: false,
        thongBao: 'Giá sản phẩm không hợp lệ!'
      });
    }

    if (danhMuc !== undefined && !DANH_MUC.includes(danhMuc)) {
      return res.status(400).json({
        thanhCong: false,
        thongBao: 'Danh mục không hợp lệ!'
      });
    }

    const sanPham = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...(ten !== undefined && { ten }),
        ...(gia !== undefined && { gia: Number(gia) }),
        ...(moTa !== undefined && { moTa }),
        ...(danhMuc !== undefined && { danhMuc }),
        ...(anh !== undefined && { anh })
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!sanPham) {
      return res.status(404).json({
        thanhCong: false,
        thongBao: 'Không tìm thấy sản phẩm!'
      });
    }

    res.json({
      thanhCong: true,
      thongBao: 'Cập nhật sản phẩm thành công!',
      duLieu: sanPham
    });

  } catch (error) {
    res.status(500).json({
      thanhCong: false,
      thongBao: 'Không thể cập nhật sản phẩm!'
    });
  }
});

// ===============================
// 13. XÓA SẢN PHẨM
// ===============================

app.delete('/api/admin/san-pham/:id', kiemTraAdmin, async (req, res) => {
  try {
    const sanPham = await Product.findByIdAndDelete(req.params.id);

    if (!sanPham) {
      return res.status(404).json({
        thanhCong: false,
        thongBao: 'Không tìm thấy sản phẩm!'
      });
    }

    res.json({
      thanhCong: true,
      thongBao: 'Đã xóa sản phẩm!'
    });

  } catch (error) {
    res.status(500).json({
      thanhCong: false,
      thongBao: 'Không thể xóa sản phẩm!'
    });
  }
});

// ===============================
// 14. TẢI ẢNH SẢN PHẨM
// ===============================

app.post(
  '/api/admin/upload',
  kiemTraAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          thanhCong: false,
          thongBao: 'Bạn chưa chọn ảnh!'
        });
      }

      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        return res.status(500).json({
          thanhCong: false,
          thongBao: 'Chưa cấu hình dịch vụ lưu trữ ảnh!'
        });
      }

      const streamUpload = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'dienmay-bichhuong'
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

          stream.end(req.file.buffer);
        });
      };

      const ketQua = await streamUpload();

      res.json({
        thanhCong: true,
        thongBao: 'Tải ảnh thành công!',
        anh: ketQua.secure_url
      });

    } catch (error) {
      res.status(500).json({
        thanhCong: false,
        thongBao: 'Không thể tải ảnh lên!'
      });
    }
  }
);

// ===============================
// 15. ĐẶT HÀNG (GIỮ CHỨC NĂNG CŨ)
// ===============================

app.post('/api/dat-hang', async (req, res) => {
  try {
    const donMoi = new Order(req.body);
    await donMoi.save();

    res.status(200).json({
      thanhCong: true,
      thongBao: 'Đã gửi thông tin thành công! Shop sẽ liên hệ lại ngay.'
    });

  } catch (error) {
    res.status(500).json({
      thanhCong: false,
      thongBao: 'Lỗi hệ thống, vui lòng gọi trực tiếp 0967 887 140!'
    });
  }
});

// ===============================
// 16. XỬ LÝ LỖI TẢI ẢNH
// ===============================

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      thanhCong: false,
      thongBao: 'Ảnh quá lớn hoặc không thể tải lên!'
    });
  }

  if (error) {
    return res.status(400).json({
      thanhCong: false,
      thongBao: error.message || 'Đã xảy ra lỗi!'
    });
  }

  next();
});

// ===============================
// 17. KHỞI ĐỘNG SERVER
// ===============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server chạy ở cổng ${PORT}`);
});
