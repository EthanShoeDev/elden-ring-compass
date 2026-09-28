// Requires eslint-disable/oxlint-disable directives to carry a description and
// forbids the Effect language-service form: `@effect-diagnostics` silences
// tsgolint but escapes --report-unused-disable-directives, so Effect rules are
// suppressed with oxlint-disable like every other rule. TypeScript directives
// are covered by typescript/ban-ts-comment.
// @see https://eslint-community.github.io/eslint-plugin-eslint-comments/rules/require-description.html
import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require descriptions on eslint-disable and oxlint-disable directives; forbid @effect-diagnostics suppressions',
    },
    messages: {
      missingLintDescription:
        'Disable directive is missing a description. Add one after "--" (e.g., "// oxlint-disable-next-line rule-name -- reason here").',
      forbiddenEffectDiagnostics:
        '@effect-diagnostics comments escape --report-unused-disable-directives. Use "// oxlint-disable-next-line effecttsgo/<rule> -- reason here" instead.',
    },
  },
  create(context) {
    // A separator with nothing after it is not a description: `-- ` reads as
    // justified while saying nothing, which is the exact thing this rule exists
    // to prevent.
    const describedAfterDoubleDash = (text: string) => {
      const separator = text.indexOf('--');
      return separator !== -1 && text.slice(separator + 2).trim().length > 0;
    };
    const lintDisablePattern =
      /^\s*(eslint-disable|oxlint-disable)(-next-line|-line)?\b/;
    const effectDiagnosticsPattern =
      /^\s*@effect-diagnostics(-next-line)?(?:\s|$)/;

    return {
      Program() {
        const { sourceCode } = context;

        for (const comment of sourceCode.getAllComments()) {
          const text = comment.value.trim();
          // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- ESLint Comment type lacks loc/range but context.report accepts it
          const node = comment as unknown as Rule.Node;
          if (effectDiagnosticsPattern.test(text)) {
            context.report({ node, messageId: 'forbiddenEffectDiagnostics' });
          } else if (
            lintDisablePattern.test(text) &&
            !describedAfterDoubleDash(text)
          ) {
            context.report({ node, messageId: 'missingLintDescription' });
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
