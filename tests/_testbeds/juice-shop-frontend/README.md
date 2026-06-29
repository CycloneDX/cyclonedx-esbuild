# showcase running as CLI for Juice-Shop Frontend

source code fetched folder `frontend` from <https://github.com/juice-shop/juice-shop/archive/50630aaabdb527fbb1cba7c19b9cd3406de74bcc.tar.gz>

The original source content was truncated
after the initial angular compile process finished,
and the needed `dist/frontend/stats.json` was generated.

```shell
cd ...
find src -type f -exec sh -c 'echo "$1"; : > "$1"' _ {} \;
```
