# Moodly Backend Improvement Checklist

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

- [ ] Quyết định tập giá trị frequency chính thức.
- [ ] Chuyển frequency thành enum ở backend.
- [ ] Xuất enum trong OpenAPI để SDK sinh union type chính xác.
- [ ] Từ chối giá trị không hợp lệ bằng validation error có field `targetFrequency`.
- [ ] Quy định rõ `WEEKDAYS` xử lý thứ Bảy, Chủ nhật và múi giờ như thế nào.
- [ ] Quy định rõ `WEEKLY` hoàn thành một lần trong tuần hay vào một ngày cố định.
- [ ] Cập nhật thuật toán streak theo frequency.
- [ ] Cập nhật thống kê missed habits theo frequency.
- [ ] Bổ sung integration test cho từng loại frequency.

Nếu sản phẩm hiện chỉ hỗ trợ habit hằng ngày, backend và OpenAPI nên chỉ chấp nhận `DAILY`; frontend sẽ bỏ hai lựa chọn còn lại.

### 2. Làm rõ phạm vi thống kê mood

Endpoint hiện tại chỉ chấp nhận:

```http
GET /stats/mood-trend?period=week
```

Frontend vì vậy chỉ hiển thị thống kê “This week”. Nếu sản phẩm muốn có bộ chọn 4 tuần, 12 tuần hoặc 6 tháng, backend phải hỗ trợ trước.

- [ ] Quyết định các period được hỗ trợ, ví dụ `week`, `month`, `quarter`, `year`.
- [ ] Khai báo period bằng enum trong OpenAPI thay vì `string` tự do.
- [ ] Xác định đơn vị bucket cho từng period: ngày, tuần hoặc tháng.
- [ ] Đảm bảo response được sắp xếp tăng dần theo thời gian.
- [ ] Ghi rõ múi giờ dùng để xác định đầu tuần.
- [ ] Thêm validation error rõ ràng cho period không hợp lệ.
- [ ] Bổ sung integration test cho từng period.

## P1 — Nên làm để frontend ổn định và hiệu quả hơn

### 3. Bổ sung dashboard summary endpoint

Dashboard hiện phải gọi nhiều endpoint:

- `GET /entries`
- `GET /habits`
- `GET /stats/mood-trend`
- `GET /habits/{habitId}/streak` cho từng habit

Việc gọi streak theo từng habit tạo mô hình N+1 request và sẽ chậm khi số habit tăng.

- [ ] Cân nhắc thêm `GET /dashboard` hoặc `GET /me/summary`.
- [ ] Trả về today entry, active habits, completion ratio, weekly mood summary và streak lớn nhất trong một response.
- [ ] Hoặc bổ sung endpoint batch streak nhận/trả nhiều habit ID.
- [ ] Ghi rõ dữ liệu nào có thể cache và thời gian cache phù hợp.
- [ ] Thêm integration test xác nhận dữ liệu summary thuộc đúng authenticated user.

### 4. Hoàn thiện vòng đời habit

OpenAPI hiện chỉ có list active habits và create habit. Giao diện tương lai chưa thể đổi tên, thay icon, archive hoặc khôi phục habit.

- [ ] Thêm endpoint cập nhật habit.
- [ ] Thêm endpoint archive/deactivate thay vì hard delete.
- [ ] Xác định hành vi của historical entries sau khi habit bị archive.
- [ ] Cân nhắc endpoint lấy cả active và archived habits với filter trạng thái.
- [ ] Bổ sung optimistic-locking hoặc quy tắc xử lý concurrent update nếu cần.

### 5. Bổ sung pagination cho dữ liệu có thể tăng vô hạn

Các endpoint entries và search hiện trả về toàn bộ kết quả trong phạm vi truy vấn.

- [ ] Bổ sung pagination cho `GET /entries`.
- [ ] Bổ sung pagination cho `GET /entries/search`.
- [ ] Quy định `page/size` hoặc cursor nhất quán giữa các endpoint.
- [ ] Trả metadata như `hasNext`, `nextCursor` hoặc `totalElements` nếu sản phẩm cần.
- [ ] Đặt giới hạn `size` tối đa ở backend.
- [ ] Khai báo đầy đủ pagination trong OpenAPI.

### 6. Siết validation và mô tả avatar upload

Frontend hiện kiểm tra JPG, PNG, WebP và tối đa 5 MB, nhưng các giới hạn này chưa được biểu diễn đầy đủ trong schema OpenAPI.

- [ ] Khai báo danh sách MIME type được hỗ trợ trong OpenAPI.
- [ ] Khai báo kích thước file tối đa trong description hoặc schema extension.
- [ ] Trả error code riêng cho sai content type, quá dung lượng và upload không tồn tại.
- [ ] Xác định thời gian hết hạn của upload signature.
- [ ] Xác định hành vi thay thế/xóa Cloudinary asset cũ sau khi confirm avatar mới.
- [ ] Cân nhắc endpoint xóa avatar hoặc khôi phục avatar mặc định.
- [ ] Bổ sung integration test cho signature hết hạn và confirm sai `publicId`.

### 7. Chuẩn hóa search highlights

`EntrySearchResult.highlights` hiện là map từ tên field tới mảng string. Contract chưa nói chuỗi là plain text hay có HTML highlight.

- [ ] Quy định rõ highlight là plain text hay markup.
- [ ] Ưu tiên trả plain text kèm offsets/ranges để tránh rủi ro XSS.
- [ ] Nếu trả markup, giới hạn tag được phép và ghi rõ trong OpenAPI.
- [ ] Quy định danh sách field có thể xuất hiện trong `highlights`.
- [ ] Bổ sung giới hạn độ dài `q` và hành vi với query chỉ có khoảng trắng.
- [ ] Xác định sorting/relevance ổn định cho kết quả.

### 8. Bổ sung endpoint đọc entry hôm nay

Frontend hiện lấy entry hôm nay bằng cách gọi `GET /entries` với `from` và `to` cùng một ngày.

- [ ] Cân nhắc thêm `GET /entries/today` để contract thể hiện đúng use case.
- [ ] Trả entry rỗng có cấu trúc rõ ràng khi chưa check-in, thay vì buộc client suy luận từ danh sách rỗng.
- [ ] Đảm bảo PUT/PATCH hôm nay trả về toàn bộ DailyEntry mới nhất.

## P2 — Cải thiện chất lượng contract và vận hành

### 9. Hoàn thiện required fields trong response schemas

Phần lớn thuộc tính response hiện đều optional trong OpenAPI, khiến TypeScript SDK sinh ra nhiều trường có dấu `?` dù backend thực tế luôn trả chúng.

- [ ] Đánh dấu required cho các field backend luôn đảm bảo, ví dụ ID, date và các trường chính của response.
- [ ] Khai báo nullable riêng biệt nếu một field có thể là `null`.
- [ ] Thêm example cho success, empty và error response.
- [ ] Đảm bảo mọi endpoint dùng thống nhất envelope `success/data/error/timestamp`.

### 10. Chuẩn hóa error codes

- [ ] Xây dựng danh sách error code ổn định cho validation, auth, not found, conflict và upload.
- [ ] Đảm bảo validation error luôn trả `field` trùng tên field trong request.
- [ ] Phân biệt lỗi nghiệp vụ với lỗi hệ thống.
- [ ] Không trả chi tiết exception hoặc dữ liệu nhạy cảm cho client.
- [ ] Ghi các error code quan trọng vào OpenAPI examples.

### 11. Quy định ngày, tuần và múi giờ

Daily entry, streak và statistics phụ thuộc mạnh vào khái niệm “hôm nay”.

- [ ] Chọn timezone nguồn sự thật: timezone người dùng hoặc timezone hệ thống.
- [ ] Lưu timezone trong profile nếu sản phẩm hỗ trợ nhiều khu vực.
- [ ] Quy định tuần bắt đầu vào thứ Hai hay Chủ nhật.
- [ ] Kiểm thử thời điểm chuyển ngày và daylight saving time.
- [ ] Ghi quy ước ngày/timezone trong API documentation.

### 12. Performance và observability

- [ ] Kiểm tra index cho `userId + date` của daily entries.
- [ ] Kiểm tra index phục vụ full-text search.
- [ ] Kiểm tra aggregation index cho mood trend và missed habits.
- [ ] Thiết lập timeout hợp lý cho Cloudinary và các dependency ngoài.
- [ ] Gắn correlation/request ID vào log và error response nếu phù hợp.
- [ ] Theo dõi latency và error rate của các endpoint dashboard-critical.
- [ ] Không log access token, Authorization header hoặc nội dung nhạy cảm trong mood notes.

## Đề xuất thứ tự triển khai

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

Cảnh báo bundle khoảng 545 kB không yêu cầu thay đổi backend. Cách xử lý phù hợp là lazy-load từng route ở frontend:

```tsx
import { lazy, Suspense } from 'react'

const StatsPage = lazy(() =>
  import('./features/stats/pages/StatsPage.tsx').then((module) => ({
    default: module.StatsPage,
  })),
)
```

Sau đó bọc route tree hoặc từng route bằng `Suspense` với loading fallback. Nên áp dụng cho các protected pages lớn và kiểm tra lại kích thước từng chunk bằng production build. Đây là tối ưu riêng của frontend và có thể thực hiện ở một commit kỹ thuật tiếp theo.
