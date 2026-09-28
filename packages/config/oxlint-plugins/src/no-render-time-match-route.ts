/**
 * Disallows invoking a `useMatchRoute()` result during render.
 *
 * `useMatchRoute` returns a referentially stable callback that reads mutable
 * router state when invoked. A render-time `matchRoute({ ... })` call is
 * therefore an ordinary expression whose only inputs — the callback and the
 * options object — never change identity, so `babel-plugin-react-compiler`
 * stores the result in a memo cell on first render and serves that value
 * forever. Active states computed this way freeze on mount and never follow
 * navigation.
 *
 * Calls from a nested callback (event handlers, mutation lifecycles, store
 * selectors) are fine: they run after render against live router state, so this
 * rule judges the call site rather than the import. No file-level exemptions.
 *
 * The fix is to evaluate the match inside a `useRouterState` selector
 * (`useRouterState({ select: (s) => matches(s.location) })`). The compiler
 * never memoizes a hook call, so its return value is recomputed every render.
 *
 * `'use no memo'` is not an alternative: the directive applies only to the
 * function it is written in, so it would have to be repeated on every consuming
 * component and would disable memoization for all of each one.
 *
 * ---------------------------------------------------------------------------
 * WHEN TO DELETE THIS RULE
 * ---------------------------------------------------------------------------
 * This is a workaround for an upstream bug. Delete this rule, its `jsPlugins`
 * entry, and its `overrides` block in oxlint.config.ts once EITHER of these
 * lands in our pinned `@tanstack/react-router`:
 *
 *  1. `useMatchRoute`'s returned callback changes identity when router state
 *     changes. Tracking issue: https://github.com/TanStack/router/issues/4499
 *     Proposed fix:     https://github.com/TanStack/router/pull/6561
 *     As of react-router@1.170.18 the fix is still unmerged — a maintainer
 *     asked for it to be reworked against https://github.com/TanStack/router/pull/7805,
 *     which added a `matchRouteDeps` store subscription. That subscription
 *     makes the component re-render, but leaves the callback identity stable
 *     (`useCallback(..., [router])`), so it does NOT fix this.
 *
 *  2. The React Compiler learns that `@tanstack/react-router` is incompatible.
 *     It already auto-bails on `react-hook-form`'s `useForm().watch`,
 *     `@tanstack/react-table` and `@tanstack/react-virtual` via
 *     `defaultModuleTypeProvider`; the router is simply absent from that list.
 *     If it is added, affected components bail out on their own.
 *
 * Caveat for the eventual move to the Rust/oxc React Compiler
 * (https://github.com/vitejs/vite/discussions/22949): switching compilers does
 * not by itself make render-time `matchRoute()` safe. It reimplements the same
 * memoization, so the same freeze applies unless it also ships the
 * module-type-provider bailout above. Re-verify rather than assume — compile a
 * consumer and check whether the `matchRoute(...)` call sits inside a memo gate
 * keyed only on stable values.
 */

import type { Rule } from 'eslint';

const ROUTER_MODULE = '@tanstack/react-router';
const MATCH_ROUTE_HOOK = 'useMatchRoute';

/**
 * Hooks whose function argument still runs during render, so a `matchRoute()`
 * call inside one is memoized exactly like a bare render-time call.
 * `useCallback`/`useEffect` are absent on purpose — those defer past render.
 */
const RENDER_TIME_CALLBACK_HOOKS = new Set(['useMemo']);

type Listener = Rule.RuleListener;
/** ESTree node types, read off the visitor signatures to avoid an estree dep. */
type NodeOf<K extends keyof Listener> = Parameters<NonNullable<Listener[K]>>[0];
type Callee = NodeOf<'CallExpression'>['callee'];
type FunctionNode =
  | NodeOf<'FunctionDeclaration'>
  | NodeOf<'FunctionExpression'>
  | NodeOf<'ArrowFunctionExpression'>;

type Frame = {
  /** Names bound to a `useMatchRoute()` return value in this scope. */
  bindings: Set<string>;
  /** True when this frame's body executes during render. */
  runsDuringRender: boolean;
};

function isMatchRouteHookCall(
  node: NodeOf<'VariableDeclarator'>['init'] | Callee,
  hookNames: Set<string>,
) {
  return (
    node?.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    hookNames.has(node.callee.name)
  );
}

/** Resolves the called name for both `useMemo(...)` and `React.useMemo(...)`. */
function calleeName(callee: Callee) {
  if (callee.type === 'Identifier') return callee.name;
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier'
  ) {
    return callee.property.name;
  }
  return undefined;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow calling a useMatchRoute() result during render; the React Compiler caches the result forever.',
    },
    messages: {
      renderTimeMatchRoute:
        'Calling `{{name}}()` during render freezes the result — the React Compiler memoizes it on the ' +
        'stable callback identity, so it never updates after navigation (TanStack/router#4499). ' +
        'Evaluate the match inside a `useRouterState` selector, or move the call into an event ' +
        'handler if you only need the match at event time.',
    },
  },
  create(context) {
    /** Local names the router's `useMatchRoute` is imported under. */
    const hookNames = new Set<string>();
    /** Function arguments of `useMemo`-style hooks, which still run at render. */
    const renderTimeCallbacks = new WeakSet<object>();
    const stack: Array<Frame> = [
      { bindings: new Set(), runsDuringRender: false },
    ];

    function enterFunction(node: FunctionNode) {
      stack.push({
        bindings: new Set(),
        runsDuringRender: renderTimeCallbacks.has(node),
      });
    }

    function exitFunction() {
      stack.pop();
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value !== ROUTER_MODULE) return;

        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.type === 'Identifier' &&
            specifier.imported.name === MATCH_ROUTE_HOOK
          ) {
            hookNames.add(specifier.local.name);
          }
        }
      },

      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier') return;
        if (!isMatchRouteHookCall(node.init, hookNames)) return;

        stack.at(-1)?.bindings.add(node.id.name);
      },

      CallExpression(node) {
        // Record `useMemo(() => ..., deps)` callbacks before descending into them.
        const called = calleeName(node.callee);
        if (called !== undefined && RENDER_TIME_CALLBACK_HOOKS.has(called)) {
          const [callback] = node.arguments;
          if (
            callback?.type === 'ArrowFunctionExpression' ||
            callback?.type === 'FunctionExpression'
          ) {
            renderTimeCallbacks.add(callback);
          }
        }

        // `useMatchRoute()({ ... })` — invoked inline, always during render.
        if (isMatchRouteHookCall(node.callee, hookNames)) {
          context.report({
            node,
            messageId: 'renderTimeMatchRoute',
            data: { name: MATCH_ROUTE_HOOK },
          });
          return;
        }

        if (node.callee.type !== 'Identifier') return;
        const name = node.callee.name;

        // Innermost binding wins, so shadowed names resolve correctly.
        const declIndex = stack.findLastIndex((frame) =>
          frame.bindings.has(name),
        );
        if (declIndex === -1) return;

        // Render-time unless some frame between the declaration and the call
        // defers execution past render.
        const isRenderTime = stack
          .slice(declIndex + 1)
          .every((frame) => frame.runsDuringRender);
        if (!isRenderTime) return;

        context.report({
          node,
          messageId: 'renderTimeMatchRoute',
          data: { name },
        });
      },

      FunctionDeclaration: enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,
    };
  },
};

const plugin = {
  meta: {
    name: 'route-active',
  },
  rules: {
    'no-render-time-match-route': rule,
  },
};

export default plugin;
