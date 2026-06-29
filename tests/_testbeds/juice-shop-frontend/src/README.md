The original source content was truncated
after the initial angular compile process finished,
and the needed `dist/frontend/stats.json` was generated.

```shell
cd .../src
find . -type f ! -name "README.md" -exec sh -c ': > "$1"' _ {} \;
```
