const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = "mongodb+srv://nguyentungduong2005pc_db_user:linh2806@cluster0.ygfvalz.mongodb.net/dienmay_bichhuong?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("Đã kết nối MongoDB thành công!"))
  .catch(err => console.error("Lỗi kết nối MongoDB:", err));

const OrderSchema = new mongoose.Schema({
  hoTen: String,
  soDienThoai: String,
  sanPham: String,
  diaChi: String,
  ngayDat: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

app.get('/', (req, res) => {
  res.send("Server Điện máy Bích Hương đang hoạt động!");
});

app.post('/api/dat-hang', async (req, res) => {
  try {
    const donMoi = new Order(req.body);
    await donMoi.save();
    res.status(200).json({ thanhCong: true, thongBao: "Đã gửi thông tin thành công! Shop sẽ liên hệ lại ngay." });
  } catch (error) {
    res.status(500).json({ thanhCong: false, thongBao: "Lỗi hệ thống, vui lòng gọi trực tiếp 0967 887 140!" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chạy ở cổng ${PORT}`));
