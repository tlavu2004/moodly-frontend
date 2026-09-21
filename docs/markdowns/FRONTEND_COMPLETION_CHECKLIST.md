# Moodly Frontend Completion Checklist

## Mục đích

Tài liệu này là danh sách đầy đủ những phần frontend còn thiếu sau khi hoàn thành các route sản phẩm chính. Checklist được xây dựng từ trạng thái thực tế của repository, không phải danh sách yêu cầu chung cho mọi dự án React.

Các route chức năng đã hoàn thành:

- `/`: public landing page.
- `/dashboard`: tổng quan từ dữ liệu thật.
- `/habits`: danh sách và tạo habit.
- `/today`: mood và habit check-in trong ngày.
- `/entries`: lịch sử theo khoảng ngày.
- `/stats`: thống kê tuần.
- `/profile`: profile và avatar upload.
- `/search`: tìm kiếm với query/date filters.
- `*`: trang 404.

Vì vậy có thể đánh dấu bước “Dashboard, habits, daily entry/mood, stats, avatar, search” là `DONE` về phạm vi tính năng. Các mục dưới đây là phần còn thiếu để frontend đạt mức production-ready.

## 7. Integration và E2E testing

### 7.1. Chuẩn bị môi trường kiểm thử tích hợp

- [ ] Tạo cấu hình frontend dành riêng cho test/integration environment.
- [ ] Tạo Auth0 application hoặc tenant phù hợp cho automated testing.
- [ ] Khai báo callback URL, logout URL và web origin cho môi trường test.
- [ ] Chuẩn bị tài khoản test không dùng dữ liệu người thật.
- [ ] Chuẩn bị cơ chế seed/reset dữ liệu backend có thể chạy lặp lại.
- [ ] Không commit secret, test password hoặc access token vào repository.
- [ ] Viết hướng dẫn khởi động frontend, backend và dependency phục vụ E2E.

### 7.2. Thiết lập Playwright

- [ ] Cài `@playwright/test` và browser runtime cần thiết.
- [ ] Tạo `playwright.config.ts` với base URL, timeout và trace phù hợp.
- [ ] Thêm script `test:e2e`.
- [ ] Thêm script `test:e2e:ui` để debug local.
- [ ] Cấu hình screenshot, video và trace chỉ giữ khi test thất bại hoặc retry.
- [ ] Tái sử dụng authenticated storage state thay vì đăng nhập UI trong mọi test.
- [ ] Tách test public routes và protected routes.

### 7.3. E2E smoke tests bắt buộc

- [ ] Người chưa đăng nhập mở `/` được và không bị redirect.
- [ ] Người chưa đăng nhập mở protected URL sẽ được đưa vào Auth0 flow.
- [ ] Sau đăng nhập, người dùng quay lại đúng URL ban đầu.
- [ ] Profile backend được synchronize trước khi protected page gọi API nghiệp vụ.
- [ ] Tạo habit mới và thấy habit xuất hiện trong danh sách.
- [ ] Ghi mood hôm nay và thấy dữ liệu cập nhật trên dashboard.
- [ ] Đánh dấu habit hoàn thành và thấy completion ratio cập nhật.
- [ ] Mở history với khoảng ngày và thấy entry vừa tạo.
- [ ] Stats hiển thị dữ liệu tuần mà không gửi period không được hỗ trợ.
- [ ] Upload avatar hợp lệ và thấy avatar sau khi reload.
- [ ] Từ chối avatar sai định dạng hoặc quá dung lượng.
- [ ] Search theo từ khóa và ngày cập nhật query string chính xác.
- [ ] Logout quay về public landing page.
- [ ] URL không tồn tại hiển thị trang 404 có đường quay lại hợp lệ.

### 7.4. E2E failure paths

- [ ] Kiểm tra UI khi backend trả `400` validation error.
- [ ] Kiểm tra UI khi token hết hạn hoặc backend trả `401`.
- [ ] Kiểm tra UI khi backend trả `403`.
- [ ] Kiểm tra UI khi API trả `500`.
- [ ] Kiểm tra UI khi mạng timeout hoặc mất kết nối.
- [ ] Kiểm tra retry không tạo mutation trùng lặp.
- [ ] Kiểm tra upload Cloudinary thành công nhưng confirm backend thất bại.
- [ ] Kiểm tra empty state cho habits, entries, stats và search.

## 8. Frontend automated tests

### 8.1. Test foundation

Repository hiện chưa có test runner hoặc test dependencies.

- [ ] Cài Vitest.
- [ ] Cài React Testing Library.
- [ ] Cài `@testing-library/jest-dom`.
- [ ] Cài `@testing-library/user-event`.
- [ ] Cài `jsdom`.
- [ ] Cài MSW để mock network ở transport boundary.
- [ ] Tạo `vitest.config.ts` hoặc cấu hình test trong Vite.
- [ ] Tạo test setup file và đăng ký jest-dom matchers.
- [ ] Thêm script `test` cho watch mode.
- [ ] Thêm script `test:run` cho CI.
- [ ] Thêm script `test:coverage`.
- [ ] Bỏ qua generated OpenAPI code khỏi coverage.
- [ ] Đặt coverage threshold ban đầu cho code handwritten; tăng dần thay vì ép 100% ngay.

### 8.2. API và error tests

- [ ] Test `normalizeApiError` với backend error envelope.
- [ ] Test `normalizeApiError` với network error.
- [ ] Test status, code, timestamp và field errors được giữ đúng.
- [ ] Test API client thêm Bearer token nhưng không log token.
- [ ] Test API base URL được chuẩn hóa khi có dấu `/` cuối.
- [ ] Test hành vi rõ ràng khi thiếu `VITE_API_BASE_URL`.
- [ ] Test feature adapters unwrap `success/data/error/timestamp` đúng cách.
- [ ] Test response thiếu `data` không làm UI crash.

### 8.3. Authentication và routing tests

- [ ] Test public landing không yêu cầu authentication.
- [ ] Test protected routes được bọc bởi Auth0 guard.
- [ ] Test loading state trong Auth bootstrap.
- [ ] Test Auth0 initialization error.
- [ ] Test profile synchronization loading/error/success.
- [ ] Test protected children chỉ render sau khi profile sync hoàn tất.
- [ ] Test logout dùng `returnTo: window.location.origin`.
- [ ] Test intentional 404 route.

### 8.4. Dashboard tests

- [ ] Test adapter tổng hợp entries, habits, mood trend và streaks.
- [ ] Test dashboard loading/error/success.
- [ ] Test trạng thái chưa có habit.
- [ ] Test trạng thái chưa check-in mood.
- [ ] Test completion percentage với 0, một phần và 100%.
- [ ] Test best streak và weekly mood summary.
- [ ] Test retry sau lỗi.

### 8.5. Habits tests

- [ ] Test danh sách loading/error/empty/success.
- [ ] Test validation tên habit rỗng.
- [ ] Test form gửi đúng name, icon và target frequency.
- [ ] Test create success thêm habit vào danh sách.
- [ ] Test create validation error hiển thị cho người dùng.
- [ ] Test streak loading và mapping theo habit ID.
- [ ] Test lỗi một streak không làm mất toàn bộ danh sách nếu thiết kế được đổi sang partial success.

### 8.6. Daily entry và history tests

- [ ] Test date key local không lệch ngày do UTC.
- [ ] Test initial mood, tags và note được hydrate từ entry hôm nay.
- [ ] Test chỉ chấp nhận mood score từ 1 đến 5.
- [ ] Test chọn/bỏ mood tags.
- [ ] Test save mood success và failure.
- [ ] Test toggle habit success và failure.
- [ ] Test khóa mutation lặp trong lúc đang lưu.
- [ ] Test lịch sử dùng `from/to` từ URL.
- [ ] Test không cho chọn ngày tương lai hoặc khoảng ngày đảo ngược.
- [ ] Test entry chỉ có habit log nhưng chưa có mood.

### 8.7. Stats tests

- [ ] Test frontend luôn gửi `period=week` theo contract hiện tại.
- [ ] Test average mood và entry count.
- [ ] Test most-missed habit mapping từ ID sang tên.
- [ ] Test chart với 0, 1 và nhiều data points.
- [ ] Test empty state khi chưa có dữ liệu.
- [ ] Test unknown habit ID có fallback an toàn.

### 8.8. Profile/avatar tests

- [ ] Test fallback avatar từ Auth0 picture và initials.
- [ ] Test chỉ chấp nhận JPEG, PNG và WebP.
- [ ] Test giới hạn file 5 MB.
- [ ] Test upload signature payload.
- [ ] Test Cloudinary multipart payload không chứa trường thừa.
- [ ] Test lấy `version` từ Cloudinary response an toàn.
- [ ] Test confirm avatar success/failure.
- [ ] Test metadata content type và size.

### 8.9. Search tests

- [ ] Test submit cập nhật `?q=`.
- [ ] Test date filters cập nhật `from/to`.
- [ ] Test clear date filters.
- [ ] Test không gọi API khi query rỗng.
- [ ] Test không gọi API khi khoảng ngày đảo ngược.
- [ ] Test stale response không ghi đè query mới hơn.
- [ ] Test highlights được render dưới dạng text an toàn.
- [ ] Test link từ search result tới đúng ngày trong history.

## 9. Performance, accessibility và production readiness

### 9.1. Route-based code splitting

Production build hiện cảnh báo initial bundle khoảng 545 kB.

- [x] Chuyển các page component sang dynamic import bằng `React.lazy`.
- [x] Bọc lazy routes trong `Suspense` với fallback có `aria-busy` và `aria-live`.
- [x] Giữ AppShell trong initial chunk để navigation ổn định.
- [x] Tách Landing khỏi protected application chunk sau khi kiểm tra Vite manifest.
- [x] Tách Auth0, React Router và React thành các vendor chunk duy nhất; generated SDK không bị duplicate.
- [x] Đo raw/gzip/brotli bằng Vite manifest sau mỗi production build.
- [x] Đặt performance budget cho initial JavaScript, CSS và kích thước chunk lớn nhất.
- [x] Không tăng `chunkSizeWarningLimit` để che cảnh báo.

Ví dụ lazy-load một named export:

```tsx
import { lazy } from 'react'

const StatsPage = lazy(() =>
  import('./features/stats/pages/StatsPage.tsx').then((module) => ({
    default: module.StatsPage,
  })),
)
```

### 9.2. Runtime performance

- [ ] Dùng bundle analyzer để xác định dependency/chunk lớn nhất.
- [ ] Tránh N+1 streak requests khi backend có summary hoặc batch endpoint.
- [ ] Thêm request cancellation bằng `AbortSignal` cho search và date-filtered queries.
- [ ] Đảm bảo response cũ không ghi đè response mới khi filter đổi nhanh.
- [ ] Cân nhắc query cache sau khi có nhu cầu thật; không thêm state library chỉ để tối ưu sớm.
- [ ] Đo Core Web Vitals trên production build.
- [ ] Kiểm tra layout shift khi avatar và dữ liệu tải xong.
- [ ] Xóa assets mẫu Vite/React không còn sử dụng.

### 9.3. Error resilience

- [ ] Thêm application-level Error Boundary.
- [ ] Tạo fallback cho lỗi lazy chunk/load deployment mismatch.
- [ ] Cung cấp retry hoặc reload action phù hợp trong error fallback.
- [ ] Phân biệt thông báo validation, authentication, network và server error.
- [ ] Đảm bảo mutation message không bị loading request khác ghi đè.
- [ ] Xử lý partial failure khi một trong nhiều dashboard requests thất bại.
- [ ] Xử lý partial failure khi một streak request thất bại.
- [ ] Không hiển thị raw internal backend message nếu chứa chi tiết kỹ thuật.

### 9.4. Accessibility

- [ ] Chạy axe hoặc tương đương trên mọi route.
- [ ] Kiểm tra toàn bộ ứng dụng chỉ bằng bàn phím.
- [ ] Kiểm tra focus order trên desktop và mobile navigation.
- [ ] Di chuyển focus hợp lý khi mở/đóng form tạo habit.
- [ ] Thông báo mutation success/error bằng live region không gây lặp.
- [ ] Bổ sung accessible name cho mọi loading skeleton.
- [ ] Không dùng màu sắc làm tín hiệu duy nhất cho mood, success hoặc error.
- [ ] Kiểm tra contrast ở trạng thái normal, hover, focus và disabled.
- [ ] Cung cấp text/table equivalent cho biểu đồ Stats.
- [ ] Tôn trọng `prefers-reduced-motion` cho pulse, spinner và transitions.
- [ ] Kiểm tra zoom 200% và reflow ở chiều rộng 320 px.
- [ ] Kiểm tra screen reader với form labels, validation và navigation landmarks.

### 9.5. Responsive và browser QA

- [ ] Kiểm tra Chrome, Edge, Firefox và Safari phiên bản được hỗ trợ.
- [ ] Kiểm tra iOS Safari và Android Chrome.
- [ ] Kiểm tra mobile navigation với safe-area inset.
- [ ] Kiểm tra màn hình 320 px, tablet, laptop và desktop rộng.
- [ ] Kiểm tra text dài, email dài, habit name dài và localized date dài.
- [ ] Kiểm tra virtual keyboard không che form hoặc nút submit.
- [ ] Kiểm tra loading, empty, error và success ở mọi breakpoint.
- [ ] Kiểm tra dark mode chỉ khi sản phẩm quyết định hỗ trợ; hiện chưa nên tự thêm.

### 9.6. Security và privacy

- [ ] Xác nhận không log access token, Authorization header hoặc sensitive response.
- [ ] Không lưu access token vào localStorage/sessionStorage bằng code handwritten.
- [ ] Giữ search highlights dưới dạng text hoặc sanitize theo contract rõ ràng.
- [ ] Validate URL/avatar source theo policy đã thống nhất.
- [ ] Thêm Content Security Policy phù hợp với Auth0 và Cloudinary.
- [ ] Thêm `Referrer-Policy`, `X-Content-Type-Options` và các security headers tại hosting layer.
- [ ] Chạy dependency audit trong CI.
- [ ] Thiết lập dependency update automation.
- [ ] Xác nhận source map production không công khai ngoài ý muốn.
- [ ] Rà soát nội dung mood note vì đây có thể là dữ liệu sức khỏe/tâm lý nhạy cảm.

### 9.7. Environment và deployment

- [ ] Validate tất cả biến `VITE_*` khi ứng dụng khởi động hoặc build.
- [ ] Tách `.env` cho development, test, staging và production.
- [ ] Không đưa server-side secret vào biến `VITE_*`.
- [ ] Cấu hình SPA fallback/rewrite cho mọi client route.
- [ ] Cấu hình Auth0 callback/logout/web origins cho production domain.
- [ ] Cấu hình API CORS đúng production origin.
- [ ] Xác nhận HTTPS bắt buộc ở production.
- [ ] Thêm cache policy cho hashed assets và không cache cứng `index.html`.
- [ ] Tạo smoke check sau deploy.
- [ ] Viết rollback procedure cho frontend release.

### 9.8. Monitoring và diagnostics

- [ ] Chọn error monitoring phù hợp và xin phê duyệt trước khi thêm SDK mới.
- [ ] Không gửi mood note, token hoặc PII vào monitoring events.
- [ ] Gắn release/version vào error reports.
- [ ] Theo dõi failed API requests theo endpoint và status, không kèm sensitive body.
- [ ] Theo dõi Web Vitals ở production nếu có nhu cầu sản phẩm.
- [ ] Có cách phân biệt lỗi frontend, Auth0, backend và Cloudinary.

### 9.9. CI quality gates

- [ ] Chạy lint trên pull request.
- [ ] Chạy TypeScript/build trên pull request.
- [ ] Chạy unit/component tests trên pull request.
- [ ] Chạy coverage threshold trên pull request.
- [ ] Chạy API generation check và fail nếu generated output bị lệch.
- [ ] Chạy dependency audit theo policy đã thống nhất.
- [ ] Chạy E2E smoke suite trên staging hoặc môi trường preview.
- [ ] Lưu Playwright artifacts khi thất bại.
- [ ] Chặn merge khi quality gate bắt buộc thất bại.

### 9.10. Documentation và repository hygiene

- [ ] Cập nhật README với setup, environment variables và các lệnh thường dùng.
- [ ] Ghi rõ cách regenerate OpenAPI client.
- [ ] Ghi rõ generated files không được sửa tay.
- [ ] Ghi rõ cách chạy unit, integration và E2E tests.
- [ ] Ghi rõ Auth0 local/staging setup.
- [ ] Xóa nội dung TODO đã hoàn thành khỏi README.
- [ ] Xóa `src/assets/react.svg`, `src/assets/vite.svg` và asset không dùng khác.
- [ ] Quyết định convention cho line endings để generator không làm working tree hiện modified giả.
- [ ] Cân nhắc alias import `@/` khi đường dẫn tương đối bắt đầu cản trở bảo trì.

## 10. Các quyết định đang phụ thuộc backend/product

- [x] Chốt `targetFrequency`: chỉ hỗ trợ `DAILY`.
- [x] Không triển khai nhiều frequency; streak/missed giữ semantics theo ngày.
- [x] Stats hiện chỉ hỗ trợ `period=week`.
- [x] Timezone nguồn sự thật là `Asia/Ho_Chi_Minh`, tuần bắt đầu thứ Hai.
- [x] Search highlight là plain text kèm ranges 0-based, end-exclusive.
- [x] Entries và search dùng pagination `page` 0-based, `size` tối đa 100.
- [x] Dashboard summary endpoint đã thay thế N+1 streak requests.
- [x] Backend lưu avatar mới trước khi xóa Cloudinary asset cũ và hỗ trợ xóa avatar.

Chi tiết backend nằm tại [`BACKEND_IMPROVEMENT_CHECKLIST.md`](./BACKEND_IMPROVEMENT_CHECKLIST.md).

## Thứ tự triển khai đề xuất

1. Chốt các quyết định backend/product ở mục 10.
2. Thiết lập Vitest, Testing Library và MSW.
3. Viết API/auth tests và các mutation tests quan trọng.
4. Viết component/integration tests cho từng feature.
5. Thiết lập Playwright và E2E smoke flows.
6. Thêm Error Boundary, cancellation và stale-response protection.
7. Lazy-load routes và đặt performance budget.
8. Thực hiện accessibility/responsive/browser QA.
9. Hoàn thiện environment, security headers, monitoring và deployment.
10. Đưa toàn bộ quality gates vào CI.

## Definition of Done cho frontend production-ready

- [ ] Tất cả chức năng chính hoạt động với backend/Auth0 thật trên staging.
- [ ] Không còn lỗi P0/P1 đã biết trong critical flows.
- [ ] Lint, typecheck, build, unit/component tests và E2E smoke tests đều đạt.
- [ ] Generated API client khớp OpenAPI source of truth.
- [ ] Initial bundle nằm trong performance budget đã thống nhất.
- [ ] Không có accessibility violation nghiêm trọng hoặc critical.
- [ ] Security/privacy review hoàn tất.
- [ ] Production environment, SPA routing, Auth0 và CORS được xác nhận.
- [ ] Error monitoring và rollback procedure sẵn sàng.
- [ ] README và runbook đủ để một thành viên mới chạy dự án.
