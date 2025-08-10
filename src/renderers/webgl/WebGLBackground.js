// 导入必要的常量和类
import { BackSide, FrontSide, CubeUVReflectionMapping, SRGBTransfer } from "../../constants.js";
import { BoxGeometry } from "../../geometries/BoxGeometry.js";
import { PlaneGeometry } from "../../geometries/PlaneGeometry.js";
import { ShaderMaterial } from "../../materials/ShaderMaterial.js";
import { Color } from "../../math/Color.js";
import { ColorManagement } from "../../math/ColorManagement.js";
import { Euler } from "../../math/Euler.js";
import { Matrix4 } from "../../math/Matrix4.js";
import { Mesh } from "../../objects/Mesh.js";
import { ShaderLib } from "../shaders/ShaderLib.js";
import { cloneUniforms, getUnlitUniformColorSpace } from "../shaders/UniformsUtils.js";

// 全局变量：用于临时存储RGB颜色值
const _rgb = { r: 0, b: 0, g: 0 };
// 全局变量：用于临时存储欧拉角
const _e1 = /*@__PURE__*/ new Euler();
// 全局变量：用于临时存储4x4矩阵
const _m1 = /*@__PURE__*/ new Matrix4();

/**
 * WebGL背景渲染器
 * 负责处理场景背景的渲染，包括纯色背景、纹理背景和立方体贴图背景
 *
 * @param {WebGLRenderer} renderer - WebGL渲染器实例
 * @param {WebGLCubeMaps} cubemaps - 立方体贴图管理器
 * @param {WebGLCubeUVMaps} cubeuvmaps - 立方体UV贴图管理器
 * @param {WebGLState} state - WebGL状态管理器
 * @param {WebGLObjects} objects - WebGL对象管理器
 * @param {boolean} alpha - 是否启用透明度
 * @param {boolean} premultipliedAlpha - 是否使用预乘透明度
 */
function WebGLBackground(renderer, cubemaps, cubeuvmaps, state, objects, alpha, premultipliedAlpha) {
  // 默认清除颜色（黑色）
  const clearColor = new Color(0x000000);
  // 清除透明度值：如果启用alpha则为0（完全透明），否则为1（不透明）
  let clearAlpha = alpha === true ? 0 : 1;

  // 平面网格：用于渲染2D纹理背景
  let planeMesh;
  // 立方体网格：用于渲染立方体贴图背景
  let boxMesh;

  // 当前背景对象的引用
  let currentBackground = null;
  // 当前背景的版本号，用于检测背景是否发生变化
  let currentBackgroundVersion = 0;
  // 当前色调映射模式
  let currentTonemapping = null;

  /**
   * 获取场景的背景
   * @param {Scene} scene - 场景对象
   * @returns {Color|Texture|CubeTexture|null} 背景对象
   */
  function getBackground(scene) {
    // 只有Scene对象才有background属性
    let background = scene.isScene === true ? scene.background : null;

    // 如果背景是纹理类型
    if (background && background.isTexture) {
      // 如果场景设置了背景模糊，使用PMREM（预过滤的辐射环境贴图）
      const usePMREM = scene.backgroundBlurriness > 0; // use PMREM if the user wants to blur the background
      // 根据是否需要模糊选择相应的贴图管理器
      background = (usePMREM ? cubeuvmaps : cubemaps).get(background);
    }

    return background;
  }

  /**
   * 渲染背景
   * 处理不同类型的背景渲染，包括纯色背景和XR环境混合模式
   * @param {Scene} scene - 要渲染的场景
   */
  function render(scene) {
    let forceClear = false;
    const background = getBackground(scene);

    // 根据背景类型设置清除颜色
    if (background === null) {
      // 没有背景时使用默认清除颜色
      setClear(clearColor, clearAlpha);
    } else if (background && background.isColor) {
      // 背景是纯色时，设置为该颜色并强制清除
      setClear(background, 1);
      forceClear = true;
    }

    // 获取XR环境混合模式
    const environmentBlendMode = renderer.xr.getEnvironmentBlendMode();

    // 根据XR环境混合模式调整清除颜色
    if (environmentBlendMode === "additive") {
      // 加法混合模式：设置为黑色不透明
      state.buffers.color.setClear(0, 0, 0, 1, premultipliedAlpha);
    } else if (environmentBlendMode === "alpha-blend") {
      // Alpha混合模式：设置为黑色透明
      state.buffers.color.setClear(0, 0, 0, 0, premultipliedAlpha);
    }

    // 如果启用了自动清除或需要强制清除
    if (renderer.autoClear || forceClear) {
      // 缓冲区可能不可写，这是确保正确清除所必需的

      // 启用深度测试和写入
      state.buffers.depth.setTest(true);
      state.buffers.depth.setMask(true);
      // 启用颜色缓冲区写入
      state.buffers.color.setMask(true);

      // 执行清除操作
      renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
    }
  }

  /**
   * 将背景添加到渲染列表
   * 根据背景类型创建相应的网格对象并添加到渲染队列
   * @param {Array} renderList - 渲染列表
   * @param {Scene} scene - 场景对象
   */
  function addToRenderList(renderList, scene) {
    const background = getBackground(scene);

    // 处理立方体纹理背景或立方体UV反射映射
    if (background && (background.isCubeTexture || background.mapping === CubeUVReflectionMapping)) {
      // 如果立方体网格尚未创建，则创建它
      if (boxMesh === undefined) {
        boxMesh = new Mesh(
          // 创建单位立方体几何体
          new BoxGeometry(1, 1, 1),
          // 创建背景立方体材质
          new ShaderMaterial({
            name: "BackgroundCubeMaterial",
            uniforms: cloneUniforms(ShaderLib.backgroundCube.uniforms),
            vertexShader: ShaderLib.backgroundCube.vertexShader,
            fragmentShader: ShaderLib.backgroundCube.fragmentShader,
            side: BackSide, // 渲染内侧面
            depthTest: false, // 禁用深度测试
            depthWrite: false, // 禁用深度写入
            fog: false, // 不受雾效影响
            allowOverride: false, // 不允许材质覆盖
          })
        );

        // 删除法线和UV属性（背景不需要）
        boxMesh.geometry.deleteAttribute("normal");
        boxMesh.geometry.deleteAttribute("uv");

        // 设置渲染前回调：将立方体位置设置为相机位置
        boxMesh.onBeforeRender = function (renderer, scene, camera) {
          this.matrixWorld.copyPosition(camera.matrixWorld);
        };

        // 添加"envMap"材质属性，使渲染器能够像处理内置材质一样评估它
        Object.defineProperty(boxMesh.material, "envMap", {
          get: function () {
            return this.uniforms.envMap.value;
          },
        });

        // 更新对象管理器中的网格
        objects.update(boxMesh);
      }

      // 复制场景的背景旋转
      _e1.copy(scene.backgroundRotation);

      // 适应左手坐标系
      _e1.x *= -1;
      _e1.y *= -1;
      _e1.z *= -1;

      // 对于非渲染目标的立方体纹理，需要额外的坐标调整
      if (background.isCubeTexture && background.isRenderTargetTexture === false) {
        // 非立方体渲染目标或PMREM的环境贴图遵循不同的约定
        _e1.y *= -1;
        _e1.z *= -1;
      }

      // 设置材质的uniform变量
      boxMesh.material.uniforms.envMap.value = background; // 环境贴图
      boxMesh.material.uniforms.flipEnvMap.value = background.isCubeTexture && background.isRenderTargetTexture === false ? -1 : 1; // 翻转环境贴图
      boxMesh.material.uniforms.backgroundBlurriness.value = scene.backgroundBlurriness; // 背景模糊度
      boxMesh.material.uniforms.backgroundIntensity.value = scene.backgroundIntensity; // 背景强度
      boxMesh.material.uniforms.backgroundRotation.value.setFromMatrix4(_m1.makeRotationFromEuler(_e1)); // 背景旋转矩阵
      // 根据颜色空间设置色调映射
      boxMesh.material.toneMapped = ColorManagement.getTransfer(background.colorSpace) !== SRGBTransfer;

      // 检查是否需要更新材质
      if (currentBackground !== background || currentBackgroundVersion !== background.version || currentTonemapping !== renderer.toneMapping) {
        boxMesh.material.needsUpdate = true;

        // 更新当前状态
        currentBackground = background;
        currentBackgroundVersion = background.version;
        currentTonemapping = renderer.toneMapping;
      }

      // 启用所有图层
      boxMesh.layers.enableAll();

      // 将立方体网格添加到预排序的不透明渲染列表的开头
      renderList.unshift(boxMesh, boxMesh.geometry, boxMesh.material, 0, 0, null);
    } else if (background && background.isTexture) {
      // 处理2D纹理背景
      if (planeMesh === undefined) {
        planeMesh = new Mesh(
          // 创建2x2的平面几何体（覆盖整个屏幕）
          new PlaneGeometry(2, 2),
          // 创建背景材质
          new ShaderMaterial({
            name: "BackgroundMaterial",
            uniforms: cloneUniforms(ShaderLib.background.uniforms),
            vertexShader: ShaderLib.background.vertexShader,
            fragmentShader: ShaderLib.background.fragmentShader,
            side: FrontSide, // 渲染正面
            depthTest: false, // 禁用深度测试
            depthWrite: false, // 禁用深度写入
            fog: false, // 不受雾效影响
            allowOverride: false, // 不允许材质覆盖
          })
        );

        // 删除法线属性（背景平面不需要）
        planeMesh.geometry.deleteAttribute("normal");

        // 添加"map"材质属性，使渲染器能够像处理内置材质一样评估它
        Object.defineProperty(planeMesh.material, "map", {
          get: function () {
            return this.uniforms.t2D.value;
          },
        });

        // 更新对象管理器中的网格
        objects.update(planeMesh);
      }

      // 设置材质的uniform变量
      planeMesh.material.uniforms.t2D.value = background; // 2D纹理
      planeMesh.material.uniforms.backgroundIntensity.value = scene.backgroundIntensity; // 背景强度
      // 根据颜色空间设置色调映射
      planeMesh.material.toneMapped = ColorManagement.getTransfer(background.colorSpace) !== SRGBTransfer;

      // 如果纹理启用了自动矩阵更新，则更新其变换矩阵
      if (background.matrixAutoUpdate === true) {
        background.updateMatrix();
      }

      // 设置UV变换矩阵
      planeMesh.material.uniforms.uvTransform.value.copy(background.matrix);

      // 检查是否需要更新材质
      if (currentBackground !== background || currentBackgroundVersion !== background.version || currentTonemapping !== renderer.toneMapping) {
        planeMesh.material.needsUpdate = true;

        // 更新当前状态
        currentBackground = background;
        currentBackgroundVersion = background.version;
        currentTonemapping = renderer.toneMapping;
      }

      // 启用所有图层
      planeMesh.layers.enableAll();

      // 将平面网格添加到预排序的不透明渲染列表的开头
      renderList.unshift(planeMesh, planeMesh.geometry, planeMesh.material, 0, 0, null);
    }
  }

  /**
   * 设置清除颜色
   * @param {Color} color - 颜色对象
   * @param {number} alpha - 透明度值
   */
  function setClear(color, alpha) {
    // 获取RGB颜色值，使用未照明的uniform颜色空间
    color.getRGB(_rgb, getUnlitUniformColorSpace(renderer));

    // 设置颜色缓冲区的清除值
    state.buffers.color.setClear(_rgb.r, _rgb.g, _rgb.b, alpha, premultipliedAlpha);
  }

  /**
   * 释放资源
   * 清理所有创建的网格对象和材质
   */
  function dispose() {
    // 释放立方体网格资源
    if (boxMesh !== undefined) {
      boxMesh.geometry.dispose();
      boxMesh.material.dispose();

      boxMesh = undefined;
    }

    // 释放平面网格资源
    if (planeMesh !== undefined) {
      planeMesh.geometry.dispose();
      planeMesh.material.dispose();

      planeMesh = undefined;
    }
  }

  // 返回公共API对象
  return {
    /**
     * 获取当前清除颜色
     * @returns {Color} 清除颜色
     */
    getClearColor: function () {
      return clearColor;
    },
    /**
     * 设置清除颜色
     * @param {Color} color - 新的清除颜色
     * @param {number} alpha - 透明度值，默认为1
     */
    setClearColor: function (color, alpha = 1) {
      clearColor.set(color);
      clearAlpha = alpha;
      setClear(clearColor, clearAlpha);
    },
    /**
     * 获取当前清除透明度
     * @returns {number} 清除透明度值
     */
    getClearAlpha: function () {
      return clearAlpha;
    },
    /**
     * 设置清除透明度
     * @param {number} alpha - 新的透明度值
     */
    setClearAlpha: function (alpha) {
      clearAlpha = alpha;
      setClear(clearColor, clearAlpha);
    },
    render: render,
    addToRenderList: addToRenderList,
    dispose: dispose,
  };
}

export { WebGLBackground };
