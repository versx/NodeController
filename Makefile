.PHONY: build # Build containers
build:
	docker-compose build

.PHONY: install # Install Api depencencies
install:
	docker-compose run --rm api sh -lc 'npm install'

.PHONY: dev
dev:
	docker-compose up -d

.PHONY: stop
stop:
	docker-compose down

.PHONY: logs
logs:
	docker-compose logs -f $(service)

.PHONY: start
start: start-deps
	npm run compile
	npm start

.PHONY: start-deps
start-deps:
	docker-compose up -d mysql redis