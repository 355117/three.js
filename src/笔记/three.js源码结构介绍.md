# Three.js 源码结构介绍

## 概述

Three.js 是一个基于 WebGL 的 JavaScript 3D 图形库，提供了丰富的 3D 渲染功能。本文档介绍了 Three.js 源码的组织结构和各个模块的作用。

## 主要入口文件

### Three.js

- **路径**: `src/Three.js`
- **作用**: 主要入口文件，导出 WebGL 相关的渲染器和工具
- **包含**: WebGLRenderer、着色器库、工具函数等

### Three.Core.js

- **路径**: `src/Three.Core.js`
- **作用**: 核心模块入口，导出所有核心功能类
- **包含**: 场景、对象、纹理、几何体、材质、加载器、灯光、相机、音频、动画、核心类等

### 其他入口文件

- `Three.Legacy.js`: 兼容旧版本的功能
- `Three.TSL.js`: Three.js Shading Language 相关
- `Three.WebGPU.js`: WebGPU 渲染器
- `Three.WebGPU.Nodes.js`: WebGPU 节点系统

## 核心模块结构

### 1. 核心基础 (core/)

**作用**: 提供 Three.js 的基础架构和核心类

主要文件:

- `Object3D.js`: 3D 对象基类，所有 3D 对象的父类
- `BufferGeometry.js`: 缓冲几何体，高效的几何数据存储
- `BufferAttribute.js`: 缓冲属性，存储顶点数据
- `EventDispatcher.js`: 事件分发器
- `Raycaster.js`: 射线投射，用于拾取和碰撞检测
- `Clock.js`: 时钟，用于动画计时
- `Layers.js`: 图层管理
- `Uniform.js`: 着色器统一变量

### 2. 数学库 (math/)

**作用**: 提供 3D 数学运算的基础类

主要文件:

- `Vector2.js`, `Vector3.js`, `Vector4.js`: 向量类
- `Matrix3.js`, `Matrix4.js`: 矩阵类
- `Quaternion.js`: 四元数，用于旋转
- `Euler.js`: 欧拉角
- `Color.js`: 颜色处理
- `Box2.js`, `Box3.js`: 包围盒
- `Plane.js`, `Sphere.js`: 几何形状
- `Ray.js`: 射线
- `MathUtils.js`: 数学工具函数

### 3. 几何体 (geometries/)

**作用**: 提供各种预定义的几何体

主要文件:

- `BoxGeometry.js`: 立方体几何体
- `SphereGeometry.js`: 球体几何体
- `PlaneGeometry.js`: 平面几何体
- `CylinderGeometry.js`: 圆柱体几何体
- `ConeGeometry.js`: 圆锥体几何体
- `TorusGeometry.js`: 圆环几何体
- `ExtrudeGeometry.js`: 挤压几何体
- `LatheGeometry.js`: 车床几何体

### 4. 材质 (materials/)

**作用**: 定义物体的外观和渲染属性

主要文件:

- `Material.js`: 材质基类
- `MeshBasicMaterial.js`: 基础网格材质
- `MeshStandardMaterial.js`: 标准网格材质（PBR）
- `MeshPhysicalMaterial.js`: 物理网格材质
- `MeshLambertMaterial.js`: Lambert 材质
- `MeshPhongMaterial.js`: Phong 材质
- `ShaderMaterial.js`: 自定义着色器材质
- `PointsMaterial.js`: 点材质
- `LineMaterial.js`: 线材质

### 5. 纹理 (textures/)

**作用**: 处理纹理贴图和图像数据

主要文件:

- `Texture.js`: 纹理基类
- `DataTexture.js`: 数据纹理
- `CubeTexture.js`: 立方体纹理
- `VideoTexture.js`: 视频纹理
- `CanvasTexture.js`: Canvas 纹理
- `CompressedTexture.js`: 压缩纹理

### 6. 灯光 (lights/)

**作用**: 提供各种光源类型

主要文件:

- `Light.js`: 光源基类
- `AmbientLight.js`: 环境光
- `DirectionalLight.js`: 平行光
- `PointLight.js`: 点光源
- `SpotLight.js`: 聚光灯
- `HemisphereLight.js`: 半球光
- `RectAreaLight.js`: 矩形区域光

### 7. 相机 (cameras/)

**作用**: 定义观察视角和投影方式

主要文件:

- `Camera.js`: 相机基类
- `PerspectiveCamera.js`: 透视相机
- `OrthographicCamera.js`: 正交相机
- `CubeCamera.js`: 立方体相机
- `ArrayCamera.js`: 相机数组
- `StereoCamera.js`: 立体相机

### 8. 对象 (objects/)

**作用**: 定义可渲染的 3D 对象类型

主要文件:

- `Mesh.js`: 网格对象
- `Group.js`: 对象组
- `Line.js`: 线对象
- `Points.js`: 点对象
- `Sprite.js`: 精灵对象
- `SkinnedMesh.js`: 蒙皮网格
- `InstancedMesh.js`: 实例化网格
- `BatchedMesh.js`: 批处理网格

### 9. 场景 (scenes/)

**作用**: 管理 3D 场景

主要文件:

- `Scene.js`: 场景类
- `Fog.js`: 线性雾效
- `FogExp2.js`: 指数雾效

### 10. 渲染器 (renderers/)

**作用**: 负责将 3D 场景渲染到屏幕

主要目录:

- `WebGLRenderer.js`: WebGL 渲染器主文件
- `webgl/`: WebGL 相关实现
- `webgpu/`: WebGPU 相关实现
- `shaders/`: 着色器库
- `webxr/`: WebXR 支持

### 11. 加载器 (loaders/)

**作用**: 加载各种格式的 3D 资源

主要文件:

- `Loader.js`: 加载器基类
- `FileLoader.js`: 文件加载器
- `TextureLoader.js`: 纹理加载器
- `ObjectLoader.js`: 对象加载器
- `MaterialLoader.js`: 材质加载器
- `BufferGeometryLoader.js`: 几何体加载器
- `LoadingManager.js`: 加载管理器

### 12. 动画 (animation/)

**作用**: 处理 3D 动画

主要文件:

- `AnimationClip.js`: 动画片段
- `AnimationMixer.js`: 动画混合器
- `AnimationAction.js`: 动画动作
- `KeyframeTrack.js`: 关键帧轨道
- `PropertyBinding.js`: 属性绑定

### 13. 音频 (audio/)

**作用**: 3D 音频处理

主要文件:

- `Audio.js`: 音频基类
- `PositionalAudio.js`: 位置音频
- `AudioListener.js`: 音频监听器
- `AudioAnalyser.js`: 音频分析器

### 14. 辅助工具 (helpers/)

**作用**: 提供调试和可视化辅助工具

主要文件:

- `AxesHelper.js`: 坐标轴辅助器
- `GridHelper.js`: 网格辅助器
- `BoxHelper.js`: 包围盒辅助器
- `CameraHelper.js`: 相机辅助器
- 各种光源辅助器

### 15. 扩展功能 (extras/)

**作用**: 额外的工具和功能

主要文件:

- `Controls.js`: 控制器
- `PMREMGenerator.js`: 预过滤环境贴图生成器
- `ImageUtils.js`: 图像工具
- `ShapeUtils.js`: 形状工具
- `curves/`: 曲线相关
- `core/`: 扩展核心功能

### 16. 节点系统 (nodes/)

**作用**: 基于节点的着色器系统（新特性）

主要目录:

- `core/`: 节点核心
- `math/`: 数学节点
- `lighting/`: 光照节点
- `materials/`: 材质节点
- `functions/`: 函数节点

## 工具文件

- `constants.js`: 常量定义
- `utils.js`: 通用工具函数

## WebGL 状态管理代码位置

### 主要 WebGL 状态管理文件

#### 1. WebGLState.js (传统 WebGL 渲染器)

- **路径**: `src/renderers/webgl/WebGLState.js`
- **作用**: WebGL 1.0/2.0 渲染器的状态管理核心
- **主要功能**:
  - 缓存 WebGL 状态以减少状态切换
  - 管理混合模式、深度测试、模板测试
  - 处理视口、裁剪区域设置
  - 纹理绑定和激活管理
  - 顶点数组对象(VAO)管理

#### 2. WebGLState.js (WebGL-Fallback)

- **路径**: `src/renderers/webgl-fallback/utils/WebGLState.js`
- **作用**: WebGL 2.0 后端的状态管理工具
- **特点**:
  - 面向对象设计的状态管理类
  - 更现代化的状态缓存机制
  - 支持 WebGPU 兼容的状态管理

#### 3. WebGLBindingStates.js

- **路径**: `src/renderers/webgl/WebGLBindingStates.js`
- **作用**: 顶点属性绑定状态管理
- **主要功能**:
  - VAO (Vertex Array Object) 创建和绑定
  - 顶点属性状态缓存
  - 几何体和着色器程序的绑定状态

#### 4. WebGLRenderStates.js

- **路径**: `src/renderers/webgl/WebGLRenderStates.js`
- **作用**: 渲染状态管理
- **主要功能**:
  - 光照状态管理
  - 阴影状态管理
  - 场景渲染状态缓存

### 状态管理的核心概念

1. **状态缓存**: 避免重复的 WebGL 状态调用
2. **状态切换优化**: 只在必要时更改 WebGL 状态
3. **批处理优化**: 减少 draw call 和状态切换
4. **资源绑定管理**: 纹理、缓冲区、着色器程序的绑定状态

### 相关的其他状态管理文件

- `WebGLCapabilities.js`: WebGL 能力检测和限制
- `WebGLExtensions.js`: WebGL 扩展管理
- `WebGLTextures.js`: 纹理状态管理
- `WebGLPrograms.js`: 着色器程序状态管理
- `WebGLAttributes.js`: 顶点属性管理

## 总结

Three.js 的源码结构清晰，模块化程度高，每个目录都有明确的职责：

- **core**: 提供基础架构
- **math**: 数学运算支持
- **geometries/materials/textures**: 3D 资源定义
- **lights/cameras**: 场景元素
- **objects/scenes**: 场景组织
- **renderers**: 渲染实现，包含复杂的 WebGL 状态管理
- **loaders**: 资源加载
- **animation/audio**: 动态效果
- **helpers/extras**: 辅助功能

WebGL 状态管理是 Three.js 渲染性能的关键，通过智能的状态缓存和优化减少了不必要的 WebGL API 调用，这种设计使得 Three.js 既功能强大又易于扩展和维护。
