import type { FunctionalComponent, ComponentChildren } from 'preact';

const preact = window.preact;
const preactHooks = window.preactHooks;

const { h, render, createContext } = preact;
const { useState, useEffect, useRef, useCallback, useContext, useMemo } = preactHooks;

const Fragment: FunctionalComponent<{ children?: ComponentChildren }> = preact.Fragment;

export { h, render, Fragment, createContext, useState, useEffect, useRef, useCallback, useContext, useMemo };

export type { ComponentChildren, VNode, ComponentType, FunctionalComponent, ComponentClass, Context } from 'preact';
