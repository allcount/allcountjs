clean:
	rm -rf node_modules/*

install:
	npm install

test:
	./node_modules/.bin/jshint lib/* --config test/jshint/config.json
	@NODE_ENV=test ./node_modules/.bin/mocha --recursive --reporter spec --timeout 3000 test

test-lcov:
	@NODE_ENV=test ./node_modules/.bin/mocha --require blanket --recursive --timeout 3000 -R mocha-lcov-reporter test
	
test-cov:
	@NODE_ENV=test ./node_modules/.bin/mocha --require blanket --recursive --timeout 3000 -R travis-cov test

test-cov-html:
	@NODE_ENV=test ./node_modules/.bin/mocha --require blanket --recursive --timeout 3000 -R html-cov test > test/coverage.html
	xdg-open "file://${CURDIR}/test/coverage.html" &

.PHONY: test test-cov test-cov-html
