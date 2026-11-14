# Auth0 và CORS: một origin FE workstation

Local/test, Vite/Docker đều dùng **http://127.0.0.1:5173**. Chỉ chạy một FE tại một
thời điểm. BE API vẫn theo SERVER_PORT hiện tại (thường 8080); 8081 là docs profile,
không phải test API mặc định.

## Auth0 Dashboard

1. Vào tenant non-production > Applications > Applications > chọn SPA đúng
   VITE_AUTH0_CLIENT_ID > Settings > Application URIs.
2. Thêm `http://127.0.0.1:5173` vào cả ba danh sách:
   - Allowed Callback URLs
   - Allowed Logout URLs
   - Allowed Web Origins
3. Giữ lại production/preview origins hợp lệ; không ghi đè cả danh sách. Save Changes.
4. Nếu còn sử dụng localhost, thêm `http://localhost:5173` vào cả ba danh sách.
   localhost và 127.0.0.1 là hai origins khác nhau; ưu tiên 127.0.0.1 theo runner.
5. Không cần thêm 4173/5174 cho cấu hình mới. Chỉ xóa origins cũ sau khi chắc chắn
   không còn công cụ/deployment phụ thuộc chúng.

FE dùng window.location.origin cho redirect_uri và logout returnTo, nên không tự
thêm /callback hay /dashboard. Không đổi audience, không tạo/thêm client secret vào
SPA vì đổi port FE. Thay đổi Dashboard do chủ tài khoản thực hiện; repo không tự lưu.

## Backend CORS

APP_CORS_ALLOWED_ORIGINS của BE cần có `http://127.0.0.1:5173`; nếu dùng localhost thì
thêm origin đó nữa, đồng thời giữ các domain hợp lệ khác. Restart BE sau khi đổi.
Auth0 allowlist và API CORS là hai cấu hình riêng.

## Kiểm tra

Chạy make local-run để thử login/logout. Dừng FE đó trước khi chạy make test-run hoặc
make test-container-up, vẫn mở origin 5173. Authenticated E2E dùng tài khoản synthetic
và reset token trong .env.local; tham khảo FRONTEND_INTEGRATION_TESTING.md.
Production dùng Vercel config riêng, không đọc .env.local.

Tài liệu chính thức: https://auth0.github.io/auth0-react/
