# Makefile for VOD App
# All Docker files are in ./infra/

.PHONY: help dev prod down logs restart clean shell db-shell status

.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[36m
GREEN := \033[32m
RESET := \033[0m

# Paths to Docker files
INFRA_DIR = infra
LOCAL_COMPOSE = $(INFRA_DIR)/docker-compose.local.yml
LOCAL_ENV = $(INFRA_DIR)/local.env
PROD_COMPOSE = $(INFRA_DIR)/docker-compose.yml
PROD_ENV = $(INFRA_DIR)/prod.env

help: ## Show available commands
	@echo "$(BLUE)VOD App - Available Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(RESET) %s\n", $$1, $$2}'

# ============================================
# LOCAL DEVELOPMENT
# ============================================

dev: ## Start local development
	@echo "$(BLUE)Starting local development...$(RESET)"
	cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env up -d
	@echo "$(GREEN) Development environment started!$(RESET)"

dev-build: ## Rebuild and start local development
	@echo "$(BLUE)Rebuilding local development...$(RESET)"
	cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env up -d --build

down: ## Stop all containers
	cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env down

restart: down dev ## Restart local development

logs: ## Show logs (usage: make logs s=api)
	cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env logs -f $(s)

ps: ## List running containers
	cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env ps

shell: ## Open shell in API container
	cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env exec api bash

worker-shell: ## Open shell in worker container
	cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env exec worker bash

db-shell: ## Open PostgreSQL shell
	cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env exec postgres psql -U vod_user -d vod_db

redis-cli: ## Open Redis CLI
	cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env exec redis redis-cli -a redis_local_password

clean: ## Remove containers and volumes
	cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env down -v
	@echo "$(GREEN) Cleaned up!$(RESET)"

# ============================================
# PRODUCTION
# ============================================

prod: ## Start production environment
	@echo "$(BLUE)Starting production...$(RESET)"
	cd $(INFRA_DIR) && docker compose -f docker-compose.yml --env-file prod.env up -d
	@echo "$(GREEN) Production started!$(RESET)"

prod-build: ## Rebuild and start production
	cd $(INFRA_DIR) && docker compose -f docker-compose.yml --env-file prod.env up -d --build

prod-down: ## Stop production
	cd $(INFRA_DIR) && docker compose -f docker-compose.yml --env-file prod.env down

prod-logs: ## Show production logs (usage: make prod-logs s=api)
	cd $(INFRA_DIR) && docker compose -f docker-compose.yml --env-file prod.env logs -f $(s)

prod-restart: prod-down prod ## Restart production

# ============================================
# UTILITIES
# ============================================

status: ## Show container status
	@echo "$(BLUE)Container Status:$(RESET)"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

health: ## Check service health
	@echo "$(BLUE)Checking API health...$(RESET)"
	@curl -s http://localhost:8000/health || echo "API not responding"