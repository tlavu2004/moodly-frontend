.DEFAULT_GOAL := help
MOODLY_ENV ?= test
SOURCE_REVISION ?= $(shell git rev-parse HEAD)
IMAGE_TAG ?= $(MOODLY_ENV)-$(shell git rev-parse --short=12 HEAD)
FRONTEND_PORT ?= $(if $(filter local,$(MOODLY_ENV)),5173,4173)
export MOODLY_ENV SOURCE_REVISION IMAGE_TAG FRONTEND_PORT
ENV_FILE ?= $(if $(filter local,$(MOODLY_ENV)),.env.local,.env.$(MOODLY_ENV).local)
COMPOSE_PROJECT := moodly-frontend-local
compose = docker compose -p $(COMPOSE_PROJECT) --env-file "$(ENV_FILE)" -f compose.yaml

# App commands run on the host. Container commands manage only FE/Nginx.
.PHONY: help local-run test-run lint test verify build
.PHONY: local-container-build test-container-build local-container-up test-container-up
.PHONY: local-container-stop local-container-down local-container-logs local-container-status
.PHONY: validate-local container-record local-container-migrate
.PHONY: docker-build docker-up docker-stop docker-down docker-logs docker-status docker-validate docker-record

define help_text
Frontend
  make local-run / test-run                 Run Vite on the host with local/test configuration
Checks and build
  make lint / test / verify                 Lint, run tests, or run all frontend quality checks
  make build                               Build the optimized static frontend
Frontend container (Nginx; detached, stack retained)
  make local-container-build / test-container-build  Build with local/test configuration
  make local-container-up / test-container-up        Build, start in background and wait for readiness
  make local-container-stop                 Stop FE; keep containers/network
  make local-container-down                 Explicitly remove FE containers/network; keep images
  make local-container-status / local-container-logs  List all FE containers or follow logs
  make local-container-migrate              One-time guarded cleanup of stopped legacy FE project
  make validate-local                       Validate selected Compose configuration without printing values
  make container-record                     Record selected image identity
Compatibility
  make docker-*                             Existing aliases; honor MOODLY_ENV (default: test)
  make                                      Show help without starting containers
Backend MongoDB/Elasticsearch are managed by moodly-backend, never these targets.
endef

help:
	$(info $(help_text))

local-run: export MOODLY_ENV = local
local-run:
	npm run dev
test-run: export MOODLY_ENV = test
test-run:
	npm run dev -- --mode test
lint:
	npm run lint
test:
	npm run test:run
build:
	npm run build
verify:
	npm run test:build-config
	npm run lint
	npm run test:coverage
	npm run build
# Select application configuration; the Compose project remains independently owned.
local-container-build local-container-up: MOODLY_ENV = local
test-container-build test-container-up: MOODLY_ENV = test

validate-local:
	$(compose) config --quiet
local-container-build test-container-build:
	$(compose) build
local-container-up test-container-up:
	$(compose) up -d --build --wait --wait-timeout 90
local-container-stop:
	$(compose) stop
local-container-down:
	$(compose) down
local-container-logs:
	$(compose) logs -f frontend
local-container-status:
	$(compose) ps --all
container-record:
	node scripts/record-image.mjs moodly-frontend:$(IMAGE_TAG)

# Keep the environment-selectable behavior of existing Docker entry points.
docker-build:
	$(compose) build
docker-up:
	$(compose) up -d --build --wait --wait-timeout 90
docker-stop: local-container-stop
docker-down: local-container-down
docker-logs: local-container-logs
docker-status: local-container-status
docker-validate: validate-local
docker-record: container-record

local-container-migrate:
	node scripts/migrate-frontend-stack.mjs --apply
