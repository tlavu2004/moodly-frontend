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

- [x] Xử lý callback lỗi để URL đã dùng không bị xử lý lại khi refresh.
- [x] Thêm đường về trang chủ và đăng nhập lại trên trang lỗi; không tự lặp redirect khi user chủ động từ chối.
- [x] Giữ cơ chế kiểm tra OAuth state của SDK.
- [ ] Kiểm tra Decline → trang lỗi có hành động → refresh không tái dùng callback → đăng nhập lại thành công.
- [x] Chạy test auth liên quan, lint và build.

Commit FE: `fix(auth): recover from denied authorization callbacks`.

## 3. FE/Auth0: consent lặp khi refresh và return route

- [ ] Tái hiện sau khi Accept thành công; ghi nhận scope/audience, loại lỗi silent session và return route, không lưu token/cookie vào log.
- [x] Đối chiếu cache/session SDK và chính sách consent cho localhost với tài liệu Auth0 chính thức.
- [ ] Phân biệt vấn đề cấu hình tenant với lỗi FE; chỉ sửa khi có bằng chứng. Không bật token localStorage chỉ để che lỗi.
- [x] Chốt login từ landing giữ `/`; protected route giữ đường quay lại theo SDK.
- [ ] Kiểm tra Accept → dashboard → refresh nhiều lần → logout → protected route yêu cầu login.

Commit FE nếu có sửa: `fix(auth): stabilize session restoration and return navigation`.
Nếu chỉ đổi cấu hình Auth0, commit tài liệu kết quả: `docs(auth): document verified local consent configuration`.

## 4. BE: xác minh và xử lý TargetFrequency.daily

- [ ] Kiểm tra stack trace để xác định lỗi đọc MongoDB hay parse request.
- [ ] Đếm habit có `targetFrequency: daily` trong đúng database local, tránh in dữ liệu user.
- [x] Checkout nhánh BE đã nêu trước khi chỉnh.
- [x] Thêm read converter cho giá trị cũ `daily`; giữ API/write contract `DAILY`. Test dùng MappingMongoConverter thực tế xác minh cả đọc và ghi.
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

## Kết quả sửa ngày 2026-10-08 và cách chạy lại 1.7

- FE `5fd54fd`: dọn callback lỗi đã tiêu thụ; trang lỗi có Back to home và Sign in again. Test callback xác minh query OAuth bị gỡ, query khác được giữ.
- FE `11fdb94`: cache SDK bằng sessionStorage chỉ trên localhost/127.0.0.1, giữ token còn hạn qua refresh. Production dùng cache memory mặc định. Cache phiên vẫn có thể bị JavaScript cùng origin đọc, chỉ dùng dữ liệu test local; SDK vẫn kiểm tra expiry, logout xóa cache qua ICache. Nếu browser chặn sessionStorage, quay về memory cache.
- BE `16ca873`: đọc `daily` cũ thành `DAILY`; không chạy migration/xóa dữ liệu. Hai regression tests đạt; giá trị không hỗ trợ vẫn bị từ chối.
- Kiểm tra tự động: FE 25 files / 75 tests PASS; lint và build/bundle budget PASS. BE `mvn test -Dtest=HabitMongoConfigurationTest`: 2 tests PASS. Full FE suite lần đầu lỗi cache temp sandbox ENOENT; chạy lại ngoài sandbox đạt toàn bộ.
- Auth0 có thể yêu cầu xác nhận trên callback không xác minh được như localhost: [Auth0 hướng dẫn](https://support.auth0.com/center/s/article/understanding-and-testing-the-non-verifiable-callback-uri-consent-screen). Cache giúp refresh khi token còn hạn; khi token hết hạn hoặc tab mới vẫn có thể cần đăng nhập/consent tương tác.
- Docker chưa chạy trong phiên debug, chưa kiểm tra DB thật hoặc login Auth0 end-to-end. Các ô manual phía trên chưa tick; checkpoint 1.7 vẫn chờ chạy lại.

### Khởi động

1. Mở Docker Desktop, chờ engine sẵn sàng.
2. Trong repo BE, dùng terminal Git Bash đã chạy Makefile trước đây: `make local-run`. Dừng backend cũ trước khi chạy lại để tải converter mới.
3. Trong repo FE: `npm run dev -- --mode development`.
4. Mở một tab mới `http://localhost:5173/` (không mở lại URL callback chứa code/state/error).

### Các kịch bản cần xác nhận

Bug bổ sung ngày 2026-10-08: URL `/dashboard` nhưng còn hiển thị landing sau callback. Nguyên nhân: callback mặc định Auth0 dùng `history.replaceState`, không cập nhật location của BrowserRouter đang mount. Đã đặt BrowserRouter ngoài Auth0Provider và dùng `navigate(..., { replace: true })` trong callback. Regression test xác minh cả URL lẫn nội dung route đổi ngay, không cần F5.

Chạy lại riêng bug này: logout → mở thẳng `/dashboard` → hoàn tất login/Accept → phải thấy Dashboard ngay. Không bấm F5 hoặc Open dashboard để hoàn tất phép thử. Sau đó thử refresh để xác nhận nội dung vẫn là Dashboard.

1. Từ landing, bấm Sign in → đăng nhập → Accept nếu được hỏi. Quay về landing với nút Open dashboard là đúng; bấm Open dashboard. Dashboard và Habits phải tải được, không còn lỗi TargetFrequency.daily.
2. Trong cùng tab, refresh Dashboard 3 lần liên tiếp. Phải ở Dashboard, dữ liệu tải được và không xuất hiện consent lại khi token còn hạn.
3. Logout → về landing. Mở trực tiếp `/dashboard` khi chưa đăng nhập → Auth0 → hoàn tất đăng nhập → trở về `/dashboard`. Đây là kịch bản dùng để điền dòng Login quay lại /dashboard trong 1.7.
4. Khi consent xuất hiện, bấm Decline → trang lỗi có Back to home và Sign in again; URL không còn query state/error. Refresh không còn Invalid state. Bấm Back to home hoặc Sign in again để bắt đầu luồng mới.
5. Nếu consent không xuất hiện do grant/session hiện có, ghi kịch bản Decline là chưa tái hiện; không thu hồi grant hoặc sửa tenant chỉ để tạo ảnh.
6. Ghi từng kết quả vào HANDOFF 1.7. Chỉ PASS Dashboard sau khi dữ liệu thật tải thành công; gửi lại checkpoint 1 sau khi các bước đạt. Reset endpoint vẫn chưa có, chưa chạy full authenticated E2E.
