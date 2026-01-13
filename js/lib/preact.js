/**
 * Dashboard NG - Preact Utilities
 *
 * Re-exports Preact from UMD globals for use across components
 * @module lib/preact
 */

/** @type {Function} Preact h function for creating VDOM nodes */
const { h, render, Fragment, createContext } = preact;

/** @type {Object} Preact hooks for functional components */
const { useState, useEffect, useRef, useCallback, useContext } = preactHooks;

/** @type {Function} Tagged template literal function for JSX-like syntax */
const html = htm.bind(h);

export { h, render, Fragment, createContext, useState, useEffect, useRef, useCallback, useContext, html };
