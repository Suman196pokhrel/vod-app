# ─────────────────────────────────────────────
#   VOD App — Developer Makefile
# ─────────────────────────────────────────────

.PHONY: help dev build down restart logs shell db clean

.DEFAULT_GOAL := help

# Colors
BOLD  := \033[1m
CYAN  := \033[36m
GREEN := \033[32m
GRAY  := \033[90m
RESET := \033[0m

INFRA_DIR    = infra
COMPOSE_FILE = $(INFRA_DIR)/docker-compose.local.yml
ENV_FILE     = $(INFRA_DIR)/local.env
DC           = docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE)

# ── Help ──────────────────────────────────────

help:
	@printf "\n$(BOLD)  VOD App$(RESET) $(GRAY)— local dev commands$(RESET)\n\n"
	@printf "  $(CYAN)%-12s$(RESET) %s\n" "dev"     "Start containers"
	@printf "  $(CYAN)%-12s$(RESET) %s\n" "build"   "Rebuild images and start"
	@printf "  $(CYAN)%-12s$(RESET) %s\n" "down"    "Stop containers"
	@printf "  $(CYAN)%-12s$(RESET) %s\n" "restart" "Stop then start"
	@printf "  $(CYAN)%-12s$(RESET) %s\n" "logs"    "Follow logs  (e.g. make logs s=api)"
	@printf "  $(CYAN)%-12s$(RESET) %s\n" "shell"   "Shell into the api container"
	@printf "  $(CYAN)%-12s$(RESET) %s\n" "db"      "Open a psql session"
	@printf "  $(CYAN)%-12s$(RESET) %s\n" "clean"   "Stop and remove volumes"
	@printf "\n"

# ── Core ──────────────────────────────────────

dev:
	@printf "$(CYAN)▶ Starting dev environment…$(RESET)\n"
	@cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env up -d
	@printf "$(GREEN)✔ Ready$(RESET)\n"

build:
	@printf "$(CYAN)▶ Rebuilding images…$(RESET)\n"
	@cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env up -d --build
	@printf "$(GREEN)✔ Done$(RESET)\n"

down:
	@printf "$(CYAN)▶ Stopping containers…$(RESET)\n"
	@cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env down
	@printf "$(GREEN)✔ Stopped$(RESET)\n"

restart: down dev

logs:
	@cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env logs -f $(s)

# ── Shells ────────────────────────────────────

shell:
	@cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env exec api bash

db:
	@cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env exec postgres psql -U vod_user -d vod_db

# ── Cleanup ───────────────────────────────────

clean:
	@printf "$(CYAN)▶ Removing containers and volumes…$(RESET)\n"
	@cd $(INFRA_DIR) && docker compose -f docker-compose.local.yml --env-file local.env down -v
	@printf "$(GREEN)✔ Clean$(RESET)\n"
