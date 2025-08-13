/**
 * NodeMaterialObserver.js
 *
 * 节点材质观察者模块
 * 该模块是Three.js WebGPU渲染器的核心性能优化组件
 *
 * 主要功能：
 * - 监控渲染对象的状态变化（材质、几何体、变换矩阵等）
 * - 缓存渲染对象数据，避免不必要的重复计算
 * - 智能判断是否需要重新编译着色器或更新渲染状态
 * - 优化渲染性能，减少GPU状态切换
 *
 * 核心原理：
 * 通过比较当前状态与缓存状态，只在必要时触发渲染刷新
 * 使用WeakMap确保内存安全，避免内存泄漏
 *
 * @author Three.js Contributors
 * @since Three.js r150+
 */

/**
 * 需要监控刷新的材质uniform属性列表
 * 这些属性的变化会触发材质的重新渲染和着色器的重新编译
 * 包含了Three.js中所有可能影响渲染结果的材质属性
 */
const refreshUniforms = [
  "alphaMap", // 透明度贴图
  "alphaTest", // 透明度测试阈值
  "anisotropy", // 各向异性强度
  "anisotropyMap", // 各向异性贴图
  "anisotropyRotation", // 各向异性旋转角度
  "aoMap", // 环境遮挡贴图
  "aoMapIntensity", // 环境遮挡强度
  "attenuationColor", // 衰减颜色（用于体积材质）
  "attenuationDistance", // 衰减距离（用于体积材质）
  "bumpMap", // 凹凸贴图
  "clearcoat", // 清漆层强度
  "clearcoatMap", // 清漆层贴图
  "clearcoatNormalMap", // 清漆层法线贴图
  "clearcoatNormalScale", // 清漆层法线缩放
  "clearcoatRoughness", // 清漆层粗糙度
  "color", // 基础颜色
  "dispersion", // 色散效果
  "displacementMap", // 位移贴图
  "emissive", // 自发光颜色
  "emissiveIntensity", // 自发光强度
  "emissiveMap", // 自发光贴图
  "envMap", // 环境贴图
  "envMapIntensity", // 环境贴图强度
  "gradientMap", // 渐变贴图（用于卡通着色）
  "ior", // 折射率
  "iridescence", // 彩虹效应强度
  "iridescenceIOR", // 彩虹效应折射率
  "iridescenceMap", // 彩虹效应贴图
  "iridescenceThicknessMap", // 彩虹效应厚度贴图
  "lightMap", // 光照贴图
  "lightMapIntensity", // 光照贴图强度
  "map", // 主纹理贴图
  "matcap", // 材质捕获贴图
  "metalness", // 金属度
  "metalnessMap", // 金属度贴图
  "normalMap", // 法线贴图
  "normalScale", // 法线缩放
  "opacity", // 不透明度
  "roughness", // 粗糙度
  "roughnessMap", // 粗糙度贴图
  "sheen", // 光泽效果强度
  "sheenColor", // 光泽效果颜色
  "sheenColorMap", // 光泽效果颜色贴图
  "sheenRoughnessMap", // 光泽效果粗糙度贴图
  "shininess", // 光泽度（用于Phong材质）
  "specular", // 镜面反射颜色
  "specularColor", // 镜面反射颜色（用于物理材质）
  "specularColorMap", // 镜面反射颜色贴图
  "specularIntensity", // 镜面反射强度
  "specularIntensityMap", // 镜面反射强度贴图
  "specularMap", // 镜面反射贴图
  "thickness", // 厚度（用于体积材质）
  "transmission", // 透射强度
  "transmissionMap", // 透射贴图
];

/**
 * 用于缓存节点材质灯光数据的WeakMap
 * 通过渲染ID缓存灯光数据，避免不必要的重复计算
 * 使用WeakMap确保当LightsNode对象被垃圾回收时，缓存也会自动清理
 *
 * @private
 * @type {WeakMap<LightsNode,Object>}
 */
const _lightsCache = new WeakMap();

/**
 * 节点材质观察者类
 * 该类被 {@link WebGPURenderer} 用作管理组件
 * 主要目的是在渲染对象即将被渲染之前，确定它们是否需要刷新
 * 通过监控材质、几何体、灯光等状态变化来优化渲染性能
 */
class NodeMaterialObserver {
  /**
   * 构造一个新的节点材质观察者
   * 初始化所有必要的监控属性和状态
   *
   * @param {NodeBuilder} builder - 节点构建器，包含材质和对象信息
   */
  constructor(builder) {
    /**
     * 渲染对象映射表
     * 一个节点材质可以被多个渲染对象使用，所以监视器必须维护一个渲染对象列表
     * 使用WeakMap确保当渲染对象被垃圾回收时，相关数据也会自动清理
     *
     * @type {WeakMap<RenderObject,Object>}
     */
    this.renderObjects = new WeakMap();

    /**
     * 材质是否使用节点对象的标志
     * 如果材质包含节点属性，则需要更频繁的刷新检查
     *
     * @type {boolean}
     */
    this.hasNode = this.containsNode(builder);

    /**
     * 节点构建器的3D对象是否为动画对象的标志
     * 动画对象（如骨骼网格）需要每帧都进行刷新
     *
     * @type {boolean}
     */
    this.hasAnimation = builder.object.isSkinnedMesh === true;

    /**
     * 所有可能的材质uniform属性列表
     * 用于监控材质属性的变化
     *
     * @type {Array<string>}
     */
    this.refreshUniforms = refreshUniforms;

    /**
     * 当前渲染ID
     * 保存来自节点帧的当前渲染ID，用于判断是否需要更新
     *
     * @type {number}
     * @default 0
     */
    this.renderId = 0;
  }

  /**
   * 检查给定的渲染对象是否是第一次被此观察者验证
   * 用于判断是否需要初始化渲染对象的监控数据
   *
   * @param {RenderObject} renderObject - 要检查的渲染对象
   * @return {boolean} 如果是第一次验证返回true，否则返回false
   */
  firstInitialization(renderObject) {
    // 检查渲染对象是否已经被初始化过
    const hasInitialized = this.renderObjects.has(renderObject);

    if (hasInitialized === false) {
      // 如果没有初始化过，获取并缓存渲染对象数据
      this.getRenderObjectData(renderObject);

      return true; // 返回true表示这是第一次初始化
    }

    return false; // 返回false表示已经初始化过
  }

  /**
   * 检查当前渲染是否产生运动矢量
   * 运动矢量用于实现运动模糊等后处理效果
   *
   * @param {Renderer} renderer - 渲染器对象
   * @return {boolean} 如果当前渲染产生运动矢量返回true，否则返回false
   */
  needsVelocity(renderer) {
    // 获取多渲染目标(MRT)对象
    const mrt = renderer.getMRT();

    // 检查MRT是否存在且包含velocity通道
    return mrt !== null && mrt.has("velocity");
  }

  /**
   * 获取给定渲染对象的监控数据
   * 如果数据不存在则创建新的监控数据结构
   *
   * @param {RenderObject} renderObject - 要获取监控数据的渲染对象
   * @return {Object} 包含材质、几何体、变换等信息的监控数据对象
   */
  getRenderObjectData(renderObject) {
    // 尝试从缓存中获取已存在的数据
    let data = this.renderObjects.get(renderObject);

    if (data === undefined) {
      // 如果数据不存在，解构渲染对象获取核心组件
      const { geometry, material, object } = renderObject;

      // 创建新的监控数据结构
      data = {
        // 材质数据：包含所有需要监控的材质属性
        material: this.getMaterialData(material),
        // 几何体数据：包含几何体ID、属性版本、索引版本和绘制范围
        geometry: {
          id: geometry.id, // 几何体唯一标识
          attributes: this.getAttributesData(geometry.attributes), // 属性版本信息
          indexVersion: geometry.index ? geometry.index.version : null, // 索引版本
          drawRange: { start: geometry.drawRange.start, count: geometry.drawRange.count }, // 绘制范围
        },
        // 世界变换矩阵的副本，用于检测对象位置变化
        worldMatrix: object.matrixWorld.clone(),
      };

      // 如果对象有中心点，保存中心点的副本
      if (object.center) {
        data.center = object.center.clone();
      }

      // 如果对象有变形目标影响值，保存其副本
      if (object.morphTargetInfluences) {
        data.morphTargetInfluences = object.morphTargetInfluences.slice();
      }

      // 如果渲染对象属于某个bundle，保存bundle版本
      if (renderObject.bundle !== null) {
        data.version = renderObject.bundle.version;
      }

      // 如果材质有透射效果，保存渲染缓冲区尺寸
      if (data.material.transmission > 0) {
        const { width, height } = renderObject.context;

        data.bufferWidth = width; // 缓冲区宽度
        data.bufferHeight = height; // 缓冲区高度
      }

      // 获取并保存灯光数据
      data.lights = this.getLightsData(renderObject.lightsNode.getLights());

      // 将新创建的数据缓存到WeakMap中
      this.renderObjects.set(renderObject, data);
    }

    return data;
  }

  /**
   * 获取几何体属性的监控数据结构
   * 返回包含属性版本信息的对象，用于监控属性变化
   *
   * @param {Object} attributes - 几何体的属性对象
   * @return {Object} 用于监控属性版本的对象
   */
  getAttributesData(attributes) {
    const attributesData = {};

    // 遍历所有几何体属性
    for (const name in attributes) {
      const attribute = attributes[name];

      // 为每个属性保存版本信息
      attributesData[name] = {
        version: attribute.version, // 属性的版本号，用于检测变化
      };
    }

    return attributesData;
  }

  /**
   * 检查节点构建器的材质是否使用节点属性
   * 如果材质包含节点属性或渲染器有覆盖节点，则返回true
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   * @return {boolean} 如果材质使用节点属性返回true，否则返回false
   */
  containsNode(builder) {
    const material = builder.material;

    // 遍历材质的所有属性，检查是否有节点属性
    for (const property in material) {
      if (material[property] && material[property].isNode) return true;
    }

    // 检查渲染器是否有模型视图矩阵或模型法线视图矩阵的覆盖节点
    if (builder.renderer.overrideNodes.modelViewMatrix !== null || builder.renderer.overrideNodes.modelNormalViewMatrix !== null) return true;

    return false;
  }

  /**
   * 获取材质的监控数据结构
   * 返回包含材质属性值的对象，用于监控材质属性变化
   *
   * @param {Material} material - 要监控的材质对象
   * @return {Object} 用于监控材质属性的对象
   */
  getMaterialData(material) {
    const data = {};

    // 遍历所有需要刷新的uniform属性
    for (const property of this.refreshUniforms) {
      const value = material[property];

      // 跳过null或undefined的值
      if (value === null || value === undefined) continue;

      // 处理对象类型的值
      if (typeof value === "object" && value.clone !== undefined) {
        if (value.isTexture === true) {
          // 对于纹理对象，只保存ID和版本信息
          data[property] = { id: value.id, version: value.version };
        } else {
          // 对于其他可克隆对象（如Vector3、Color等），保存其副本
          data[property] = value.clone();
        }
      } else {
        // 对于基本类型值，直接保存
        data[property] = value;
      }
    }

    return data;
  }

  /**
   * 检查给定的渲染对象是否未改变其状态
   * 通过比较当前状态与缓存状态来判断是否需要刷新
   *
   * @param {RenderObject} renderObject - 要检查的渲染对象
   * @param {Array} lightsData - 当前的材质灯光数据
   * @return {boolean} 如果渲染对象状态未改变返回true，否则返回false
   */
  equals(renderObject, lightsData) {
    // 解构渲染对象获取核心组件
    const { object, material, geometry } = renderObject;

    // 获取缓存的渲染对象数据
    const renderObjectData = this.getRenderObjectData(renderObject);

    // 检查世界变换矩阵是否发生变化
    if (renderObjectData.worldMatrix.equals(object.matrixWorld) !== true) {
      // 如果矩阵发生变化，更新缓存并返回false表示需要刷新
      renderObjectData.worldMatrix.copy(object.matrixWorld);

      return false;
    }

    // 检查材质属性是否发生变化
    const materialData = renderObjectData.material;

    // 遍历所有缓存的材质属性
    for (const property in materialData) {
      const value = materialData[property]; // 缓存的属性值
      const mtlValue = material[property]; // 当前的属性值

      // 对于有equals方法的对象（如Vector3、Color等）
      if (value.equals !== undefined) {
        if (value.equals(mtlValue) === false) {
          // 如果值不相等，更新缓存并返回false
          value.copy(mtlValue);

          return false;
        }
      }
      // 对于纹理对象，比较ID和版本
      else if (mtlValue.isTexture === true) {
        if (value.id !== mtlValue.id || value.version !== mtlValue.version) {
          // 如果纹理ID或版本发生变化，更新缓存并返回false
          value.id = mtlValue.id;
          value.version = mtlValue.version;

          return false;
        }
      }
      // 对于基本类型值，直接比较
      else if (value !== mtlValue) {
        // 如果值发生变化，更新缓存并返回false
        materialData[property] = mtlValue;

        return false;
      }
    }

    // 检查透射材质的缓冲区尺寸
    if (materialData.transmission > 0) {
      const { width, height } = renderObject.context;

      // 如果缓冲区尺寸发生变化，更新缓存并返回false
      if (renderObjectData.bufferWidth !== width || renderObjectData.bufferHeight !== height) {
        renderObjectData.bufferWidth = width;
        renderObjectData.bufferHeight = height;

        return false;
      }
    }

    // 检查几何体是否发生变化
    const storedGeometryData = renderObjectData.geometry;
    const attributes = geometry.attributes;
    const storedAttributes = storedGeometryData.attributes;

    const storedAttributeNames = Object.keys(storedAttributes);
    const currentAttributeNames = Object.keys(attributes);

    // 检查几何体ID是否发生变化
    if (storedGeometryData.id !== geometry.id) {
      storedGeometryData.id = geometry.id;
      return false;
    }

    // 检查属性数量是否发生变化
    if (storedAttributeNames.length !== currentAttributeNames.length) {
      renderObjectData.geometry.attributes = this.getAttributesData(attributes);
      return false;
    }

    // 逐个比较每个属性
    for (const name of storedAttributeNames) {
      const storedAttributeData = storedAttributes[name];
      const attribute = attributes[name];

      // 检查属性是否被移除
      if (attribute === undefined) {
        // 属性被移除，从缓存中删除并返回false
        delete storedAttributes[name];
        return false;
      }

      // 检查属性版本是否发生变化
      if (storedAttributeData.version !== attribute.version) {
        storedAttributeData.version = attribute.version;
        return false;
      }
    }

    // 检查几何体索引是否发生变化
    const index = geometry.index;
    const storedIndexVersion = storedGeometryData.indexVersion;
    const currentIndexVersion = index ? index.version : null;

    if (storedIndexVersion !== currentIndexVersion) {
      storedGeometryData.indexVersion = currentIndexVersion;
      return false;
    }

    // 检查绘制范围是否发生变化
    if (storedGeometryData.drawRange.start !== geometry.drawRange.start || storedGeometryData.drawRange.count !== geometry.drawRange.count) {
      storedGeometryData.drawRange.start = geometry.drawRange.start;
      storedGeometryData.drawRange.count = geometry.drawRange.count;
      return false;
    }

    // 检查变形目标影响值是否发生变化
    if (renderObjectData.morphTargetInfluences) {
      let morphChanged = false;

      // 逐个比较变形目标影响值
      for (let i = 0; i < renderObjectData.morphTargetInfluences.length; i++) {
        if (renderObjectData.morphTargetInfluences[i] !== object.morphTargetInfluences[i]) {
          morphChanged = true;
        }
      }

      // 注意：这里返回true是因为变形目标的变化不需要重新编译着色器
      if (morphChanged) return true;
    }

    // 检查灯光是否发生变化
    if (renderObjectData.lights) {
      for (let i = 0; i < lightsData.length; i++) {
        if (renderObjectData.lights[i].map !== lightsData[i].map) {
          return false;
        }
      }
    }

    // 检查对象中心点是否发生变化
    if (renderObjectData.center) {
      if (renderObjectData.center.equals(object.center) === false) {
        renderObjectData.center.copy(object.center);

        // 注意：这里返回true是因为中心点变化不需要重新编译着色器
        return true;
      }
    }

    // 更新bundle版本（如果存在）
    if (renderObject.bundle !== null) {
      renderObjectData.version = renderObject.bundle.version;
    }

    // 所有检查都通过，返回true表示状态未改变
    return true;
  }

  /**
   * 获取给定材质灯光的灯光数据
   * 只处理有贴图的聚光灯，返回其贴图版本信息
   *
   * @param {Array} materialLights - 材质的灯光数组
   * @return {Array<Object>} 包含灯光贴图版本信息的数组
   */
  getLightsData(materialLights) {
    const lights = [];

    // 遍历所有材质灯光
    for (const light of materialLights) {
      // 只处理有贴图的聚光灯
      if (light.isSpotLight === true && light.map !== null) {
        // 只添加有贴图的灯光，保存其贴图版本
        lights.push({ map: light.map.version });
      }
    }

    return lights;
  }

  /**
   * 获取给定灯光节点和渲染ID的灯光数据
   * 使用缓存机制避免重复计算相同渲染ID的灯光数据
   *
   * @param {LightsNode} lightsNode - 灯光节点对象
   * @param {number} renderId - 当前渲染ID
   * @return {Array} 灯光数据数组
   */
  getLights(lightsNode, renderId) {
    // 检查缓存中是否已有该灯光节点的数据
    if (_lightsCache.has(lightsNode)) {
      const cached = _lightsCache.get(lightsNode);

      // 如果缓存的渲染ID与当前渲染ID相同，直接返回缓存数据
      if (cached.renderId === renderId) {
        return cached.lightsData;
      }
    }

    // 获取新的灯光数据
    const lightsData = this.getLightsData(lightsNode.getLights());

    // 将新数据缓存起来
    _lightsCache.set(lightsNode, { renderId, lightsData });

    return lightsData;
  }

  /**
   * 检查给定的渲染对象是否需要刷新
   * 这是类的核心判断方法，决定是否需要重新编译着色器或更新渲染状态
   *
   * @param {RenderObject} renderObject - 要检查的渲染对象
   * @param {NodeFrame} nodeFrame - 当前的节点帧对象
   * @return {boolean} 如果渲染对象需要刷新返回true，否则返回false
   */
  needsRefresh(renderObject, nodeFrame) {
    // 以下情况必须刷新：
    // 1. 材质包含节点属性
    // 2. 对象有动画（如骨骼动画）
    // 3. 第一次初始化
    // 4. 需要生成运动矢量
    if (this.hasNode || this.hasAnimation || this.firstInitialization(renderObject) || this.needsVelocity(nodeFrame.renderer)) return true;

    // 获取当前帧的渲染ID
    const { renderId } = nodeFrame;

    // 如果渲染ID发生变化，更新并返回true
    if (this.renderId !== renderId) {
      this.renderId = renderId;

      return true;
    }

    // 检查对象是否为静态对象
    const isStatic = renderObject.object.static === true;
    // 检查是否为静态bundle且版本未变化
    const isBundle = renderObject.bundle !== null && renderObject.bundle.static === true && this.getRenderObjectData(renderObject).version === renderObject.bundle.version;

    // 静态对象或未变化的bundle不需要刷新
    if (isStatic || isBundle) return false;

    // 获取当前的灯光数据
    const lightsData = this.getLights(renderObject.lightsNode, renderId);
    // 比较当前状态与缓存状态是否相等
    const notEqual = this.equals(renderObject, lightsData) !== true;

    // 返回比较结果：不相等则需要刷新
    return notEqual;
  }
}

// 导出NodeMaterialObserver类作为默认导出
// 该类是Three.js WebGPU渲染器的核心组件，负责优化渲染性能
export default NodeMaterialObserver;
