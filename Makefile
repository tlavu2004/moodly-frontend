.DEFAULT_GOAL := help
MOODLY_ENV ?= test
SOURCE_REVISION ?= $(shell git rev-parse HEAD)
IMAGE_TAG ?= $(MOODLY_ENV)-$(shell git rev-parse --short=12 HEAD)
export MOODLY_ENV SOURCE_REVISION IMAGE_TAG
ENV_FILE ?= $(if $(filter local,$(MOODLY_ENV)),.env.local,.env.$(MOODLY_ENV).local)
compose = docker compose -p moodly-frontend-$(MOODLY_ENV) --env-file "$(ENV_FILE)" -f compose.yaml

.PHONY: help local-run test-run lint test verify build docker-build docker-up docker-stop docker-down docker-logs docker-status docker-validate docker-record
help:
	@echo "npm: local-run test-run lint test verify build"
	@echo "Docker: docker-build docker-up docker-stop docker-down docker-logs docker-status docker-validate docker-record"
	@echo "Use docker-stop after work to retain the stack; docker-down explicitly removes it."
	@echo "Docker defaults: MOODLY_ENV=test ENV_FILE=.env.test.local (override for production)"
local-run:
	npm run dev
test-run:
	npm run dev -- --mode test --host 127.0.0.1 --port 4173
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
docker-validate:
	$(compose) config --quiet
docker-build:
	$(compose) build
docker-up:
	$(compose) up -d --build --wait --wait-timeout 90
docker-stop:
	$(compose) stop
docker-down:
	$(compose) down
docker-logs:
	$(compose) logs -f frontend
docker-status:
	$(compose) ps --all

docker-record:
	node scripts/record-image.mjs moodly-frontend:$(IMAGE_TAG)
