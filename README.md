# HOÀN — Frontend chính

Đã duyệt: nền thiết kế Giai đoạn 3, sửa Reduce Motion của Giai đoạn 4, card tiền hoàn dẫn về Ví, và thiết kế Lịch sử rút tiền dùng dữ liệu thật trong state demo.

[Chi tiết rà soát nghiệp vụ và QA](docs/frontend-audit.md).

[Kiểm tra dọn dẹp mã nguồn và giới hạn giữ lại](docs/repository-hygiene.md).

Chạy kiểm thử: `npm ci && npm test`. Các suite trình duyệt: `npm run test:critical`, `test:scenarios`, `test:orders`, `test:tabs`, `test:accessibility`, `test:axe` (Chrome/Playwright).

**Lưu ý:** ứng dụng còn sử dụng fixture/adapter demo, chưa tích hợp thanh toán, ngân hàng và Shopee thật.
