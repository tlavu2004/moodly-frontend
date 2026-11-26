# Running the Moodly Frontend and Backend

## 1. Choose a Setup

Keep `moodly-frontend/` and `moodly-backend/` as sibling repositories. Run each `make` command from the root of the relevant repository. The frontend Makefile manages the frontend only.

| Use Case | MongoDB and Elasticsearch | Backend | Frontend |
| --- | --- | --- | --- |
| Daily development | Docker, managed by the backend | Local Java or IDE | Local Vite |
| Verify the frontend build | Docker or existing services | Java or a container | Nginx container |
| Verify both application images | Docker or existing services | Java container | Nginx container |
| Production hosting | Services configured by the backend | Docker on Render | Static build on Vercel |

Nginx serves the built frontend from the frontend image. MongoDB and Elasticsearch are separate services managed through Docker Compose. Each application image contains its own runtime and application files.

## 2. One-Time Setup

- Install Docker Desktop and start the Linux engine.
- For native application runs, install the Node.js and npm versions required by the frontend and the Java version required by the backend. The backend Dockerfile uses Java 25, and the backend repository includes Maven Wrapper.
- GNU Make is optional for the frontend. Backend Make recipes use Bash, so run them in Git Bash or WSL on Windows. The environment variable examples that use `$env:` are for PowerShell.
- In the frontend repository, run `npm ci` and create `.env.local` from `.env.local.example` if you have no existing configuration. Local and test runs share that file.
- Follow the backend README to configure its `.env.local`, Auth0, Cloudinary, and infrastructure.
- Local and test frontend runs share `http://127.0.0.1:5173`. Configure the Auth0 callback, logout, and web origins as well as backend CORS for that exact origin. `localhost` and `127.0.0.1` are distinct origins.
- Give the frontend an API URL reachable from the browser. Compose service names such as `backend` only resolve within the Docker network.

## 3. Local Development With Backend Infrastructure in Docker

### Terminal A — Backend Infrastructure

In `moodly-backend`, run:

```sh
make local-up
make local-status
make local-replica-status
make local-elasticsearch-status
```

`make local-up` starts and retains MongoDB and Elasticsearch, initializes the replica set, and waits for readiness. The containers continue running after you close terminal A. Use this mode when you want infrastructure without the Java application.

### Terminal B — Backend Application

In `moodly-backend`, run:

```sh
make local-run
```

The backend runs in the foreground. You can also run or debug it in an IDE with the same local configuration. Run one Java instance on the backend port at a time. The launcher ensures the infrastructure is ready. Run `make local-up` separately to keep the infrastructure available independently of the application.

### Terminal C — Frontend Application

In `moodly-frontend`, run:

```sh
make local-run
```

Open `http://127.0.0.1:5173`. Vite reads `.env.local` and enables hot reload, as it does with `npm run dev`. This setup runs Vite directly on the host.

### Shutdown

1. Press `Ctrl+C` in the Vite and backend launcher terminals, or stop the backend in the IDE.
2. Leave MongoDB and Elasticsearch running if you will use them again soon.
3. To stop the infrastructure, run `make local-stop` from the backend repository after all managed application and test sessions have ended. The backend refuses to stop the stack while those sessions are active.

## 4. Verify the Frontend With Docker and Nginx

If you need to sign in or use real data, start the backend as described in section 3 or 5. In the frontend repository, choose one of these modes:

```sh
# Local mode uses .env.local and host port 5173.
make local-container-up

# Test mode uses the same file and port.
make test-container-up
```

Both commands build the static image, start Nginx in the background, and wait for a healthy container before returning. Rerun the appropriate command after changing code or configuration. Stop Vite before starting Nginx on the same port.

```sh
make local-container-status
make local-container-logs
make local-container-stop
```

Pressing `Ctrl+C` while viewing logs stops log streaming. The `stop` command stops the frontend container and retains the container and network. The `local-container-*` lifecycle commands manage the frontend workstation stack only and default to the test environment. To validate a local configuration, run `make validate-local MOODLY_ENV=local`.

## 5. Run the Backend Application in Docker

In the backend repository, choose one of these modes:

```sh
make local-container-build
make local-container-run

# Use the test namespace managed by the backend launcher.
make test-container-run
```

Backend `*-container-run` commands run in the foreground and manage the session, infrastructure, and test lifecycle. Press `Ctrl+C` for a normal shutdown. Run either the native Java backend or its container on the configured port, usually `8080`. See the backend README for recovering or stopping a leftover container with `local-container-stop`.

The backend test namespace contains disposable data. Use local mode to inspect local data. Manage active infrastructure through the backend launcher so it can honor its session leases.

## 6. Quality Checks and E2E

In the frontend repository, run:

```sh
make verify
```

This runs configuration and safety checks, lint, tests with coverage, and the build without a live backend. The backend's `make verify` includes integration tests that use backend-managed infrastructure. Finish any manual test session holding the exclusive test namespace first.

Use Playwright either with an owned Vite server or against the running test Nginx container:

```powershell
# Public routes on a Playwright-owned Vite server. Leave port 5173 free.
$env:E2E_TARGET = 'dev'
npx playwright test --project=public
Remove-Item Env:E2E_TARGET

# Tests against Nginx started with make test-container-up.
$env:E2E_TARGET = 'container'
$env:E2E_BASE_URL = 'http://127.0.0.1:5173'
npm run test:e2e
Remove-Item Env:E2E_TARGET
Remove-Item Env:E2E_BASE_URL
```

Authenticated E2E requires a healthy backend and a synthetic account matching the reset user configured in the backend. The runner uses a fixed reset POST endpoint on the API origin, sends a token, and disallows redirects. Use the authenticated suite to verify login and live API calls. Run resets only in test environments. See [Frontend Integration Testing](./FRONTEND_INTEGRATION_TESTING.md).

## 7. Multiple Frontend Stacks in Docker Desktop

`moodly-frontend-test` is a legacy Compose project. The current workstation setup alternates local and test modes on `moodly-frontend-local`. Renaming a Compose project leaves its previous containers in place. Only one container can bind host port `5173`.

- Keep the current project and use Make to switch between local and test modes.
- Start only the current project on the shared port.
- Clean up the legacy stack once. For everyday shutdown, use `stop`.

In the frontend repository, run:

```sh
# Preview the migration.
node scripts/migrate-frontend-stack.mjs
# Apply it to stopped legacy frontend containers and their networks.
make local-container-migrate
```

The migration refuses running containers, containers for a different checkout or service, data mounts, and networks containing out-of-scope containers. It preserves images, volumes, the backend, and the current frontend project. Running it again has no effect. `make local-container-up` and `make test-container-up` both use `moodly-frontend-local`; environment changes rebuild or recreate its service as needed.

| Operation | Containers and Networks | Images | Volume Data |
| --- | --- | --- | --- |
| `stop` | Retained with containers stopped | Retained | Retained |
| `up` | Created, started, or recreated as needed | Built or reused | Configured volumes retained |
| `down` | Removes the project's containers and networks | Normally retained | Named volumes retained by default |
| `down -v` or `clean` | Depends on the command scope | Depends on the command | May delete data |

Use `stop` for routine shutdown. Use `down` for deliberate cleanup and decide explicitly before deleting backend volume data.

## 8. Run From Published Images

Docker can run the application without a source checkout, Node.js, Maven, or a local build if the image matches the host architecture and the required configuration and services are reachable. A running container only confirms the process started.

| Image | Contents | External Requirements |
| --- | --- | --- |
| Frontend | Alpine, Nginx, built HTML, JavaScript, CSS, assets, and embedded public configuration | Backend, Auth0, Cloudinary delivery, and valid origins |
| Backend | Alpine, Java JRE, application JAR, and libraries | MongoDB replica set, Elasticsearch, Auth0, Cloudinary, runtime environment, and CORS |

The PowerShell examples below use placeholder image names. Substitute a published registry, tag, or digest. Use `docker login` for private registries. These commands run prebuilt images.

```powershell
$feImage = 'registry.example.com/moodly/frontend:release'
docker pull $feImage
docker run -d --name moodly-fe-image --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true -p 127.0.0.1:5173:8080 $feImage
```

Open port `5173` to view the frontend. Use an image built against the API and Auth0 configuration for the target environment. `docker run -e VITE_API_BASE_URL=...` cannot change the JavaScript embedded at build time. An image pointing to its author's loopback API needs a rebuild for another environment. Nginx can serve public pages independently, while sign-in and application data require reachable services.

```powershell
$beImage = 'registry.example.com/moodly/backend:release'
docker pull $beImage
docker run -d --name moodly-be-image --env-file backend.runtime.env -p 127.0.0.1:8080:8080 $beImage
```

Create `backend.runtime.env` outside the image. For the `prod` profile, use the backend's `.env.production.example` as a reference for `SPRING_PROFILES_ACTIVE=prod`, `MONGODB_URI`, `ELASTICSEARCH_URIS`, Auth0, Cloudinary, and CORS. The database and search services must exist and be reachable. Inside the backend container, `localhost` refers to that container. Use the correct network and service DNS names for your topology. A service published only on the host loopback address is not automatically reachable from the backend container. The backend Compose configuration has a network setup for this case.

Use test services when trying an image and keep backend secrets out of frontend images. If the backend is unhealthy, check dependencies and configuration as well as container state. When developing from source, use the backend Compose and launcher setup to preserve replica-set, network, and session ownership behavior.

Local builds remain in the local Docker Engine until you publish them with `docker push`. `git push` publishes commits. The frontend repository does not publish images to Docker Hub by default. Vercel serves the static frontend deployment separately from the Docker image.

## 9. Expected Docker Desktop Stack Layout

Keep these two Compose groups for workstation use:

```text
moodly-backend-local
  moodly-mongodb-local
  moodly-elasticsearch-local
  [backend application when running in a container]
moodly-frontend-local
  moodly-frontend-local       # Nginx and the frontend, host 5173 -> container 8080
```

The backend repository manages its service names. When the backend runs in an IDE or native JVM, Docker shows only MongoDB and Elasticsearch in its group. Image tags represent build versions and can remain after a container stops. Preserve volumes and stop idle stacks as needed. Local and test frontend modes share public configuration, an environment file, and a port. Select test mode for Playwright verification and run one frontend server on port `5173` at a time.
