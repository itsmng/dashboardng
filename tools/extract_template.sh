#!/bin/bash
# Extract translatable strings from PHP and JavaScript files

PLUGIN_NAME="DashboardNG"
VERSION="1.0.0"
COPYRIGHT_HOLDER="ITSMNG Team"
POT_FILE="itsm.pot"

# Find all PHP files (excluding vendor and node_modules)
PHP_SOURCES=$(find . -name "*.php" -not -path "./vendor/*" -not -path "./node_modules/*")

# Find all JavaScript files (excluding node_modules)
JS_SOURCES=$(find ./js -name "*.js" 2>/dev/null)

# Backup existing .pot file if it exists
if [ -f "locales/$POT_FILE" ]; then
    cp "locales/$POT_FILE" "locales/$POT_FILE.bak"
fi

# Extract from PHP files first
echo "Extracting translatable strings from PHP files..."
xgettext $PHP_SOURCES \
    --package-name="$PLUGIN_NAME" \
    --package-version="$VERSION" \
    --copyright-holder="$COPYRIGHT_HOLDER" \
    --output=locales/$POT_FILE \
    --language=PHP \
    --add-comments=TRANS \
    --from-code=UTF-8 \
    --force-po \
    --keyword=__ \
    --keyword=_n:1,2 \
    --keyword=_e:1

# Extract from JavaScript files and merge
if [ -n "$JS_SOURCES" ]; then
    echo "Extracting translatable strings from JavaScript files..."
    xgettext $JS_SOURCES \
        --package-name="$PLUGIN_NAME" \
        --package-version="$VERSION" \
        --copyright-holder="$COPYRIGHT_HOLDER" \
        --output=locales/$POT_FILE \
        --language=JavaScript \
        --add-comments=TRANS \
        --from-code=UTF-8 \
        --force-po \
        --keyword=__ \
        --join-existing
fi

# Remove backup if successful
if [ -f "locales/$POT_FILE.bak" ]; then
    rm "locales/$POT_FILE.bak"
fi

echo "Translation template updated: locales/$POT_FILE"
