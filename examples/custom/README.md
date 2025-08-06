# Custom Examples 自定义示例

这个文件夹包含用户自定义添加的 Three.js 示例，用于区分官方示例和个人创建的示例。

## 文件夹结构

```
examples/custom/
├── README.md                                    # 本说明文件
├── sphere_movement/                             # 球体移动示例文件夹
│   ├── webgl_buffergeometry_sphere_movement.html   # 球体移动示例
│   └── README.md                                    # 球体移动示例说明
└── [其他示例文件夹]/                            # 未来的其他示例
    ├── example.html
    └── README.md
```

## 二级文件夹组织原则

每个示例都有自己的子文件夹，包含：

- 主 HTML 文件
- README.md 说明文档
- 相关资源文件（如果有）

这样的结构便于：

- 管理多个示例
- 每个示例独立维护
- 避免文件名冲突
- 清晰的项目组织

## 添加新示例的步骤

当你想要添加新的自定义示例时，请按照以下步骤：

### 1. 创建示例文件夹

在 `examples/custom/` 下创建一个新的子文件夹，例如：

```bash
mkdir examples/custom/your_example_name
```

### 2. 创建 HTML 文件

将你的示例 HTML 文件放在新创建的子文件夹中。

### 3. 更新路径引用

由于文件在二级子文件夹中，需要调整相对路径：

```html
<!-- CSS引用 -->
<link type="text/css" rel="stylesheet" href="../../main.css" />

<!-- Import Map -->
<script type="importmap">
  {
    "imports": {
      "three": "../../../build/three.module.js",
      "three/addons/": "../../jsm/"
    }
  }
</script>
```

### 4. 更新配置文件

#### 更新 files.json

在 `examples/files.json` 的 `"custom"` 数组中添加你的示例：

```json
"custom": [
  "custom/sphere_movement/webgl_buffergeometry_sphere_movement",
  "custom/your_example_name/your_new_example"
]
```

#### 更新 tags.json

在 `examples/tags.json` 中为你的示例添加搜索标签：

```json
"custom/your_example_name/your_new_example": ["tag1", "tag2", "tag3"]
```

### 5. 添加截图

在 `examples/screenshots/` 文件夹中添加对应的截图文件：

- 文件名格式：`your_new_example.jpg`（不需要包含文件夹路径）
- 建议尺寸：与其他示例截图保持一致

## 命名规范

- HTML 文件名建议使用描述性的名称
- 使用下划线分隔单词
- 前缀可以表示示例类型（如 `webgl_`, `webgpu_`, `css3d_` 等）

## 示例模板

你可以参考现有的示例作为模板，特别是：

- `webgl_buffergeometry_sphere_movement.html` - 基础交互示例
- 其他官方示例 - 了解不同功能的实现方式

## 注意事项

1. **路径问题**：确保所有相对路径都正确指向上级目录的资源
2. **命名冲突**：避免与官方示例重名
3. **代码质量**：保持代码整洁和注释完整
4. **兼容性**：确保示例在主流浏览器中正常运行

## 维护

这个文件夹专门用于存放个人自定义的示例，与 Three.js 官方示例分离，便于：

- 版本控制管理
- 避免与官方更新冲突
- 清晰区分自定义内容

---

Happy coding! 🚀
