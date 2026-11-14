# Hướng dẫn chạy Moodly FE và BE

## 1. Chọn cách chạy

Hai repo nằm cùng cấp: `moodly-frontend/` và `moodly-backend/`.
Mỗi lệnh `make` phải chạy tại root của đúng repo. Makefile FE không quản lý BE.

| Mục đích | MongoDB + Elasticsearch | BE | FE |
| --- | --- | --- | --- |
| Sửa code hằng ngày (khuyến nghị) | Docker, BE quản lý | Java trên máy/IDE | Vite trên máy |
| Kiểm tra bản build FE | Docker hoặc dịch vụ sẵn có | Java hoặc container | Container Nginx |
| Kiểm tra cả hai image ứng dụng | Docker hoặc dịch vụ sẵn có | Container Java | Container Nginx |
| Production đã chọn | Dịch vụ database/search theo cấu hình BE | Docker trên Render | Vite/static trên Vercel |

Nginx là web server phục vụ FE đã build, nằm trong image FE. Nó không đóng vai trò
lưu trữ dữ liệu như MongoDB/ES. Docker Compose chỉ ghép các service; image BE không
chứa MongoDB/ES và image FE không chứa BE.

## 2. Chuẩn bị một lần

- Cài Docker Desktop và bật Linux Engine.
- Nếu chạy ứng dụng trên máy: Node/npm theo yêu cầu FE và Java theo yêu cầu BE
  (Dockerfile BE hiện dùng Java 25). Maven Wrapper có trong repo BE.
- GNU Make là tùy chọn cho FE; BE dùng Bash recipes, nên chạy Make của BE trong
  Git Bash/WSL trên Windows. Các ví dụ gán `$env:` phía dưới dành cho PowerShell.
- FE: `npm ci`; tạo `.env.local` từ `.env.local.example`, `.env.test.local` từ
  `.env.test.example` nếu chưa có. Không ghi đè file đã chứa giá trị thật.
- BE: làm theo README BE để chuẩn bị `.env.local`, Auth0, Cloudinary và infrastructure.
- FE local dùng `http://127.0.0.1:5173`; FE test dùng `http://127.0.0.1:4173`.
  Auth0 callback/logout/web origins và BE CORS phải cho phép đúng origin và port.
  `localhost` và `127.0.0.1` là hai origin khác nhau.
- API URL trong FE phải truy cập được từ trình duyệt. Không dùng tên Compose service
  như `backend` cho URL mà trình duyệt gọi.

## 3. Phát triển bình thường: chỉ hạ tầng BE chạy Docker

### Terminal A — repo moodly-backend

```sh
make local-up
make local-status
make local-replica-status
make local-elasticsearch-status
```

Lệnh này bật/giữ MongoDB và ES; không chạy ứng dụng Java. `local-up` còn khởi tạo
replica set và chờ readiness. Sau đó có thể đóng terminal A, container vẫn chạy.
Không dùng `local-container-run` nếu chỉ muốn bật hạ tầng.

### Terminal B — repo moodly-backend

```sh
make local-run
```

BE chạy trên máy ở foreground. Có thể thay bằng Run/Debug trong IDE với cùng cấu
hình local. Không chạy cả IDE và Make trên cùng port BE. Launcher Make bảo đảm
infrastructure sẵn sàng; `local-up` riêng là cách pin infrastructure hoạt động độc lập.

### Terminal C — repo moodly-frontend

```sh
make local-run
```

Mở `http://127.0.0.1:5173`. FE chạy Vite/hot reload, đọc `.env.local`.
Tương đương `npm run dev`. Không cần bật container FE.

### Khi kết thúc

1. `Ctrl+C` ở Vite và ứng dụng BE/launcher, hoặc Stop trong IDE.
2. Có thể giữ MongoDB/ES chạy cho lần làm việc tiếp theo.
3. Nếu muốn dừng infrastructure, tại BE chạy `make local-stop` sau khi dừng các
   phiên ứng dụng/test. BE từ chối stop khi còn phiên được quản lý đang dùng stack.

## 4. Kiểm tra FE bằng Docker/Nginx

Bật BE theo cách ở mục 3 hoặc mục 5 trước nếu cần đăng nhập/dữ liệu thật.
Tại repo FE, chọn đúng một chế độ:

```sh
# Cấu hình .env.local, port host 5173 theo Makefile hiện tại
make local-container-up

# Hoặc cấu hình .env.test.local, port host 4173
make test-container-up
```

Các lệnh build image, chạy detached và chờ healthy. Terminal sẽ trả quyền điều khiển.
Đây là static build, không có hot reload. Sửa code/env rồi chạy lại lệnh up để rebuild.
Dừng Vite mà bạn đang chạy trước khi dùng container cùng port.

```sh
make local-container-status
make local-container-logs
make local-container-stop
```

`Ctrl+C` khi xem logs chỉ kết thúc xem log; không dừng container. `stop` giữ container
và network. Tên lifecycle `local-container-*` chỉ stack Docker workstation của FE;
nó không bật/tắt MongoDB/ES. Khi không chỉ định, các lệnh dùng env test mặc định.
Nếu cần validate cấu hình local: `make validate-local MOODLY_ENV=local`.

## 5. Chạy ứng dụng BE bằng Docker

Tại repo BE, chọn một chế độ:

```sh
make local-container-build
make local-container-run

# Hoặc dùng namespace test do launcher BE quản lý
make test-container-run
```

Khác FE `*-container-up`, BE `*-container-run` là foreground owner: launcher quản lý
phiên, infrastructure và vòng đời test. Dùng `Ctrl+C` để kết thúc bình thường.
Không chạy đồng thời BE Java trên máy và BE container cùng port (thường 8080).
`local-container-stop` dành cho phục hồi/dừng container BE bị bỏ lại; xem README BE.

Namespace test của BE là dữ liệu có thể reset. Không chọn test chỉ để xem dữ liệu local.
Không dùng lệnh Docker trực tiếp để vượt cơ chế ownership/lease của BE đang hoạt động.

## 6. Kiểm tra chất lượng và E2E

Tại FE:

```sh
make verify
```

Chạy kiểm tra cấu hình/an toàn, lint, tests/coverage và build; không cần BE thật.
Tại BE, `make verify` có các integration test sử dụng infrastructure do BE quản lý;
không chạy cùng một manual test session đang giữ độc quyền namespace test.

Với cấu hình E2E hiện đang được chuẩn hóa trong working tree:

```powershell
# FE: public routes, để Playwright tự khởi động Vite test trên port trống 4173
$env:E2E_TARGET = 'dev'
npx playwright test --project=public
Remove-Item Env:E2E_TARGET

# FE: kiểm thử trên Nginx đã chạy bằng make test-container-up
$env:E2E_TARGET = 'container'
$env:E2E_BASE_URL = 'http://127.0.0.1:4173'
npm run test:e2e
Remove-Item Env:E2E_TARGET
Remove-Item Env:E2E_BASE_URL
```

Suite authenticated cần BE health UP, tài khoản synthetic riêng và contract attestation/
reset namespace test được BE thực thi. Đợt chuẩn hóa đang có trong working tree sẽ
chặn contract reset token-only cũ; không tắt guard để ép chạy. Xem
[FRONTEND_INTEGRATION_TESTING.md](./FRONTEND_INTEGRATION_TESTING.md) và review local/test.
Public-only không chứng minh login hay API hoạt động. Không chạy reset trên production.

## 7. Tại sao Docker Desktop còn hai stack FE?

`moodly-frontend-test` là project được tạo bởi cấu hình cũ. Cấu hình workstation hiện
đang hướng đến một project `moodly-frontend-local`, dùng local/test luân phiên.
Đổi tên Compose project không tự di chuyển/xóa container cũ. Hai container cùng ánh
xạ port 4173 không thể đồng thời chiếm port đó.

- Giữ project hiện tại và dùng Make để chuyển local/test.
- Đừng bấm Start cả project cũ và mới.
- Stack cũ chỉ cần cleanup một lần, tách biệt với stop hằng ngày. Tại FE:

```sh
# Xem kế hoạch, chưa thay đổi Docker
node scripts/migrate-frontend-stack.mjs
# Áp dụng: chỉ container FE cũ đã dừng và network thuộc project cũ
make local-container-migrate
```

Migration từ chối container đang chạy, khác checkout/service, có mount dữ liệu hoặc
network có container ngoài phạm vi. Không xóa image/volume, không đụng BE hay project
FE mới. Chạy lại sau migration là no-op. Sau đó `make local-container-up` và
`make test-container-up` cùng dùng project `moodly-frontend-local`; thay đổi env sẽ
rebuild/recreate service FE trong project đó, không tạo project test riêng.

| Thao tác | Container/network | Image | Dữ liệu volume |
| --- | --- | --- | --- |
| stop | Giữ, container dừng | Giữ | Giữ |
| up | Tạo/bật/recreate khi cần | Build hoặc sử dụng image | Giữ volume được cấu hình |
| down | Xóa container/network thuộc project | Thông thường giữ | Giữ named volumes mặc định |
| down -v / clean | Xóa theo phạm vi lệnh | Tùy lệnh | Có thể xóa dữ liệu |

Chỉ stop sau công việc thường ngày. `down` là cleanup chủ động; không xóa volume BE
khi chưa quyết định rõ việc mất dữ liệu.

## 8. Chỉ tải image về có chạy được app không?

Có thể khởi động ứng dụng mà không cần source, Node/Maven hay build lại, nếu có Docker,
image đúng OS/architecture, cấu hình và các dịch vụ phụ thuộc truy cập được.
Container chạy được chưa đồng nghĩa toàn bộ hệ thống hoạt động.

| Image runtime | Chứa | Cần cung cấp bên ngoài |
| --- | --- | --- |
| FE | Alpine + Nginx + dist (HTML/JS/CSS/assets), cấu hình public đã nhúng | BE, Auth0, Cloudinary delivery và origin hợp lệ |
| BE | Alpine + Java JRE + application JAR/thư viện | MongoDB replica set, ES, Auth0, Cloudinary, runtime env/CORS |

Ví dụ PowerShell: thay image minh họa bằng registry/tag hoặc digest thật đã publish.
Registry private cần `docker login`. Các lệnh dưới đây không build source.

```powershell
$feImage = 'registry.example.com/moodly/frontend:release'
docker pull $feImage
docker run -d --name moodly-fe-image --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true -p 127.0.0.1:4173:8080 $feImage
```

Mở port 4173 để xem FE. Image phải được build sẵn với API/Auth0 đúng môi trường.
`docker run -e VITE_API_BASE_URL=...` không sửa được JS đã build. Nếu image trỏ đến API
local của tác giả thì máy tải image sẽ không tự có API đó; cần image build đúng đích.
FE không cần BE để trả HTML public, nhưng login/dữ liệu nghiệp vụ cần các dịch vụ thật.

```powershell
$beImage = 'registry.example.com/moodly/backend:release'
docker pull $beImage
docker run -d --name moodly-be-image --env-file backend.runtime.env -p 127.0.0.1:8080:8080 $beImage
```

`backend.runtime.env` do người vận hành tạo, không nằm trong image. Với profile `prod`,
tham khảo `.env.production.example` trong repo BE: `SPRING_PROFILES_ACTIVE=prod`,
`MONGODB_URI`, `ELASTICSEARCH_URIS`, Auth0, Cloudinary và CORS. Database/search phải tồn
 tại và truy cập được. `localhost` bên trong container BE là chính container đó;
không phải máy host hay MongoDB container khác. Dùng network/service DNS đúng topology.
Nếu database local chỉ publish trên loopback thì không mặc định container BE sẽ gọi
được; Compose BE có cấu hình network riêng cho trường hợp đó.

Không chạy raw image với database production để thử nghiệm. Không truyền secret BE
vào image FE. Nếu container BE không healthy, kiểm tra dependency/config thay vì chỉ
nhìn trạng thái Running. Nên dùng Compose/launcher BE khi phát triển có source để giữ
đúng replica-set, network và ownership.

Image build trên máy chỉ nằm trong Docker Engine local. `docker push` mới đưa image
lên registry; `git push` chỉ đẩy source/commit. Repo FE hiện không mặc định publish image
lên Docker Hub. FE Vercel phục vụ static deployment; image Docker FE không được Vercel
chạy chỉ vì source repo có Dockerfile.
