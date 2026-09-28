/**
 * Disallows relative imports that resolve outside the importing file's
 * package (the nearest ancestor directory containing a package.json).
 *
 * Cross-package code must be imported through the target package's public
 * specifier (`@elden-ring-compass/...`) with a declared workspace dependency,
 * so the dependency graph that typecheck, knip, and turbo caching rely on can
 * see the edge. A relative path that climbs out of the package is invisible to
 * all of them, so a deleted or renamed export can keep compiling unnoticed.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Rule } from 'eslint';

const packageRootCache = new Map<string, string | null>();

function findPackageRoot(startDir: string): string | null {
  const cached = packageRootCache.get(startDir);
  if (cached !== undefined) return cached;

  // Walk up until a package.json turns up, or until `dirname` stops moving —
  // which is how the filesystem root announces itself.
  let current: string | null = startDir;
  let result: string | null = null;
  while (current !== null) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      result = current;
      break;
    }
    const parent = path.dirname(current);
    current = parent === current ? null : parent;
  }
  packageRootCache.set(startDir, result);
  return result;
}

function checkSource(
  context: Rule.RuleContext,
  sourceNode: { value?: unknown } & Rule.Node,
) {
  const spec = String(sourceNode.value);
  // Only parent-relative specifiers can escape the package.
  if (!spec.startsWith('..')) return;

  const filename = context.physicalFilename || context.filename;
  if (!path.isAbsolute(filename)) return;
  const fileDir = path.dirname(filename);
  const fileRoot = findPackageRoot(fileDir);
  if (!fileRoot) return;

  // Strip bundler query suffixes (`?raw`, `?react`, ...).
  const cleanSpec = spec.split('?')[0] ?? spec;
  const resolved = path.resolve(fileDir, cleanSpec);
  const targetDir =
    fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()
      ? resolved
      : path.dirname(resolved);
  const targetRoot = findPackageRoot(targetDir);

  if (targetRoot !== fileRoot) {
    context.report({
      node: sourceNode,
      messageId: 'noCrossPackageRelativeImport',
      data: {
        spec,
        targetPackage: targetRoot ?? '(no package found)',
      },
    });
  }
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow relative imports that resolve outside the importing package',
    },
    messages: {
      noCrossPackageRelativeImport:
        "Relative import '{{spec}}' resolves outside this package (into {{targetPackage}}). " +
        'Import through the target package’s public specifier and declare a workspace ' +
        'dependency instead — relative cross-package edges are invisible to typecheck, ' +
        'knip, and turbo caching.',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        checkSource(context, node.source as Rule.Node & { value?: unknown });
      },
      ImportExpression(node) {
        if (node.source.type === 'Literal') {
          checkSource(context, node.source as Rule.Node & { value?: unknown });
        }
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkSource(context, node.source as Rule.Node & { value?: unknown });
        }
      },
      ExportAllDeclaration(node) {
        checkSource(context, node.source as Rule.Node & { value?: unknown });
      },
    };
  },
};

const plugin = {
  meta: {
    name: 'import-boundaries',
  },
  rules: {
    'no-cross-package-relative-imports': rule,
  },
};

export default plugin;
