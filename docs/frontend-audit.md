# HOÀN — Rà soát và hoàn thiện frontend

Gốc: Giai đoạn 3 `66d6b74` và QA Giai đoạn 4 `6421537`. Nhánh bảo toàn bản chính cũ: `backup-before-frontend-finish-20261009` (commit `135199f`).

**Đã đưa vào:** Giao diện Giai đoạn 3; sửa Reduced Motion của Giai đoạn 4; bỏ “Xem ví”, toàn bộ card tiền hoàn về Ví; Lịch sử rút tiền với thẻ rõ ràng, lọc Đang rút/Đã chuyển/Đã hoàn tiền về Ví, chỉ lấy các yêu cầu trong state, không có giao dịch ví dụ.

## Logic đã kiểm tra
- Link Shopee: kiểm tra domain/giả mạo, trạng thái lỗi và stale response.
- Đơn hàng: trạng thái chờ ghi nhận, xác minh, đã về Ví, từ chối; không tái xuất hiện lỗi tap/spacing.
- Tiền hoàn và thành viên: thưởng hạng tính trên tiền hoàn gốc, không tính trên toàn bộ hoa hồng.
- Ví: tiền có thể rút, đang ghi nhận, chờ về Ví, đang rút, đã rút tách bạch.
- Rút tiền: tối thiểu, số dư, tài khoản xác minh, chống yêu cầu trùng, hủy yêu cầu sau khi xử lý.
- Hoàn tiền rút: chỉ hiển thị “Đã hoàn tiền về Ví” khi reducer mô phỏng xử lý từ chối và cộng lại số dư, đồng thời ghi ledger dương. Không bịa nguyên nhân tài khoản không hợp lệ.
- BANK/MOMO: kiểm tra định dạng, che số, chọn/xóa tài khoản, xác minh mô phỏng.
- Mã mời: chặn mã bản thân và áp dụng trùng, thưởng trên tiền hoàn gốc.
- Đăng nhập/ngoại tuyến, thông báo thiết bị, copy/share, hướng dẫn: các nhánh UX chính được giữ nguyên.

## Kiểm thử
Giai đoạn 4 đã có kết quả **46/46** unit test, **150 checks** trên **17 kịch bản × 3 chiều rộng**, luồng rút/hoàn tiền, 18 lượt axe-core và 10 chu kỳ đóng/mở Đơn hàng. Các kết quả này thuộc *bản QA trước khi đưa thay đổi mới vào bản chính*. Bản chính bổ sung kiểm thử Lịch sử rút và CI; chỉ được đánh dấu PASS sau khi chạy lại trên commit mới.

## Giới hạn còn lại
Đây là **demo frontend**, không phải ứng dụng chuyển tiền thật. Không có backend ngân hàng, đối soát Shopee hay xác minh tài khoản thật. Khi kết nối backend cần quản lý idempotency/refund server-side và trạng thái không xác định. Safari iPhone thật/VoiceOver chưa được kiểm chứng. 108 trường hợp “incomplete” của axe về gradient vẫn cần rà soát tương phản thủ công, không được gọi là vi phạm đã xác nhận.

## Nghiệm thu tự động trên bản đã phát hành

- **Main đã được nâng cấp:** commit giao diện `07d55621efccd7eb2139a1238e5b3617f94fe515`.
- **51/51 bài kiểm thử logic đạt**, bao gồm 46 bài nghiệp vụ gốc và 5 bài Lịch sử rút tiền mới.
- **150 kiểm tra tình huống / 17 kịch bản × 3 viewport**, không có phát hiện lỗi trong lần CI cuối.
- **4 kích thước 320/375/390/430 px:** cả bốn vùng card Trang chủ đều mở Ví; lọc lịch sử, số dư và chống tràn ngang đạt.
- **Luồng end-to-end:** tạo yêu cầu 50.000 ₫ → đang rút → từ chối → hoàn lại 50.000 ₫ về Ví → kiểm tra card lịch sử và trang chi tiết; đạt.
- **Đơn hàng:** 4 kích thước, 10 chu kỳ đóng/mở không lệch card hoặc xuất hiện bóng chạm; đạt.
- **Điều hướng và Reduce Motion:** không dùng animation Giai đoạn 3M, chuyển tab đúng, điều hướng bàn phím có focus, giảm chuyển động được tôn trọng; đạt.
- **axe-core 18 lượt màn hình:** 0 vi phạm tự động được xác định. Mục chưa xác định tương phản gradient vẫn phải kiểm tra thủ công.
- Workflow đã thành công trên commit bản chính: [CI main — run 37816565610](https://github.com/LTTuan2609/hoan-demo10-payout-review-20261008/actions/runs/37816565610).
- Website GitHub Pages chính đã được kiểm tra tải CSS/JavaScript phiên bản mới, URL lịch sử trả về HTTP 200, không hiển thị các mục mô phỏng hay liên kết “Xem ví” dư thừa.

**Kết luận:** Hoàn thành vòng phát hành và nghiệm thu tự động của **frontend demo**; chưa thay thế nghiệm thu Safari/VoiceOver trên thiết bị iPhone thật hoặc kiểm toán backend tài chính. Không được tuyên bố hoàn thành hệ thống giao dịch tiền thật.
