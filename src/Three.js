/**
 * Three.js - JavaScript 3D 图形库
 *
 * 这是 Three.js 的主入口文件，导出了完整的 Three.js API。
 * 包含核心功能、WebGL 渲染器、着色器系统和相关工具。
 *
 * Three.js 是一个跨浏览器的 JavaScript 库，用于在网页上创建和显示动画的 3D 计算机图形。
 * 它使用 WebGL 技术，提供了简单易用的 API 来创建复杂的 3D 场景。
 *
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author dmarcos / https://github.com/dmarcos
 * @author rich-harris / https://github.com/Rich-Harris
 * @author WestLangley / http://github.com/WestLangley
 * @author bhouston / http://clara.io/
 * @author tschw / https://github.com/tschw
 */

// 导出 Three.js 核心模块的所有功能
// 包括数学库、几何体、材质、光源、相机、动画系统等核心组件
export * from "./Three.Core.js";

// ============================================================================
// WebGL 渲染系统
// ============================================================================

// WebGL 渲染器 - Three.js 的主要渲染引擎
// 负责将 3D 场景渲染到 HTML5 Canvas 元素上
export { WebGLRenderer } from "./renderers/WebGLRenderer.js";

// 着色器库 - 包含 Three.js 内置的各种着色器程序
// 提供标准材质、物理材质等的着色器实现
export { ShaderLib } from "./renderers/shaders/ShaderLib.js";

// 统一变量库 - 管理着色器中的统一变量（uniforms）
// 包含光照、材质、变换矩阵等常用统一变量的定义
export { UniformsLib } from "./renderers/shaders/UniformsLib.js";

// 统一变量工具 - 提供统一变量的合并、克隆等实用功能
// 用于动态组合和管理着色器的统一变量
export { UniformsUtils } from "./renderers/shaders/UniformsUtils.js";

// 着色器代码块 - 包含可重用的着色器代码片段
// 提供常用的着色器函数和代码块，用于构建复杂的着色器程序
export { ShaderChunk } from "./renderers/shaders/ShaderChunk.js";

// 预过滤多分辨率环境贴图生成器
// 用于生成基于物理的渲染（PBR）所需的环境贴图
export { PMREMGenerator } from "./extras/PMREMGenerator.js";

// WebGL 工具类 - 提供 WebGL 相关的实用工具函数
// 包括 WebGL 上下文检测、扩展支持检查等功能
export { WebGLUtils } from "./renderers/webgl/WebGLUtils.js";
