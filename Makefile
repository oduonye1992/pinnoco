.PHONY: install dev build test architecture check preview deploy token

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

architecture:
	npm run architecture

check:
	npm run check

preview:
	npm run preview

deploy:
	npx vercel deploy --prod --yes

token:
	npx -y @jason.today/webmcp@0.1.13 --new
