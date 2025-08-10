// 导入必要的数学类和着色器库
import { Color } from "../../math/Color.js";
import { Matrix4 } from "../../math/Matrix4.js";
import { Vector2 } from "../../math/Vector2.js";
import { Vector3 } from "../../math/Vector3.js";
import { UniformsLib } from "../shaders/UniformsLib.js";

/**
 * 灯光Uniform变量缓存
 * 为不同类型的灯光创建和缓存对应的uniform变量结构
 * 避免重复创建相同的uniform对象，提高性能
 */
function UniformsCache() {
  // 存储各个灯光的uniform变量的缓存对象
  const lights = {};

  return {
    /**
     * 获取指定灯光的uniform变量
     * @param {Light} light - 灯光对象
     * @returns {Object} 该灯光类型对应的uniform变量结构
     */
    get: function (light) {
      // 如果已经缓存了该灯光的uniform，直接返回
      if (lights[light.id] !== undefined) {
        return lights[light.id];
      }

      let uniforms;

      // 根据灯光类型创建对应的uniform变量结构
      switch (light.type) {
        case "DirectionalLight":
          // 平行光：需要方向和颜色
          uniforms = {
            direction: new Vector3(), // 光照方向
            color: new Color(), // 光照颜色
          };
          break;

        case "SpotLight":
          // 聚光灯：需要位置、方向、颜色、距离、锥角等参数
          uniforms = {
            position: new Vector3(), // 光源位置
            direction: new Vector3(), // 光照方向
            color: new Color(), // 光照颜色
            distance: 0, // 光照距离
            coneCos: 0, // 锥角余弦值
            penumbraCos: 0, // 半影角余弦值
            decay: 0, // 衰减系数
          };
          break;

        case "PointLight":
          // 点光源：需要位置、颜色、距离、衰减参数
          uniforms = {
            position: new Vector3(), // 光源位置
            color: new Color(), // 光照颜色
            distance: 0, // 光照距离
            decay: 0, // 衰减系数
          };
          break;

        case "HemisphereLight":
          // 半球光：需要方向、天空颜色、地面颜色
          uniforms = {
            direction: new Vector3(), // 光照方向
            skyColor: new Color(), // 天空颜色
            groundColor: new Color(), // 地面颜色
          };
          break;

        case "RectAreaLight":
          // 矩形区域光：需要颜色、位置、宽度、高度向量
          uniforms = {
            color: new Color(), // 光照颜色
            position: new Vector3(), // 光源位置
            halfWidth: new Vector3(), // 半宽度向量
            halfHeight: new Vector3(), // 半高度向量
          };
          break;
      }

      // 将创建的uniform缓存起来
      lights[light.id] = uniforms;

      return uniforms;
    },
  };
}

/**
 * 阴影Uniform变量缓存
 * 为支持阴影的灯光类型创建和缓存对应的阴影uniform变量结构
 * 管理阴影相关的参数，如阴影强度、偏移、半径等
 */
function ShadowUniformsCache() {
  // 存储各个灯光阴影uniform变量的缓存对象
  const lights = {};

  return {
    /**
     * 获取指定灯光的阴影uniform变量
     * @param {Light} light - 支持阴影的灯光对象
     * @returns {Object} 该灯光类型对应的阴影uniform变量结构
     */
    get: function (light) {
      // 如果已经缓存了该灯光的阴影uniform，直接返回
      if (lights[light.id] !== undefined) {
        return lights[light.id];
      }

      let uniforms;

      // 根据灯光类型创建对应的阴影uniform变量结构
      switch (light.type) {
        case "DirectionalLight":
          // 平行光阴影参数
          uniforms = {
            shadowIntensity: 1, // 阴影强度
            shadowBias: 0, // 阴影偏移（解决阴影痤疮问题）
            shadowNormalBias: 0, // 法线偏移
            shadowRadius: 1, // 阴影模糊半径
            shadowMapSize: new Vector2(), // 阴影贴图尺寸
          };
          break;

        case "SpotLight":
          // 聚光灯阴影参数
          uniforms = {
            shadowIntensity: 1, // 阴影强度
            shadowBias: 0, // 阴影偏移
            shadowNormalBias: 0, // 法线偏移
            shadowRadius: 1, // 阴影模糊半径
            shadowMapSize: new Vector2(), // 阴影贴图尺寸
          };
          break;

        case "PointLight":
          // 点光源阴影参数（立方体阴影贴图）
          uniforms = {
            shadowIntensity: 1, // 阴影强度
            shadowBias: 0, // 阴影偏移
            shadowNormalBias: 0, // 法线偏移
            shadowRadius: 1, // 阴影模糊半径
            shadowMapSize: new Vector2(), // 阴影贴图尺寸
            shadowCameraNear: 1, // 阴影相机近平面
            shadowCameraFar: 1000, // 阴影相机远平面
          };
          break;

        // TODO (abelnation): 设置矩形区域光的阴影uniform变量
        // 矩形区域光目前不支持阴影
      }

      // 将创建的阴影uniform缓存起来
      lights[light.id] = uniforms;

      return uniforms;
    },
  };
}

// 全局版本号，用于跟踪灯光状态的变化
let nextVersion = 0;

/**
 * 灯光排序比较函数
 * 优先级：投射阴影且有贴图 > 有贴图 > 投射阴影 > 普通灯光
 * 这样的排序可以优化渲染性能，将复杂的灯光放在前面处理
 * @param {Object} lightA - 灯光A
 * @param {Object} lightB - 灯光B
 * @returns {number} 排序比较结果
 */
function shadowCastingAndTexturingLightsFirst(lightA, lightB) {
  return (lightB.castShadow ? 2 : 0) - (lightA.castShadow ? 2 : 0) + (lightB.map ? 1 : 0) - (lightA.map ? 1 : 0);
}

/**
 * WebGL灯光管理器
 * 负责管理场景中的所有灯光，包括灯光数据的收集、转换和优化
 * 处理不同类型的灯光（平行光、点光源、聚光灯、半球光、矩形区域光）
 * 管理阴影贴图和光照探针
 * @param {WebGLExtensions} extensions - WebGL扩展管理器
 */
function WebGLLights(extensions) {
  // 灯光uniform变量缓存
  const cache = new UniformsCache();

  // 阴影uniform变量缓存
  const shadowCache = ShadowUniformsCache();

  // 灯光系统状态对象
  const state = {
    version: 0, // 状态版本号

    // 哈希值，用于检测灯光配置是否发生变化
    hash: {
      directionalLength: -1, // 平行光数量
      pointLength: -1, // 点光源数量
      spotLength: -1, // 聚光灯数量
      rectAreaLength: -1, // 矩形区域光数量
      hemiLength: -1, // 半球光数量

      numDirectionalShadows: -1, // 平行光阴影数量
      numPointShadows: -1, // 点光源阴影数量
      numSpotShadows: -1, // 聚光灯阴影数量
      numSpotMaps: -1, // 聚光灯贴图数量

      numLightProbes: -1, // 光照探针数量
    },

    // 灯光数据数组
    ambient: [0, 0, 0], // 环境光RGB值
    probe: [], // 光照探针数组（球谐函数系数）
    directional: [], // 平行光数组
    directionalShadow: [], // 平行光阴影数组
    directionalShadowMap: [], // 平行光阴影贴图数组
    directionalShadowMatrix: [], // 平行光阴影矩阵数组
    spot: [], // 聚光灯数组
    spotLightMap: [], // 聚光灯贴图数组
    spotShadow: [], // 聚光灯阴影数组
    spotShadowMap: [], // 聚光灯阴影贴图数组
    spotLightMatrix: [], // 聚光灯变换矩阵数组
    rectArea: [], // 矩形区域光数组
    rectAreaLTC1: null, // 矩形区域光LTC查找表1
    rectAreaLTC2: null, // 矩形区域光LTC查找表2
    point: [], // 点光源数组
    pointShadow: [], // 点光源阴影数组
    pointShadowMap: [], // 点光源阴影贴图数组
    pointShadowMatrix: [], // 点光源阴影矩阵数组
    hemi: [], // 半球光数组
    numSpotLightShadowsWithMaps: 0, // 带贴图的聚光灯阴影数量
    numLightProbes: 0, // 光照探针总数
  };

  // 初始化9个球谐函数系数向量（用于光照探针）
  for (let i = 0; i < 9; i++) state.probe.push(new Vector3());

  // 临时变量，用于计算过程中的向量和矩阵操作
  const vector3 = new Vector3();
  const matrix4 = new Matrix4();
  const matrix42 = new Matrix4();

  /**
   * 设置灯光系统
   * 处理场景中的所有灯光，将它们分类并转换为渲染器可用的格式
   * @param {Array} lights - 场景中的灯光数组
   */
  function setup(lights) {
    // 环境光累积值（RGB）
    let r = 0,
      g = 0,
      b = 0;

    // 重置光照探针系数
    for (let i = 0; i < 9; i++) state.probe[i].set(0, 0, 0);

    // 各类型灯光的计数器
    let directionalLength = 0; // 平行光数量
    let pointLength = 0; // 点光源数量
    let spotLength = 0; // 聚光灯数量
    let rectAreaLength = 0; // 矩形区域光数量
    let hemiLength = 0; // 半球光数量

    // 阴影相关计数器
    let numDirectionalShadows = 0; // 平行光阴影数量
    let numPointShadows = 0; // 点光源阴影数量
    let numSpotShadows = 0; // 聚光灯阴影数量
    let numSpotMaps = 0; // 聚光灯贴图数量
    let numSpotShadowsWithMaps = 0; // 带贴图的聚光灯阴影数量

    let numLightProbes = 0; // 光照探针数量

    // 灯光排序：[投射阴影+贴图纹理, 贴图纹理, 投射阴影, 无特殊效果]
    // 这样的排序有助于优化渲染性能
    lights.sort(shadowCastingAndTexturingLightsFirst);

    // 遍历所有灯光进行处理
    for (let i = 0, l = lights.length; i < l; i++) {
      const light = lights[i];

      // 提取灯光的基本属性
      const color = light.color; // 灯光颜色
      const intensity = light.intensity; // 灯光强度
      const distance = light.distance; // 灯光影响距离

      // 获取阴影贴图纹理（如果存在）
      const shadowMap = light.shadow && light.shadow.map ? light.shadow.map.texture : null;

      // 处理环境光
      if (light.isAmbientLight) {
        // 环境光直接累加到全局环境光值中
        r += color.r * intensity;
        g += color.g * intensity;
        b += color.b * intensity;
      } else if (light.isLightProbe) {
        // 处理光照探针（基于球谐函数的全局光照）
        for (let j = 0; j < 9; j++) {
          // 将探针的球谐系数按强度缩放后累加
          state.probe[j].addScaledVector(light.sh.coefficients[j], intensity);
        }

        numLightProbes++;
      } else if (light.isDirectionalLight) {
        // 处理平行光（如太阳光）
        const uniforms = cache.get(light);

        // 设置平行光的颜色和强度
        uniforms.color.copy(light.color).multiplyScalar(light.intensity);

        // 如果平行光投射阴影
        if (light.castShadow) {
          const shadow = light.shadow;

          // 获取阴影相关的uniform变量
          const shadowUniforms = shadowCache.get(light);

          // 设置阴影参数
          shadowUniforms.shadowIntensity = shadow.intensity; // 阴影强度
          shadowUniforms.shadowBias = shadow.bias; // 阴影偏移
          shadowUniforms.shadowNormalBias = shadow.normalBias; // 法线偏移
          shadowUniforms.shadowRadius = shadow.radius; // 阴影模糊半径
          shadowUniforms.shadowMapSize = shadow.mapSize; // 阴影贴图尺寸

          // 存储阴影相关数据
          state.directionalShadow[directionalLength] = shadowUniforms;
          state.directionalShadowMap[directionalLength] = shadowMap;
          state.directionalShadowMatrix[directionalLength] = light.shadow.matrix;

          numDirectionalShadows++;
        }

        // 存储平行光uniform数据
        state.directional[directionalLength] = uniforms;

        directionalLength++;
      } else if (light.isSpotLight) {
        // 处理聚光灯
        const uniforms = cache.get(light);

        // 从世界变换矩阵中提取聚光灯位置
        uniforms.position.setFromMatrixPosition(light.matrixWorld);

        // 设置聚光灯的基本属性
        uniforms.color.copy(color).multiplyScalar(intensity); // 颜色和强度
        uniforms.distance = distance; // 影响距离

        // 计算聚光灯的锥角参数
        uniforms.coneCos = Math.cos(light.angle); // 锥角余弦值
        uniforms.penumbraCos = Math.cos(light.angle * (1 - light.penumbra)); // 半影角余弦值
        uniforms.decay = light.decay; // 衰减系数

        // 存储聚光灯uniform数据
        state.spot[spotLength] = uniforms;

        const shadow = light.shadow;

        // 如果聚光灯有贴图纹理
        if (light.map) {
          state.spotLightMap[numSpotMaps] = light.map;
          numSpotMaps++;

          // 确保光照矩阵是最新的
          // TODO: 仅在需要时执行此操作
          shadow.updateMatrices(light);

          // 统计带贴图的聚光灯阴影数量
          if (light.castShadow) numSpotShadowsWithMaps++;
        }

        // 存储聚光灯变换矩阵
        state.spotLightMatrix[spotLength] = shadow.matrix;

        // 如果聚光灯投射阴影
        if (light.castShadow) {
          const shadowUniforms = shadowCache.get(light);

          // 设置阴影参数
          shadowUniforms.shadowIntensity = shadow.intensity; // 阴影强度
          shadowUniforms.shadowBias = shadow.bias; // 阴影偏移
          shadowUniforms.shadowNormalBias = shadow.normalBias; // 法线偏移（防止阴影痤疮）
          shadowUniforms.shadowRadius = shadow.radius; // 阴影模糊半径
          shadowUniforms.shadowMapSize = shadow.mapSize; // 阴影贴图尺寸

          // 将聚光灯阴影uniform存储到状态数组中
          state.spotShadow[spotLength] = shadowUniforms;
          // 将聚光灯阴影贴图存储到状态数组中
          state.spotShadowMap[spotLength] = shadowMap;

          // 增加聚光灯阴影计数
          numSpotShadows++;
        }

        // 增加聚光灯总数计数
        spotLength++;
      } else if (light.isRectAreaLight) {
        // 处理矩形区域光
        const uniforms = cache.get(light); // 获取矩形区域光的uniform缓存

        // 设置矩形区域光的颜色和强度
        uniforms.color.copy(color).multiplyScalar(intensity);

        // 设置矩形区域光的半宽度向量（X轴方向）
        uniforms.halfWidth.set(light.width * 0.5, 0.0, 0.0);
        // 设置矩形区域光的半高度向量（Y轴方向）
        uniforms.halfHeight.set(0.0, light.height * 0.5, 0.0);

        // 将矩形区域光uniform存储到状态数组中
        state.rectArea[rectAreaLength] = uniforms;

        // 增加矩形区域光计数
        rectAreaLength++;
      } else if (light.isPointLight) {
        // 处理点光源
        const uniforms = cache.get(light); // 获取点光源的uniform缓存

        // 设置点光源的颜色和强度
        uniforms.color.copy(light.color).multiplyScalar(light.intensity);
        uniforms.distance = light.distance; // 设置点光源的影响距离
        uniforms.decay = light.decay; // 设置点光源的衰减系数

        // 如果点光源投射阴影
        if (light.castShadow) {
          const shadow = light.shadow; // 获取阴影对象

          // 获取点光源阴影的uniform缓存
          const shadowUniforms = shadowCache.get(light);

          // 设置点光源阴影参数
          shadowUniforms.shadowIntensity = shadow.intensity; // 阴影强度
          shadowUniforms.shadowBias = shadow.bias; // 阴影偏移
          shadowUniforms.shadowNormalBias = shadow.normalBias; // 法线偏移
          shadowUniforms.shadowRadius = shadow.radius; // 阴影模糊半径
          shadowUniforms.shadowMapSize = shadow.mapSize; // 阴影贴图尺寸
          shadowUniforms.shadowCameraNear = shadow.camera.near; // 阴影相机近平面距离
          shadowUniforms.shadowCameraFar = shadow.camera.far; // 阴影相机远平面距离

          // 将点光源阴影uniform存储到状态数组中
          state.pointShadow[pointLength] = shadowUniforms;
          // 将点光源阴影贴图存储到状态数组中
          state.pointShadowMap[pointLength] = shadowMap;
          // 将点光源阴影变换矩阵存储到状态数组中
          state.pointShadowMatrix[pointLength] = light.shadow.matrix;

          // 增加点光源阴影计数
          numPointShadows++;
        }

        // 将点光源uniform存储到状态数组中
        state.point[pointLength] = uniforms;

        // 增加点光源总数计数
        pointLength++;
      } else if (light.isHemisphereLight) {
        // 处理半球光（环境光的高级形式，有天空和地面两种颜色）
        const uniforms = cache.get(light); // 获取半球光的uniform缓存

        // 设置天空颜色（上半球的颜色）
        uniforms.skyColor.copy(light.color).multiplyScalar(intensity);
        // 设置地面颜色（下半球的颜色）
        uniforms.groundColor.copy(light.groundColor).multiplyScalar(intensity);

        // 将半球光uniform存储到状态数组中
        state.hemi[hemiLength] = uniforms;

        // 增加半球光计数
        hemiLength++;
      }
    }

    // 如果场景中有矩形区域光，需要设置LTC（线性变换余弦）查找表
    if (rectAreaLength > 0) {
      // 检查是否支持浮点纹理线性插值扩展
      if (extensions.has("OES_texture_float_linear") === true) {
        // 使用高精度浮点LTC查找表
        state.rectAreaLTC1 = UniformsLib.LTC_FLOAT_1; // LTC查找表1（用于漫反射）
        state.rectAreaLTC2 = UniformsLib.LTC_FLOAT_2; // LTC查找表2（用于镜面反射）
      } else {
        // 使用半精度浮点LTC查找表（兼容性更好但精度较低）
        state.rectAreaLTC1 = UniformsLib.LTC_HALF_1; // 半精度LTC查找表1
        state.rectAreaLTC2 = UniformsLib.LTC_HALF_2; // 半精度LTC查找表2
      }
    }

    // 设置累积的环境光RGB值到状态对象中
    state.ambient[0] = r; // 红色分量
    state.ambient[1] = g; // 绿色分量
    state.ambient[2] = b; // 蓝色分量

    // 获取当前的哈希状态（用于检测灯光配置是否发生变化）
    const hash = state.hash;

    // 检查灯光配置是否发生了变化（任何一个计数器与之前不同）
    if (
      hash.directionalLength !== directionalLength || // 平行光数量变化
      hash.pointLength !== pointLength || // 点光源数量变化
      hash.spotLength !== spotLength || // 聚光灯数量变化
      hash.rectAreaLength !== rectAreaLength || // 矩形区域光数量变化
      hash.hemiLength !== hemiLength || // 半球光数量变化
      hash.numDirectionalShadows !== numDirectionalShadows || // 平行光阴影数量变化
      hash.numPointShadows !== numPointShadows || // 点光源阴影数量变化
      hash.numSpotShadows !== numSpotShadows || // 聚光灯阴影数量变化
      hash.numSpotMaps !== numSpotMaps || // 聚光灯贴图数量变化
      hash.numLightProbes !== numLightProbes // 光照探针数量变化
    ) {
      // 更新各类灯光数组的长度（优化内存使用，避免不必要的数组元素）
      state.directional.length = directionalLength; // 设置平行光数组长度
      state.spot.length = spotLength; // 设置聚光灯数组长度
      state.rectArea.length = rectAreaLength; // 设置矩形区域光数组长度
      state.point.length = pointLength; // 设置点光源数组长度
      state.hemi.length = hemiLength; // 设置半球光数组长度

      // 更新各类阴影数组的长度
      state.directionalShadow.length = numDirectionalShadows; // 平行光阴影数组长度
      state.directionalShadowMap.length = numDirectionalShadows; // 平行光阴影贴图数组长度
      state.pointShadow.length = numPointShadows; // 点光源阴影数组长度
      state.pointShadowMap.length = numPointShadows; // 点光源阴影贴图数组长度
      state.spotShadow.length = numSpotShadows; // 聚光灯阴影数组长度
      state.spotShadowMap.length = numSpotShadows; // 聚光灯阴影贴图数组长度
      state.directionalShadowMatrix.length = numDirectionalShadows; // 平行光阴影矩阵数组长度
      state.pointShadowMatrix.length = numPointShadows; // 点光源阴影矩阵数组长度
      // 聚光灯矩阵数组长度 = 阴影数量 + 贴图数量 - 带贴图的阴影数量（避免重复计算）
      state.spotLightMatrix.length = numSpotShadows + numSpotMaps - numSpotShadowsWithMaps;
      state.spotLightMap.length = numSpotMaps; // 聚光灯贴图数组长度
      state.numSpotLightShadowsWithMaps = numSpotShadowsWithMaps; // 更新带贴图的聚光灯阴影数量
      state.numLightProbes = numLightProbes; // 更新光照探针总数

      // 更新哈希值，记录当前的灯光配置状态（用于下次比较）
      hash.directionalLength = directionalLength; // 记录平行光数量
      hash.pointLength = pointLength; // 记录点光源数量
      hash.spotLength = spotLength; // 记录聚光灯数量
      hash.rectAreaLength = rectAreaLength; // 记录矩形区域光数量
      hash.hemiLength = hemiLength; // 记录半球光数量

      // 更新阴影相关的哈希值
      hash.numDirectionalShadows = numDirectionalShadows; // 记录平行光阴影数量
      hash.numPointShadows = numPointShadows; // 记录点光源阴影数量
      hash.numSpotShadows = numSpotShadows; // 记录聚光灯阴影数量
      hash.numSpotMaps = numSpotMaps; // 记录聚光灯贴图数量

      hash.numLightProbes = numLightProbes; // 记录光照探针数量

      // 更新状态版本号，表示灯光配置已发生变化
      // 这个版本号用于通知渲染器需要重新编译着色器或更新uniform
      state.version = nextVersion++;
    }
  }

  /**
   * 设置视图相关的灯光参数
   * 将灯光的位置和方向转换到相机视图空间中
   * 这是渲染管线中的重要步骤，确保灯光计算在正确的坐标系中进行
   * @param {Array} lights - 场景中的灯光数组
   * @param {Camera} camera - 当前相机对象
   */
  function setupView(lights, camera) {
    // 各类型灯光的计数器（用于索引state数组）
    let directionalLength = 0;
    let pointLength = 0;
    let spotLength = 0;
    let rectAreaLength = 0;
    let hemiLength = 0;

    // 获取相机的视图矩阵（世界空间到视图空间的变换）
    const viewMatrix = camera.matrixWorldInverse;

    // 遍历所有灯光，将其转换到视图空间
    for (let i = 0, l = lights.length; i < l; i++) {
      const light = lights[i];

      if (light.isDirectionalLight) {
        // 处理平行光的方向转换
        const uniforms = state.directional[directionalLength];

        // 计算平行光的方向向量（从光源位置指向目标位置）
        uniforms.direction.setFromMatrixPosition(light.matrixWorld);
        vector3.setFromMatrixPosition(light.target.matrixWorld);
        uniforms.direction.sub(vector3);
        // 将方向向量转换到视图空间
        uniforms.direction.transformDirection(viewMatrix);

        directionalLength++;
      } else if (light.isSpotLight) {
        // 处理聚光灯的位置和方向转换
        const uniforms = state.spot[spotLength];

        // 将聚光灯位置转换到视图空间
        uniforms.position.setFromMatrixPosition(light.matrixWorld);
        uniforms.position.applyMatrix4(viewMatrix);

        // 计算并转换聚光灯方向
        uniforms.direction.setFromMatrixPosition(light.matrixWorld);
        vector3.setFromMatrixPosition(light.target.matrixWorld);
        uniforms.direction.sub(vector3);
        uniforms.direction.transformDirection(viewMatrix);

        // 增加聚光灯计数
        spotLength++;
      } else if (light.isRectAreaLight) {
        // 处理矩形区域光的位置和方向转换
        const uniforms = state.rectArea[rectAreaLength];

        // 将矩形区域光位置转换到视图空间
        uniforms.position.setFromMatrixPosition(light.matrixWorld);
        uniforms.position.applyMatrix4(viewMatrix);

        // 提取灯光的局部旋转以计算宽度/高度半向量
        matrix42.identity(); // 重置辅助矩阵为单位矩阵
        matrix4.copy(light.matrixWorld); // 复制灯光的世界变换矩阵
        matrix4.premultiply(viewMatrix); // 左乘视图矩阵，得到视图空间中的变换
        matrix42.extractRotation(matrix4); // 提取旋转部分（去除位移和缩放）

        // 设置矩形区域光的半宽度和半高度向量（局部坐标系）
        uniforms.halfWidth.set(light.width * 0.5, 0.0, 0.0); // X轴方向的半宽度
        uniforms.halfHeight.set(0.0, light.height * 0.5, 0.0); // Y轴方向的半高度

        // 将半宽度和半高度向量转换到视图空间
        uniforms.halfWidth.applyMatrix4(matrix42); // 应用旋转变换到半宽度向量
        uniforms.halfHeight.applyMatrix4(matrix42); // 应用旋转变换到半高度向量

        // 增加矩形区域光计数
        rectAreaLength++;
      } else if (light.isPointLight) {
        // 处理点光源的位置转换
        const uniforms = state.point[pointLength];

        // 将点光源位置转换到视图空间
        uniforms.position.setFromMatrixPosition(light.matrixWorld);
        uniforms.position.applyMatrix4(viewMatrix);

        // 增加点光源计数
        pointLength++;
      } else if (light.isHemisphereLight) {
        // 处理半球光的方向转换
        const uniforms = state.hemi[hemiLength];

        // 将半球光方向转换到视图空间
        uniforms.direction.setFromMatrixPosition(light.matrixWorld); // 从世界矩阵中提取位置作为方向
        uniforms.direction.transformDirection(viewMatrix); // 将方向向量转换到视图空间

        // 增加半球光计数
        hemiLength++;
      }
    }
  }

  // 返回WebGL灯光管理器的公共接口
  return {
    /**
     * 设置灯光系统，处理所有灯光数据
     * @type {function(Array): void}
     */
    setup: setup,

    /**
     * 设置视图相关的灯光参数，转换到视图空间
     * @type {function(Array, Camera): void}
     */
    setupView: setupView,

    /**
     * 灯光系统的状态对象，包含所有灯光数据
     * @type {Object}
     */
    state: state,
  };
}

export { WebGLLights };
