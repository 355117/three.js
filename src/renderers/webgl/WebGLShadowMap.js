// 导入必要的常量和类
import { FrontSide, BackSide, DoubleSide, NearestFilter, PCFShadowMap, VSMShadowMap, RGBADepthPacking, NoBlending } from "../../constants.js";
import { WebGLRenderTarget } from "../WebGLRenderTarget.js";
import { MeshDepthMaterial } from "../../materials/MeshDepthMaterial.js";
import { MeshDistanceMaterial } from "../../materials/MeshDistanceMaterial.js";
import { ShaderMaterial } from "../../materials/ShaderMaterial.js";
import { BufferAttribute } from "../../core/BufferAttribute.js";
import { BufferGeometry } from "../../core/BufferGeometry.js";
import { Mesh } from "../../objects/Mesh.js";
import { Vector4 } from "../../math/Vector4.js";
import { Vector2 } from "../../math/Vector2.js";
import { Frustum } from "../../math/Frustum.js";

// 导入VSM（方差阴影贴图）着色器
import * as vsm from "../shaders/ShaderLib/vsm.glsl.js";

/**
 * WebGL阴影贴图管理器
 * 负责处理所有类型的阴影渲染，包括PCF、VSM等不同的阴影技术
 * 这是Three.js阴影系统的核心组件，管理阴影贴图的创建、更新和渲染
 *
 * @param {WebGLRenderer} renderer - WebGL渲染器实例
 * @param {WebGLObjects} objects - WebGL对象管理器
 * @param {Object} capabilities - WebGL能力对象
 */
function WebGLShadowMap(renderer, objects, capabilities) {
  // 视锥体对象，用于阴影投射的视锥剔除
  let _frustum = new Frustum();

  // 阴影贴图尺寸（考虑帧扩展后的实际尺寸）
  const _shadowMapSize = new Vector2(),
    // 视口尺寸（基础阴影贴图尺寸）
    _viewportSize = new Vector2(),
    // 当前渲染视口（x, y, width, height）
    _viewport = new Vector4(),
    // 深度材质，用于渲染深度信息到阴影贴图
    _depthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking }),
    // 距离材质，用于点光源的立方体阴影贴图
    _distanceMaterial = new MeshDistanceMaterial(),
    // 材质缓存，存储为特定需求创建的材质变体
    _materialCache = {},
    // GPU支持的最大纹理尺寸
    _maxTextureSize = capabilities.maxTextureSize;

  // 阴影渲染时的面剔除映射表
  // 为了避免阴影痤疮（shadow acne），通常渲染背面到阴影贴图
  const shadowSide = { [FrontSide]: BackSide, [BackSide]: FrontSide, [DoubleSide]: DoubleSide };

  // VSM（方差阴影贴图）垂直模糊材质
  const shadowMaterialVertical = new ShaderMaterial({
    defines: {
      VSM_SAMPLES: 8, // VSM采样数量，影响模糊质量
    },
    uniforms: {
      shadow_pass: { value: null }, // 输入的阴影贴图纹理
      resolution: { value: new Vector2() }, // 阴影贴图分辨率
      radius: { value: 4.0 }, // 模糊半径
    },

    vertexShader: vsm.vertex, // VSM顶点着色器
    fragmentShader: vsm.fragment, // VSM片段着色器
  });

  // VSM水平模糊材质（克隆垂直材质并添加水平标志）
  const shadowMaterialHorizontal = shadowMaterialVertical.clone();
  shadowMaterialHorizontal.defines.HORIZONTAL_PASS = 1; // 定义水平通道标志

  // 全屏三角形几何体，用于VSM后处理
  // 使用单个大三角形覆盖整个屏幕，比四边形更高效
  const fullScreenTri = new BufferGeometry();
  fullScreenTri.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0.5, 3, -1, 0.5, -1, 3, 0.5]), 3)); // 三个顶点坐标

  // 全屏网格，用于执行VSM模糊通道
  const fullScreenMesh = new Mesh(fullScreenTri, shadowMaterialVertical);

  // 保存this引用，用于内部函数访问
  const scope = this;

  // 是否启用阴影渲染
  this.enabled = false;

  // 是否自动更新阴影贴图
  this.autoUpdate = true;
  // 是否需要更新阴影贴图（手动控制）
  this.needsUpdate = false;

  // 阴影贴图类型（PCF、VSM等）
  this.type = PCFShadowMap;
  // 上一帧的阴影类型，用于检测类型变化
  let _previousType = this.type;

  /**
   * 渲染阴影贴图
   * 这是阴影系统的主要入口函数，负责渲染所有灯光的阴影贴图
   *
   * @param {Array} lights - 投射阴影的灯光数组
   * @param {Scene} scene - 要渲染阴影的场景
   * @param {Camera} camera - 主相机（用于某些计算）
   */
  this.render = function (lights, scene, camera) {
    // 如果阴影未启用，直接返回
    if (scope.enabled === false) return;
    // 如果不自动更新且不需要更新，直接返回
    if (scope.autoUpdate === false && scope.needsUpdate === false) return;

    // 如果没有灯光，直接返回
    if (lights.length === 0) return;

    // 保存当前渲染状态，以便后续恢复
    const currentRenderTarget = renderer.getRenderTarget(); // 当前渲染目标
    const activeCubeFace = renderer.getActiveCubeFace(); // 当前立方体面
    const activeMipmapLevel = renderer.getActiveMipmapLevel(); // 当前mipmap级别

    // 获取渲染器状态管理器
    const _state = renderer.state;

    // 设置深度贴图渲染的GL状态
    _state.setBlending(NoBlending); // 禁用混合，阴影渲染不需要混合

    // 根据深度缓冲区是否反转设置清除颜色
    if (_state.buffers.depth.getReversed() === true) {
      // 反转深度：远处为0，近处为1，清除为黑色
      _state.buffers.color.setClear(0, 0, 0, 0);
    } else {
      // 标准深度：近处为0，远处为1，清除为白色
      _state.buffers.color.setClear(1, 1, 1, 1);
    }

    // 启用深度测试，阴影渲染需要深度信息
    _state.buffers.depth.setTest(true);
    // 禁用裁剪测试，确保整个阴影贴图都被渲染
    _state.setScissorTest(false);

    // 检查阴影贴图类型是否发生变化

    // 是否从其他类型切换到VSM
    const toVSM = _previousType !== VSMShadowMap && this.type === VSMShadowMap;
    // 是否从VSM切换到其他类型
    const fromVSM = _previousType === VSMShadowMap && this.type !== VSMShadowMap;

    // 渲染深度贴图

    // 遍历所有投射阴影的灯光
    for (let i = 0, il = lights.length; i < il; i++) {
      const light = lights[i]; // 当前灯光对象
      const shadow = light.shadow; // 灯光的阴影对象

      // 检查灯光是否有阴影配置
      if (shadow === undefined) {
        console.warn("THREE.WebGLShadowMap:", light, "has no shadow.");
        continue; // 跳过没有阴影的灯光
      }

      // 检查阴影是否需要更新
      if (shadow.autoUpdate === false && shadow.needsUpdate === false) continue;

      // 复制阴影贴图的基础尺寸
      _shadowMapSize.copy(shadow.mapSize);

      // 获取阴影帧扩展（用于级联阴影或多视口阴影）
      const shadowFrameExtents = shadow.getFrameExtents();

      // 计算实际的阴影贴图尺寸（基础尺寸 × 帧扩展）
      _shadowMapSize.multiply(shadowFrameExtents);

      // 视口尺寸等于基础贴图尺寸
      _viewportSize.copy(shadow.mapSize);

      // 检查阴影贴图尺寸是否超过GPU限制
      if (_shadowMapSize.x > _maxTextureSize || _shadowMapSize.y > _maxTextureSize) {
        // 如果X方向超过限制
        if (_shadowMapSize.x > _maxTextureSize) {
          // 计算调整后的视口尺寸
          _viewportSize.x = Math.floor(_maxTextureSize / shadowFrameExtents.x);
          // 重新计算阴影贴图尺寸
          _shadowMapSize.x = _viewportSize.x * shadowFrameExtents.x;
          // 更新阴影对象的贴图尺寸
          shadow.mapSize.x = _viewportSize.x;
        }

        // 如果Y方向超过限制
        if (_shadowMapSize.y > _maxTextureSize) {
          // 计算调整后的视口尺寸
          _viewportSize.y = Math.floor(_maxTextureSize / shadowFrameExtents.y);
          // 重新计算阴影贴图尺寸
          _shadowMapSize.y = _viewportSize.y * shadowFrameExtents.y;
          // 更新阴影对象的贴图尺寸
          shadow.mapSize.y = _viewportSize.y;
        }
      }

      // 检查是否需要创建或重新创建阴影贴图
      if (shadow.map === null || toVSM === true || fromVSM === true) {
        // 根据阴影类型设置纹理参数
        const pars = this.type !== VSMShadowMap ? { minFilter: NearestFilter, magFilter: NearestFilter } : {};

        // 如果已有阴影贴图，先释放它
        if (shadow.map !== null) {
          shadow.map.dispose();
        }

        // 创建新的阴影贴图渲染目标
        shadow.map = new WebGLRenderTarget(_shadowMapSize.x, _shadowMapSize.y, pars);
        // 设置纹理名称，便于调试
        shadow.map.texture.name = light.name + ".shadowMap";

        // 更新阴影相机的投影矩阵
        shadow.camera.updateProjectionMatrix();
      }

      // 设置渲染目标为阴影贴图
      renderer.setRenderTarget(shadow.map);
      // 清除阴影贴图
      renderer.clear();

      // 获取视口数量（点光源有6个视口，其他灯光通常为1个）
      const viewportCount = shadow.getViewportCount();

      // 遍历所有视口进行渲染
      for (let vp = 0; vp < viewportCount; vp++) {
        // 获取当前视口信息
        const viewport = shadow.getViewport(vp);

        // 设置渲染视口（将归一化坐标转换为像素坐标）
        _viewport.set(
          _viewportSize.x * viewport.x, // 视口X起始位置
          _viewportSize.y * viewport.y, // 视口Y起始位置
          _viewportSize.x * viewport.z, // 视口宽度
          _viewportSize.y * viewport.w // 视口高度
        );

        // 应用视口设置
        _state.viewport(_viewport);

        // 更新阴影矩阵（包括视图矩阵和投影矩阵）
        shadow.updateMatrices(light, vp);

        // 获取阴影相机的视锥体，用于剔除
        _frustum = shadow.getFrustum();

        // 渲染场景到当前视口
        renderObject(scene, camera, shadow.camera, light, this.type);
      }

      // 对VSM执行模糊通道

      // 如果不是点光源阴影且使用VSM类型，执行模糊处理
      if (shadow.isPointLightShadow !== true && this.type === VSMShadowMap) {
        VSMPass(shadow, camera); // 执行VSM模糊通道
      }

      // 标记阴影已更新，避免重复渲染
      shadow.needsUpdate = false;
    }

    // 记录当前阴影类型，用于下次检测类型变化
    _previousType = this.type;

    // 标记阴影系统已更新
    scope.needsUpdate = false;

    // 恢复之前的渲染状态
    renderer.setRenderTarget(currentRenderTarget, activeCubeFace, activeMipmapLevel);
  };

  /**
   * VSM（方差阴影贴图）模糊通道
   * 执行两次高斯模糊（垂直和水平），以实现软阴影效果
   * VSM通过存储深度的均值和方差来实现软阴影，需要模糊处理来减少噪声
   *
   * @param {Object} shadow - 阴影对象
   * @param {Camera} camera - 相机对象
   */
  function VSMPass(shadow, camera) {
    // 更新全屏网格的几何体
    const geometry = objects.update(fullScreenMesh);

    // 检查模糊采样数是否发生变化
    if (shadowMaterialVertical.defines.VSM_SAMPLES !== shadow.blurSamples) {
      // 更新垂直模糊材质的采样数
      shadowMaterialVertical.defines.VSM_SAMPLES = shadow.blurSamples;
      // 更新水平模糊材质的采样数
      shadowMaterialHorizontal.defines.VSM_SAMPLES = shadow.blurSamples;

      // 标记材质需要重新编译
      shadowMaterialVertical.needsUpdate = true;
      shadowMaterialHorizontal.needsUpdate = true;
    }

    // 如果没有中间渲染目标，创建一个
    if (shadow.mapPass === null) {
      shadow.mapPass = new WebGLRenderTarget(_shadowMapSize.x, _shadowMapSize.y);
    }

    // 垂直模糊通道

    // 设置垂直模糊的uniform参数
    shadowMaterialVertical.uniforms.shadow_pass.value = shadow.map.texture; // 输入纹理
    shadowMaterialVertical.uniforms.resolution.value = shadow.mapSize; // 分辨率
    shadowMaterialVertical.uniforms.radius.value = shadow.radius; // 模糊半径
    // 设置渲染目标为中间缓冲区
    renderer.setRenderTarget(shadow.mapPass);
    // 清除中间缓冲区
    renderer.clear();
    // 执行垂直模糊渲染
    renderer.renderBufferDirect(camera, null, geometry, shadowMaterialVertical, fullScreenMesh, null);

    // 水平模糊通道

    // 设置水平模糊的uniform参数
    shadowMaterialHorizontal.uniforms.shadow_pass.value = shadow.mapPass.texture; // 输入纹理（垂直模糊结果）
    shadowMaterialHorizontal.uniforms.resolution.value = shadow.mapSize; // 分辨率
    shadowMaterialHorizontal.uniforms.radius.value = shadow.radius; // 模糊半径
    // 设置渲染目标为最终阴影贴图
    renderer.setRenderTarget(shadow.map);
    // 清除最终阴影贴图
    renderer.clear();
    // 执行水平模糊渲染，得到最终的VSM阴影贴图
    renderer.renderBufferDirect(camera, null, geometry, shadowMaterialHorizontal, fullScreenMesh, null);
  }

  /**
   * 获取阴影渲染使用的深度材质
   * 根据灯光类型、对象属性和材质特性选择或创建合适的深度材质
   *
   * @param {Object3D} object - 要渲染阴影的3D对象
   * @param {Material} material - 对象的原始材质
   * @param {Light} light - 投射阴影的灯光
   * @param {number} type - 阴影贴图类型
   * @returns {Material} 用于阴影渲染的深度材质
   */
  function getDepthMaterial(object, material, light, type) {
    let result = null;

    // 检查对象是否有自定义的阴影材质
    const customMaterial = light.isPointLight === true ? object.customDistanceMaterial : object.customDepthMaterial;

    if (customMaterial !== undefined) {
      // 使用自定义阴影材质
      result = customMaterial;
    } else {
      // 根据灯光类型选择默认材质
      result = light.isPointLight === true ? _distanceMaterial : _depthMaterial;

      // 检查是否需要创建材质变体（当材质有特殊属性时）
      if (
        // 启用了局部裁剪且材质支持阴影裁剪
        (renderer.localClippingEnabled && material.clipShadows === true && Array.isArray(material.clippingPlanes) && material.clippingPlanes.length !== 0) ||
        // 材质有位移贴图
        (material.displacementMap && material.displacementScale !== 0) ||
        // 材质有Alpha贴图且启用Alpha测试
        (material.alphaMap && material.alphaTest > 0) ||
        // 材质有漫反射贴图且启用Alpha测试
        (material.map && material.alphaTest > 0) ||
        // 材质启用了Alpha到覆盖率转换
        material.alphaToCoverage === true
      ) {
        // 在这种情况下，我们需要一个反映适当状态的唯一材质实例

        // 使用双重键值缓存系统
        const keyA = result.uuid, // 基础材质的UUID
          keyB = material.uuid; // 原始材质的UUID

        // 获取或创建基础材质的变体缓存
        let materialsForVariant = _materialCache[keyA];

        if (materialsForVariant === undefined) {
          materialsForVariant = {};
          _materialCache[keyA] = materialsForVariant;
        }

        // 获取或创建特定材质的缓存实例
        let cachedMaterial = materialsForVariant[keyB];

        if (cachedMaterial === undefined) {
          // 克隆基础材质创建新的变体
          cachedMaterial = result.clone();
          // 缓存新创建的材质
          materialsForVariant[keyB] = cachedMaterial;
          // 监听原始材质的销毁事件，以便清理缓存
          material.addEventListener("dispose", onMaterialDispose);
        }

        // 使用缓存的材质变体
        result = cachedMaterial;
      }
    }

    // 复制原始材质的基本属性到深度材质
    result.visible = material.visible; // 可见性
    result.wireframe = material.wireframe; // 线框模式

    // 根据阴影类型设置面剔除
    if (type === VSMShadowMap) {
      // VSM使用原始面设置或自定义阴影面设置
      result.side = material.shadowSide !== null ? material.shadowSide : material.side;
    } else {
      // 其他阴影类型使用映射后的面设置（通常渲染背面避免阴影痤疮）
      result.side = material.shadowSide !== null ? material.shadowSide : shadowSide[material.side];
    }

    // 复制Alpha相关属性
    result.alphaMap = material.alphaMap; // Alpha贴图
    result.alphaTest = material.alphaToCoverage === true ? 0.5 : material.alphaTest; // Alpha测试值（alphaToCoverage近似为固定值0.5）
    result.map = material.map; // 漫反射贴图（用于Alpha测试）

    // 复制裁剪相关属性
    result.clipShadows = material.clipShadows; // 是否在阴影中应用裁剪
    result.clippingPlanes = material.clippingPlanes; // 裁剪平面数组
    result.clipIntersection = material.clipIntersection; // 裁剪交集模式

    // 复制位移贴图相关属性
    result.displacementMap = material.displacementMap; // 位移贴图
    result.displacementScale = material.displacementScale; // 位移缩放
    result.displacementBias = material.displacementBias; // 位移偏移

    // 复制线宽属性
    result.wireframeLinewidth = material.wireframeLinewidth; // 线框线宽
    result.linewidth = material.linewidth; // 线宽

    // 如果是点光源且使用距离材质，设置光源引用
    if (light.isPointLight === true && result.isMeshDistanceMaterial === true) {
      const materialProperties = renderer.properties.get(result);
      materialProperties.light = light; // 存储光源引用，用于距离计算
    }

    // 返回配置好的深度材质
    return result;
  }

  /**
   * 递归渲染对象到阴影贴图
   * 遍历场景图并渲染所有投射阴影的对象
   *
   * @param {Object} object - 要渲染的对象
   * @param {Camera} camera - 主相机
   * @param {Camera} shadowCamera - 阴影相机
   * @param {Light} light - 投射阴影的灯光
   * @param {number} type - 阴影贴图类型
   */
  function renderObject(object, camera, shadowCamera, light, type) {
    // 如果对象不可见，直接返回
    if (object.visible === false) return;

    // 检查对象的图层是否与相机图层匹配
    const visible = object.layers.test(camera.layers);

    // 如果对象可见且是可渲染类型（网格、线条、点）
    if (visible && (object.isMesh || object.isLine || object.isPoints)) {
      // 检查对象是否应该投射阴影或接收VSM阴影，且通过视锥剔除
      if ((object.castShadow || (object.receiveShadow && type === VSMShadowMap)) && (!object.frustumCulled || _frustum.intersectsObject(object))) {
        // 计算对象在阴影相机空间中的模型视图矩阵
        object.modelViewMatrix.multiplyMatrices(shadowCamera.matrixWorldInverse, object.matrixWorld);

        // 更新对象的几何体
        const geometry = objects.update(object);
        // 获取对象的材质
        const material = object.material;

        // 处理多材质对象
        if (Array.isArray(material)) {
          // 获取几何体的组信息
          const groups = geometry.groups;

          // 遍历每个材质组
          for (let k = 0, kl = groups.length; k < kl; k++) {
            const group = groups[k]; // 当前组
            const groupMaterial = material[group.materialIndex]; // 组对应的材质

            // 如果材质存在且可见
            if (groupMaterial && groupMaterial.visible) {
              // 获取用于阴影渲染的深度材质
              const depthMaterial = getDepthMaterial(object, groupMaterial, light, type);

              // 调用对象的阴影渲染前回调
              object.onBeforeShadow(renderer, object, camera, shadowCamera, geometry, depthMaterial, group);

              // 直接渲染几何体到阴影贴图
              renderer.renderBufferDirect(shadowCamera, null, geometry, depthMaterial, object, group);

              // 调用对象的阴影渲染后回调
              object.onAfterShadow(renderer, object, camera, shadowCamera, geometry, depthMaterial, group);
            }
          }
        } else if (material.visible) {
          // 处理单一材质对象
          // 获取用于阴影渲染的深度材质
          const depthMaterial = getDepthMaterial(object, material, light, type);

          // 调用对象的阴影渲染前回调
          object.onBeforeShadow(renderer, object, camera, shadowCamera, geometry, depthMaterial, null);

          // 直接渲染几何体到阴影贴图
          renderer.renderBufferDirect(shadowCamera, null, geometry, depthMaterial, object, null);

          // 调用对象的阴影渲染后回调
          object.onAfterShadow(renderer, object, camera, shadowCamera, geometry, depthMaterial, null);
        }
      }
    }

    // 递归渲染子对象
    const children = object.children;

    for (let i = 0, l = children.length; i < l; i++) {
      renderObject(children[i], camera, shadowCamera, light, type);
    }
  }

  /**
   * 材质销毁事件处理函数
   * 当原始材质被销毁时，清理相关的阴影材质缓存
   * 防止内存泄漏
   *
   * @param {Event} event - 材质销毁事件
   */
  function onMaterialDispose(event) {
    // 获取被销毁的材质
    const material = event.target;

    // 移除事件监听器，避免重复调用
    material.removeEventListener("dispose", onMaterialDispose);

    // 确保移除用于阴影贴图渲染的唯一距离/深度材质

    // 遍历材质缓存中的所有基础材质
    for (const id in _materialCache) {
      const cache = _materialCache[id]; // 获取特定基础材质的变体缓存

      const uuid = event.target.uuid; // 被销毁材质的UUID

      // 如果缓存中存在该材质的变体
      if (uuid in cache) {
        const shadowMaterial = cache[uuid]; // 获取阴影材质变体
        shadowMaterial.dispose(); // 销毁阴影材质
        delete cache[uuid]; // 从缓存中删除
      }
    }
  }
}

// 导出WebGL阴影贴图管理器
export { WebGLShadowMap };
