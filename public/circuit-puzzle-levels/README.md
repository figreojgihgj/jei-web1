# Circuit Puzzle 题目收录目录规范

## 目录结构

```text
public/
  circuit-puzzle-levels/
    index.json
    your-level.json
    your-level.md
```

## index.json 格式

```json
{
  "version": 1,
  "title": "Circuit Puzzle 题目收录",
  "basePath": "/circuit-puzzle-levels",
  "entries": [
    {
      "id": "your-level-id",
      "title": "你的题目名",
      "json": "your-level.json",
      "markdown": "your-level.md",
      "difficulty": "normal",
      "author": "your-name",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

`json` 为必填，`markdown` 为可选。

## 目录批量收录（新增）

当一个目录下有大量关卡时，可用 `directory` 代替 `json`：

```json
{
  "id": "type2-all",
  "title": "Type2 全量题库",
  "directory": "file_type2",
  "tags": ["type2", "batch"]
}
```

- `directory` 会自动尝试加载：
1. `${directory}/minigame_puzzle.json`（会展开为多条题目）
2. `${directory}/index.json`（作为子索引）
