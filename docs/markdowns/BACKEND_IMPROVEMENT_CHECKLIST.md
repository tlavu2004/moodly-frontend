# Moodly Backend Improvement Checklist

> Các việc frontend còn thiếu được theo dõi riêng tại
> [`FRONTEND_COMPLETION_CHECKLIST.md`](./FRONTEND_COMPLETION_CHECKLIST.md).

## Mục đích

Tài liệu này tổng hợp những điểm backend cần hoàn thiện sau khi đối chiếu giao diện frontend với `moodly-openapi.json` phiên bản `v1`.

Phạm vi frontend route số 6 hiện được xem là hoàn thành:

- Dashboard sử dụng dữ liệu thật từ habits, entries, streak và mood trend.
- Habits có danh sách, tạo mới và streak.
- Daily entry/mood có check-in tâm trạng và cập nhật habit trong ngày.
- Entries có lịch sử theo khoảng ngày.
- Stats có mood trend theo tuần và danh sách habit bị bỏ lỡ.
- Profile/avatar có upload signature, upload Cloudinary và confirm.
- Search sử dụng query parameter `q`, `from`, `to`.

Các mục dưới đây là cải tiến backend hoặc contract, không chặn việc đánh dấu frontend route số 6 là `DONE`.

## P0 — Cần thống nhất trước khi mở rộng nghiệp vụ

### 1. Chuẩn hóa `targetFrequency`

Hiện tại `CreateHabitRequest.targetFrequency` chỉ là một chuỗi không rỗng. Frontend đang cung cấp các giá trị:

- `DAILY`
- `WEEKDAYS`
- `WEEKLY`

Backend hiện lưu nguyên chuỗi và chưa thể hiện logic tính streak hoặc missed count theo từng tần suất.

- [x] Quyết định tập giá trị frequency chính thức: chỉ hỗ trợ `DAILY`.
- [x] Chuyển frequency thành enum ở backend.
- [x] Xuất enum trong OpenAPI để SDK sinh union type chính xác.
- [x] Từ chối giá trị không hợp lệ bằng validation error có field `targetFrequency`.
- [x] Không áp dụng quy tắc `WEEKDAYS`; frontend không cung cấp lựa chọn này.
- [x] Không áp dụng quy tắc `WEEKLY`; frontend không cung cấp lựa chọn này.
- [x] Giữ thuật toán streak theo ngày cho frequency duy nhất `DAILY`.
- [x] Giữ thống kê missed habits theo các daily habit log có `done: false`.
- [x] Bổ sung integration test cho contract `DAILY` và trường hợp frequency không được hỗ trợ.

Nếu sản phẩm hiện chỉ hỗ trợ habit hằng ngày, backend và OpenAPI nên chỉ chấp nhận `DAILY`; frontend sẽ bỏ hai lựa chọn còn lại.

### 2. Làm rõ phạm vi thống kê mood

Endpoint hiện tại chỉ chấp nhận:

```http
GET /stats/mood-trend?period=week
```

Frontend vì vậy chỉ hiển thị thống kê “This week”. Nếu sản phẩm muốn có bộ chọn 4 tuần, 12 tuần hoặc 6 tháng, backend phải hỗ trợ trước.

- [x] Chỉ hỗ trợ period `week` trong phạm vi hiện tại.
- [x] Khai báo `period` bằng enum chỉ gồm `week` trong OpenAPI.
- [x] Period `week` trả các bucket theo ngày trong tuần hiện tại.
- [x] Response được sắp xếp tăng dần theo ngày.
- [x] Tuần bắt đầu vào thứ Hai theo múi giờ `Asia/Ho_Chi_Minh`.
- [x] Period không hợp lệ trả `INVALID_REQUEST` với danh sách giá trị được hỗ trợ.
- [x] Bổ sung integration coverage cho `week` và period không được hỗ trợ.

## P1 — Nên làm để frontend ổn định và hiệu quả hơn

### 3. Bổ sung dashboard summary endpoint

Dashboard hiện phải gọi nhiều endpoint:

- `GET /entries`
- `GET /habits`
- `GET /stats/mood-trend`
- `GET /habits/{habitId}/streak` cho từng habit

Việc gọi streak theo từng habit tạo mô hình N+1 request và sẽ chậm khi số habit tăng.

- [x] Thêm `GET /dashboard` cho authenticated user.
- [x] Trả về today entry, active habits, completion ratio, weekly mood summary và streak lớn nhất trong một response.
- [x] Chọn summary endpoint thay cho batch streak; backend đọc lịch sử entry một lần để tính streak lớn nhất.
- [x] Dashboard là dữ liệu user-specific thay đổi sau check-in nên response dùng `Cache-Control: no-store`.
- [x] Thêm integration test xác nhận dữ liệu summary thuộc đúng authenticated user.

### 4. Hoàn thiện vòng đời habit

OpenAPI hiện chỉ có list active habits và create habit. Giao diện tương lai chưa thể đổi tên, thay icon, archive hoặc khôi phục habit.

- [x] Thêm endpoint cập nhật habit.
- [x] Thêm endpoint archive/deactivate thay vì hard delete.
- [x] Historical entries giữ nguyên habit log sau khi habit bị archive.
- [x] `GET /habits` hỗ trợ filter `active`, `archived` và `all`.
- [x] Habit dùng optimistic locking; client gửi `version`, conflict trả HTTP 409.

### 5. Bổ sung pagination cho dữ liệu có thể tăng vô hạn

Các endpoint entries và search hiện trả về toàn bộ kết quả trong phạm vi truy vấn.

- [x] Bổ sung pagination cho `GET /entries`.
- [x] Bổ sung pagination cho `GET /entries/search`.
- [x] Dùng `page` 0-based và `size` nhất quán giữa hai endpoint.
- [x] Trả `totalElements`, `totalPages` và `hasNext`.
- [x] Đặt giới hạn `size` tối đa là 100 ở backend.
- [x] Khai báo đầy đủ pagination trong OpenAPI.

### 6. Siết validation và mô tả avatar upload

Frontend hiện kiểm tra JPG, PNG, WebP và tối đa 5 MB, nhưng các giới hạn này chưa được biểu diễn đầy đủ trong schema OpenAPI.

- [x] Khai báo danh sách MIME type được hỗ trợ trong OpenAPI.
- [x] Khai báo kích thước file tối đa 5 MiB trong schema.
- [x] Trả error code riêng cho sai content type, quá dung lượng và upload không tồn tại.
- [x] Upload signature hết hạn sau 1 giờ và response trả `expiresAt`.
- [x] Sau khi confirm avatar mới, backend lưu profile trước rồi xóa Cloudinary asset cũ.
- [x] Thêm `DELETE /me/avatar` để xóa avatar và khôi phục mặc định.
- [x] Bổ sung test cho signature hết hạn và confirm sai `publicId`.

### 7. Chuẩn hóa search highlights

`EntrySearchResult.highlights` hiện là map từ tên field tới mảng string. Contract chưa nói chuỗi là plain text hay có HTML highlight.

- [x] Highlight được trả dưới dạng plain text, không phải markup.
- [x] Trả plain text kèm ranges 0-based, end-exclusive để tránh rủi ro XSS.
- [x] Không trả markup từ API.
- [x] Chỉ các field `mood.note`, `habits.note`, `mood.tags` xuất hiện trong `highlights`.
- [x] `q` sau trim phải khác rỗng và tối đa 200 ký tự.
- [x] Kết quả sort ổn định theo `_score` giảm dần rồi `date` giảm dần.

### 8. Bổ sung endpoint đọc entry hôm nay

Frontend hiện lấy entry hôm nay bằng cách gọi `GET /entries` với `from` và `to` cùng một ngày.

- [x] Thêm `GET /entries/today` để contract thể hiện đúng use case.
- [x] Trả `{ date, checkedIn: false, entry: null }` khi chưa check-in.
- [x] PUT/PATCH hôm nay trả về toàn bộ DailyEntry mới nhất.

## P2 — Cải thiện chất lượng contract và vận hành

### 9. Hoàn thiện required fields trong response schemas

Phần lớn thuộc tính response hiện đều optional trong OpenAPI, khiến TypeScript SDK sinh ra nhiều trường có dấu `?` dù backend thực tế luôn trả chúng.

- [x] Đánh dấu required cho các field backend luôn đảm bảo, ví dụ ID, date và các trường chính của response.
- [x] Khai báo nullable riêng biệt nếu một field có thể là `null`.
- [x] Thêm example cho success, empty và error response.
- [x] Đảm bảo mọi endpoint dùng thống nhất envelope `success/data/error/timestamp`.

### 10. Chuẩn hóa error codes

- [x] Xây dựng danh sách error code ổn định cho validation, auth, not found, conflict và upload.
- [x] Đảm bảo validation error luôn trả `field` trùng tên field trong request.
- [x] Phân biệt lỗi nghiệp vụ với lỗi hệ thống.
- [x] Không trả chi tiết exception hoặc dữ liệu nhạy cảm cho client/log.
- [x] Ghi các error code quan trọng vào OpenAPI examples.

### 11. Quy định ngày, tuần và múi giờ

Daily entry, streak và statistics phụ thuộc mạnh vào khái niệm “hôm nay”.

- [x] Dùng timezone hệ thống `Asia/Ho_Chi_Minh` làm nguồn sự thật.
- [x] Chưa lưu timezone trong profile vì sản phẩm hiện không hỗ trợ nhiều khu vực.
- [x] Quy định tuần bắt đầu vào thứ Hai.
- [x] Kiểm thử thời điểm chuyển ngày và xác nhận không có DST transition tương lai.
- [x] Ghi quy ước ngày/timezone trong API documentation.

### 12. Performance và observability

- [x] Dùng unique compound index `userId + date` cho daily entries.
- [x] Elasticsearch mapping có keyword filter cho `userId`, date và text fields phục vụ full-text search.
- [x] Bổ sung compound index cho `userId + habits.done + habits.habitId`; mood trend dùng prefix `userId + date`.
- [x] Cloudinary có connect timeout 2 giây và request timeout 5 giây, cấu hình được bằng environment.
- [x] Gắn `X-Request-ID` vào MDC, response header và error response.
- [x] Theo dõi latency/error rate qua `http.server.requests` và bật percentile histogram.
- [x] Không log access token, Authorization header, nội dung mood note hoặc raw exception message.

## Đề xuất thứ tự triển khai

> Trạng thái rà soát: đã triển khai đủ cả 7 nhóm. Trình tự thực tế giữ đúng các
> phụ thuộc nghiệp vụ P0 → P1 → P2; riêng việc hoàn thiện toàn bộ `required`
> response schema được thực hiện ở P2.9 sau các endpoint P1 để OpenAPI được
> chuẩn hóa một lần trên contract cuối cùng. Đây là điều chỉnh thứ tự hợp lý,
> không làm thiếu hạng mục nào.

1. Chốt nghiệp vụ `targetFrequency`.
2. Chốt phạm vi period cho statistics.
3. Chuẩn hóa OpenAPI enum, required fields và validation.
4. Xử lý dashboard N+1 bằng summary hoặc batch streak.
5. Thêm pagination cho entries/search.
6. Hoàn thiện lifecycle habit và avatar.
7. Chuẩn hóa timezone, performance và observability.

Sau mỗi thay đổi contract:

```bash
npm run generate:api
npm run lint
npm run build
```

Frontend không nên tự thêm lựa chọn hoặc hành vi chưa được contract/backend hỗ trợ.

## Ghi chú về cảnh báo bundle frontend

Cảnh báo bundle khoảng 545 kB không yêu cầu thay đổi backend và đã được xử lý
trong frontend cùng mục 9.1 của `FRONTEND_COMPLETION_CHECKLIST.md`:

```tsx
import { lazy, Suspense } from 'react'

const StatsPage = lazy(() =>
  import('./features/stats/pages/StatsPage.tsx').then((module) => ({
    default: module.StatsPage,
  })),
)
```

Route tree đã được bọc bằng `Suspense` với loading fallback accessible; các page
public/protected đều được tách khỏi initial chunk, AppShell vẫn nằm trong initial
chunk và vendor được chia theo React, React Router và Auth0. Production build
đọc Vite manifest để đo raw/gzip/brotli và fail nếu vượt performance budget,
thay vì tăng `chunkSizeWarningLimit` để che cảnh báo.
