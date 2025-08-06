# WebGL BufferGeometry Sphere Movement 示例

## 功能描述

这个示例演示了如何使用 Three.js 的 BufferGeometry 创建一个可以在平面内移动的球体。

## 主要特性

1. **BufferGeometry 使用**: 使用 Three.js 的 BufferGeometry 创建球体和平面几何体
2. **键盘控制**: 使用 WASD 键控制球体移动
3. **边界限制**: 球体被限制在平面边界内移动
4. **实时渲染**: 平滑的动画和实时响应
5. **阴影效果**: 包含阴影映射以增强视觉效果
6. **网格辅助**: 显示网格和坐标轴辅助线

## 控制方式

- **W**: 向前移动
- **S**: 向后移动
- **A**: 向左移动
- **D**: 向右移动

## 技术要点

### BufferGeometry 的使用

- 使用 `SphereGeometry` 创建球体
- 使用 `PlaneGeometry` 创建平面
- 所有几何体都基于 BufferGeometry

### 移动限制算法

```javascript
// 限制球在平面内移动
const boundary = planeSize - sphereRadius;
spherePosition.x = Math.max(-boundary, Math.min(boundary, spherePosition.x));
spherePosition.z = Math.max(-boundary, Math.min(boundary, spherePosition.z));
```

### 光照和阴影

- 环境光提供基础照明
- 方向光产生阴影效果
- 启用阴影映射

## 文件结构

- `webgl_buffergeometry_sphere_movement.html` - 主示例文件
- `README.md` - 本说明文件
- 依赖 Three.js 核心库和 Stats 模块

## 运行方式

1. 启动本地 HTTP 服务器（例如：`python -m http.server 8000`）
2. 在浏览器中访问：`http://localhost:8000/examples/custom/sphere_movement/webgl_buffergeometry_sphere_movement.html`
3. 或者通过 Three.js 示例索引页面的"custom"分类访问

## 扩展建议

1. 添加更多的几何体
2. 实现碰撞检测
3. 添加物理效果
4. 支持鼠标控制
5. 添加音效
6. 实现多个球体
7. 添加粒子效果

## 开发笔记

- 创建日期：2025-08-06
- 使用的 Three.js 版本：最新版本
- 兼容性：支持现代浏览器的 WebGL
- 性能：优化了渲染循环，使用 requestAnimationFrame
