# -*- globals -*- #
SRC_DIR = src
BUILD_DIR = build
CLEAN += $(BUILD_DIR)/*
SRC = $(SRC_DIR)/p.js

.PHONY: all
all: minify commonjs amd report

# -*- minification -*- #
UGLIFYJS ?= ./node_modules/.bin/uglifyjs
UGLIFY_OPTS += -m -c hoist_vars=true,unsafe=true
UGLY = $(BUILD_DIR)/p.min.js

$(UGLY): $(SRC)
	$(UGLIFYJS) $(UGLIFY_OPTS) $< -o $@

%.min.js: %.js
	$(UGLIFYJS) $(UGLIFY_OPTS) $< -o $@

minify: $(UGLY)

# special builds
COMMONJS = $(BUILD_DIR)/p.commonjs.js

$(BUILD_DIR)/p.%.js: $(SRC_DIR)/%/pre.js $(SRC) $(SRC_DIR)/%/post.js
	mkdir -p $(BUILD_DIR)
	cat $^ > $@

.PHONY: commonjs
commonjs: $(COMMONJS)

.PHONY: amd
amd: $(BUILD_DIR)/p.amd.js $(BUILD_DIR)/p.amd.min.js

.PHONY: report
report: $(UGLY)
	wc -c $(UGLY)

# -*- testing -*- #
MOCHA ?= ./node_modules/.bin/mocha
TESTS = ./test/*.test.js
.PHONY: test
test: $(COMMONJS)
	$(MOCHA) $(TESTS)

# -*- packaging -*- #

VERSION = $(shell node -e 'console.log(require("./package.json").version)')
PACKAGE = pjs-$(VERSION).tgz
CLEAN += pjs-*.tgz

$(PACKAGE): clean commonjs test
	npm pack .

.PHONY: package
package: $(PACKAGE)

.PHONY: publish
publish: $(PACKAGE)
	npm publish $(PACKAGE)

# -*- cleanup -*- #
.PHONY: clean
clean:
	rm -f $(CLEAN)
