// Requires eslint-disable/oxlint-disable/@ts-ignore/@ts-expect-error comments to include a description
// @see https://eslint-community.github.io/eslint-plugin-eslint-comments/rules/require-description.html
// oxlint-disable unknown-cast/forbidden -- ESLint's Comment type lacks loc/range but context.report accepts it at runtime

import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require descriptions on eslint-disable, oxlint-disable, @ts-ignore, and @ts-expect-error comments',
    },
    messages: {
      missingLintDescription:
        'Disable directive is missing a description. Add one after "--" (e.g., "// eslint-disable-next-line rule-name -- reason here").',
      missingTsDescription:
        'TypeScript directive is missing a description. Add one after the directive (e.g., "// @ts-expect-error: reason here" or "// @ts-expect-error -- reason here").',
    },
  },
  create(context) {
    // Pattern for eslint/oxlint disable directives
    const lintDisablePattern =
      /^\s*(eslint-disable|oxlint-disable)(-next-line|-line)?\b/;

    // Pattern for TypeScript directives - @ts-ignore, @ts-expect-error, @ts-nocheck
    // These can have description after colon or double-dash
    const tsDirectivePattern = /^\s*@ts-(ignore|expect-error|nocheck)\b/;

    return {
      Program() {
        const { sourceCode } = context;
        const comments = sourceCode.getAllComments();

        for (const comment of comments) {
          const text = comment.value.trim();

          // Check lint disable directives (require --)
          if (lintDisablePattern.test(text) && !text.includes('--')) {
            context.report({
              node: comment as unknown as Rule.Node,
              messageId: 'missingLintDescription',
            });
            continue;
          }

          // Check TypeScript directives (allow -- or : for description)
          const tsMatch = tsDirectivePattern.exec(text);
          if (tsMatch) {
            const afterDirective = text.slice(
              text.indexOf(tsMatch[0]) + tsMatch[0].length,
            );
            // Must have some description text after the directive
            // Allow ":" or "--" as separator, or just whitespace followed by text
            const hasDescription =
              afterDirective.includes('--') ||
              afterDirective.includes(':') ||
              /\s+\S/.test(afterDirective);

            if (!hasDescription) {
              context.report({
                node: comment as unknown as Rule.Node,
                messageId: 'missingTsDescription',
              });
            }
          }
        }
      },
    };
  },
};

const plugin = {
  meta: {
    name: 'disable-comments',
  },
  rules: {
    'require-description': rule,
  },
};

export default plugin;
