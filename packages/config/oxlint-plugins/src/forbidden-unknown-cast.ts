// Flags all `as unknown as` casts - these bypass TypeScript's type system entirely.
// To allow a cast, add `oxlint-disable-next-line unknown-cast/forbidden -- <reason>`
// The require-disable-description plugin enforces that the reason is provided.

import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow double type assertions without explicit approval',
    },
    messages: {
      doubleAssertion:
        // Use concatenation to avoid triggering this rule on itself
        'Double type assertion (as' +
        ' unknown' +
        ' as) bypasses type safety. Add oxlint-disable with explanation if intentional.',
    },
  },
  create(context) {
    const castPattern = /as\s+unknown\s+as\b/g;

    return {
      Program() {
        const { sourceCode } = context;
        const text = sourceCode.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const lineNum = i + 1;

          // Skip comment lines
          if (
            line.trimStart().startsWith('//') ||
            line.trimStart().startsWith('*')
          ) {
            continue;
          }

          castPattern.lastIndex = 0;
          const match = castPattern.exec(line);

          if (match) {
            const col = match.index;
            context.report({
              messageId: 'doubleAssertion',
              loc: {
                start: { line: lineNum, column: col },
                end: { line: lineNum, column: col + match[0].length },
              },
            });
          }
        }
      },
    };
  },
};

const plugin = {
  meta: {
    name: 'unknown-cast',
  },
  rules: {
    forbidden: rule,
  },
};

export default plugin;
