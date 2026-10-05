# Kế hoạch debug Auth0 và Dashboard local

Ngày: 2026-10-05. Checkpoint 1.7: CẦN SỬA.

Nhánh FE: `codex/debug-local-auth-dashboard` (từ `test/frontend-quality-foundation`).
Nhánh BE khi cần sửa code: `codex/debug-local-auth-dashboard` (từ `main`).
HANDOFF là file nội bộ, không đưa vào commit.

## 1. Chốt hành vi và bằng chứng

- [x] Đọc ảnh, HANDOFF và code FE/BE; hai repo sạch trước khi làm.
- Login bắt đầu ở landing page hiện quay lại landing page vì nút không truyền `appState.returnTo`. Đây là hành vi hiện tại, không chứng minh callback protected route bị lỗi.
- Cần thử riêng mở `/dashboard` khi chưa đăng nhập; sau login phải trở về route đó.
- Chủ dự án xác nhận consent xuất hiện mỗi lần refresh, kể cả sau các lần đăng nhập trước. Chưa xác nhận request/grant Auth0 thực tế, không quy nguyên nhân cho việc chưa Accept.
- Decline trả `access_denied`; refresh callback cũ trả `Invalid state`. SDK chỉ gọi callback dọn URL sau khi xử lý thành công; nhánh lỗi giữ query callback. `AuthBootstrap` không cung cấp thao tác phục hồi.
- BE enum chỉ có `DAILY`; FE tạo habit với `DAILY`. Lỗi `TargetFrequency.daily` gợi ý dữ liệu MongoDB cũ dùng chữ thường, chưa được xác minh trực tiếp.

Commit FE cho mục này: `docs(debug): document local auth and dashboard investigation`.

## 2. FE: phục hồi khi callback bị từ chối

- [ ] Xử lý callback lỗi để URL đã dùng không bị xử lý lại khi refresh.
- [ ] Thêm đường về trang chủ và đăng nhập lại trên trang lỗi; không tự lặp redirect khi user chủ động từ chối.
- [ ] Giữ cơ chế kiểm tra OAuth state của SDK.
- [ ] Kiểm tra Decline → trang lỗi có hành động → refresh không tái dùng callback → đăng nhập lại thành công.
- [ ] Chạy test auth liên quan, lint và build.

Commit FE: `fix(auth): recover from denied authorization callbacks`.

## 3. FE/Auth0: consent lặp khi refresh và return route

- [ ] Tái hiện sau khi Accept thành công; ghi nhận scope/audience, loại lỗi silent session và return route, không lưu token/cookie vào log.
- [ ] Đối chiếu cache/session SDK và chính sách consent cho localhost với tài liệu Auth0 chính thức.
- [ ] Phân biệt vấn đề cấu hình tenant với lỗi FE; chỉ sửa khi có bằng chứng. Không bật token localStorage chỉ để che lỗi.
- [ ] Chốt login từ landing giữ `/` hay tới `/dashboard`; protected route phải giữ đường quay lại.
- [ ] Kiểm tra Accept → dashboard → refresh nhiều lần → logout → protected route yêu cầu login.

Commit FE nếu có sửa: `fix(auth): stabilize session restoration and return navigation`.
Nếu chỉ đổi cấu hình Auth0, commit tài liệu kết quả: `docs(auth): document verified local consent configuration`.

## 4. BE: xác minh và xử lý TargetFrequency.daily

- [ ] Kiểm tra stack trace để xác định lỗi đọc MongoDB hay parse request.
- [ ] Đếm habit có `targetFrequency: daily` trong đúng database local, tránh in dữ liệu user.
- [ ] Nếu cần sửa code BE, checkout nhánh BE đã nêu trước khi chỉnh.
- [ ] Chọn migration dữ liệu cũ hoặc read converter tương thích theo bằng chứng; giữ API/write contract `DAILY`.
- [ ] Mọi thay đổi dữ liệu phải giới hạn đúng record local đã xác minh và có phương án khôi phục; không xóa toàn database.
- [ ] Kiểm tra Dashboard và habits đọc được dữ liệu; kiểm tra regression mapping nếu sửa converter.

Commit BE nếu có code: `fix(habits): handle legacy target frequency values`.
Nếu chỉ cần migration có script, commit script/hướng dẫn với convention `fix(data): normalize legacy habit frequencies`.

## 5. Xác minh lại checkpoint 1.7

- [ ] Chạy lại đủ login, callback, dashboard, refresh, logout và protected route.
- [ ] Kiểm tra thêm Decline và khả năng bắt đầu lại.
- [ ] Ghi kết quả thực tế vào HANDOFF; chỉ tick PASS khi có bằng chứng.
- [ ] Chạy các checks phù hợp sau thay đổi và ghi kết quả vào file này.

Commit FE: `docs(debug): record local auth and dashboard verification`.

## Quy tắc commit

Mỗi mục sửa hoàn tất có một commit riêng trong repo tương ứng, dùng `type(scope): description`. Không commit secret, env local, authenticated storage state hoặc HANDOFF. Không đánh dấu các mục debug hoàn tất chỉ vì đã checkout nhánh hoặc đã có kế hoạch.
