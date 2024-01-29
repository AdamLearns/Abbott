export default {
  "**/src/*.{js,ts}": [
    "eslint --cache --max-warnings=0",
    "prettier --cache --write",
  ],
}
