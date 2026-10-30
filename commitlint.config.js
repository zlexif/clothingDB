export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['directory', 'studio', 'docs', 'homepage', 'changelog', 'render', 'exporter', 'cdn', 'ui', 'deps'],
    ],
    'subject-max-length': [2, 'always', 72],
    'subject-full-stop': [2, 'never', '.'],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
