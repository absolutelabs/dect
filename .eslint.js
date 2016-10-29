// http://eslint.org/docs/rules/object-curly-spacing
module.exports = {
  'rules': {
    'space-before-function-paren': [
      'error',
      'never'
    ],
    'keyword-spacing': [
      2,
      {
        'before': true,
        'after': true
      }
    ],
    'semi': ['error', 'never'],
    'object-curly-spacing': [
      'error',
      'never',
    ],
    'prefer-const': ['error', {
      'destructuring': 'any',
      'ignoreReadBeforeAssign': false
    }],
    "space-infix-ops": ["error", {"int32Hint": false}]
  }
}
