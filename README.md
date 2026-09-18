# Creative Lens

Extension Chrome xem insight creative đối thủ từ data.insightrackr.com: top creative theo network,
nhịp ra creative mới, geo, thông số sản xuất. Xuất được Excel.

## Cài đặt (1 lần)

1. Mở `chrome://extensions`, bật **Developer mode** (góc phải trên).
2. Bấm **Load unpacked** → chọn thư mục `creative-lens`.
3. Ghim icon Creative Lens lên thanh công cụ (biểu tượng mảnh ghép → ghim).

## Sử dụng

1. Mở https://data.insightrackr.com và đăng nhập như bình thường (tool dùng luôn phiên đăng nhập này).
2. Bấm icon Creative Lens → panel mở bên phải. Dòng trên cùng phải hiện "● Đã kết nối".
3. Nhập package (vd `com.ig.screwdom`), chọn khoảng ngày, bấm **Phân tích**.
   Game ~2.000 creative mất khoảng 1–2 phút. Lần sau mở lại cùng package + khoảng ngày sẽ hiện ngay.
4. Chọn network bằng các chip; xem 4 tab Top / Nhịp mới / Geo / Thông số; **Xuất Excel** ở dưới cùng.

Nếu báo "Phiên đăng nhập đã hết hạn": bấm **Tải lại tab insightrackr**, chờ trang tải xong rồi Phân tích lại.

## Đọc số cho đúng

- **cnt (Times Detected)** là chỉ số chính. **imp** là số ước lượng của insightrackr — chỉ để cảm nhận quy mô.
- Panel crawler lệch về Nhật: chỉ so **một geo qua thời gian**, đừng so geo này với geo khác.
- insightrackr chỉ thấy phía placement (SDK network). Meta feed / IG / TikTok in-feed / YouTube không có.

## Phát triển

`npm test` chạy unit test (Node ≥ 20). Ghi chú API: `docs/api-notes.md`.
