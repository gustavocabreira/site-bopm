.PHONY: build up down restart logs sh dev

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart: down up

logs:
	docker compose logs -f web

sh:
	docker compose exec web sh

dev:
	npm run dev
