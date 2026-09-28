import type { Rule } from 'eslint';

type Located = { loc: { start: { line: number }; end: { line: number } } };
type LocatedComment = Located & { value: string };

const reasonMarker = /\bdynamic-import\s+--\s+\S/u;

const isStatement = (node: Rule.Node) =>
  node.type.endsWith('Statement') ||
  node.type === 'VariableDeclaration' ||
  node.type === 'ExportNamedDeclaration' ||
  node.type === 'ExportDefaultDeclaration';

const enclosingStatement = (node: Rule.Node) => {
  let current: Rule.Node = node;
  while (current.parent && !isStatement(current)) {
    current = current.parent;
  }
  return current;
};

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require a dynamic-import -- reason comment for every dynamic import(); default to static imports.',
    },
    messages: {
      missingReason:
        'Dynamic import() needs a "dynamic-import -- reason" comment on the line above its statement, on ' +
        'the line above the import, or on the import itself, explaining why a ' +
        'static import will not do (code splitting, a lazy native module, an ' +
        'import cycle, an optional dependency).',
    },
  },
  create(context) {
    const comments = context.sourceCode.getAllComments() as LocatedComment[];

    return {
      ImportExpression(node) {
        const statement = enclosingStatement(node) as Located;
        const importNode = node as Located;
        const explained = comments.some(
          (comment) =>
            reasonMarker.test(comment.value) &&
            (comment.loc.end.line === statement.loc.start.line - 1 ||
              comment.loc.end.line === importNode.loc.start.line - 1 ||
              (comment.loc.start.line <= importNode.loc.end.line &&
                comment.loc.end.line >= importNode.loc.start.line)),
        );
        if (explained) return;
        context.report({ node, messageId: 'missingReason' });
      },
    };
  },
};

const plugin = {
  meta: {
    name: 'dynamic-import',
  },
  rules: {
    'no-unexplained-dynamic-import': rule,
  },
};

export default plugin;
