.DEFAULT_GOAL := help
MOODLY_ENV ?= test
export MOODLY_ENV
ENV_FILE ?= .env.$(MOODLY_ENV).local
compose = docker compose -p moodly-frontend-$(MOODLY_ENV) --env-file "$(ENV_FILE)" -f compose.yaml

.PHONY: help local-run test-run lint test verify build docker-build docker-up docker-down docker-logs docker-status docker-validate
help:
	@echo "npm: local-run test-run lint test verify build"
	@echo "Docker: docker-build docker-up docker-down docker-logs docker-status docker-validate"
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
	npm run lint
	npm run test:coverage
	npm run build
docker-validate:
	$(compose) config --quiet
docker-build:
	$(compose) build
docker-up:
	$(compose) up -d --build --wait --wait-timeout 90
docker-down:
	$(compose) down
docker-logs:
	$(compose) logs -f frontend
docker-status:
	$(compose) ps
