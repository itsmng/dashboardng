/**
 * Dashboard NG - Translation Helper (non-escaped)
 *
 * Provides translation functions that do NOT HTML-escape the output,
 * unlike the global window.__ which uses _.escape().
 * 
 * @module lib/i18n
 */

/**
 * Simple translation (singular)
 * @param {string} msgid - The message ID to translate
 * @param {string} [domain='glpi'] - Translation domain
 * @param {...*} extra - Extra variables for sprintf-style formatting
 * @returns {string} Translated text WITHOUT HTML escaping
 */
export function __(msgid, domain, ...extra) {
    domain = typeof domain !== 'undefined' ? domain : 'glpi';
    const text = window.i18n.dcnpgettext.apply(
        window.i18n,
        [domain, undefined, msgid, undefined, undefined].concat(extra)
    );
    return text;
}

/**
 * Pluralized translation
 * @param {string} msgid - Singular message ID
 * @param {string} msgid_plural - Plural message ID
 * @param {number} n - Count for pluralization
 * @param {string} [domain='glpi'] - Translation domain
 * @param {...*} extra - Extra variables for sprintf-style formatting
 * @returns {string} Translated text WITHOUT HTML escaping
 */
export function _n(msgid, msgid_plural, n, domain, ...extra) {
    domain = typeof domain !== 'undefined' ? domain : 'glpi';
    const text = window.i18n.dcnpgettext.apply(
        window.i18n,
        [domain, undefined, msgid, msgid_plural, n].concat(extra)
    );
    return text;
}

/**
 * Context-aware translation
 * @param {string} msgctxt - Message context
 * @param {string} msgid - The message ID to translate
 * @param {string} [domain='glpi'] - Translation domain
 * @param {...*} extra - Extra variables for sprintf-style formatting
 * @returns {string} Translated text WITHOUT HTML escaping
 */
export function _x(msgctxt, msgid, domain, ...extra) {
    domain = typeof domain !== 'undefined' ? domain : 'glpi';
    const text = window.i18n.dcnpgettext.apply(
        window.i18n,
        [domain, msgctxt, msgid, undefined, undefined].concat(extra)
    );
    return text;
}

/**
 * Context-aware pluralized translation
 * @param {string} msgctxt - Message context
 * @param {string} msgid - Singular message ID
 * @param {string} msgid_plural - Plural message ID
 * @param {number} n - Count for pluralization
 * @param {string} [domain='glpi'] - Translation domain
 * @param {...*} extra - Extra variables for sprintf-style formatting
 * @returns {string} Translated text WITHOUT HTML escaping
 */
export function _nx(msgctxt, msgid, msgid_plural, n, domain, ...extra) {
    domain = typeof domain !== 'undefined' ? domain : 'glpi';
    const text = window.i18n.dcnpgettext.apply(
        window.i18n,
        [domain, msgctxt, msgid, msgid_plural, n].concat(extra)
    );
    return text;
}
