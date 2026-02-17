import type { VNode, FunctionComponent, ComponentClass, ComponentChildren, Context } from 'preact';

declare global {
    namespace JSX {
        type Element = ComponentChildren;
        interface ElementClass {
            render: () => ComponentChildren;
        }
        interface ElementAttributesProperty {
            props: {};
        }
        interface ElementChildrenAttribute {
            children: {};
        }
        interface IntrinsicAttributes {
            key?: any;
            children?: ComponentChildren;
        }
        interface IntrinsicElements {
            [elemName: string]: any;
        }
    }
}

declare module 'preact' {
    export function h<Props = {}>(
        type: string | FunctionComponent<Props> | ComponentClass<Props>,
        props?: Props | null,
        ...children: ComponentChildren[]
    ): VNode<Props>;

    export function render(
        vnode: VNode,
        parent: Element | Document | ShadowRoot | DocumentFragment,
        replaceNode?: Element | Text
    ): void;

    export function createContext<T = undefined>(defaultValue?: T): Context<T>;

    export function Fragment(props: { children?: ComponentChildren }): VNode<{}>;
}

declare module 'preact/hooks' {
    export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
    export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
    export function useRef<T>(initialValue: T): { current: T };
    export function useCallback<T extends (...args: unknown[]) => unknown>(callback: T, deps: readonly unknown[]): T;
    export function useContext<T>(context: import('preact').Context<T>): T;
    export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
    export function useReducer<S, A>(
        reducer: (state: S, action: A) => S,
        initialState: S
    ): [S, (action: A) => void];
    export function useReducer<S, A, I>(
        reducer: (state: S, action: A) => S,
        initialArg: I,
        init: (arg: I) => S
    ): [S, (action: A) => void];
}