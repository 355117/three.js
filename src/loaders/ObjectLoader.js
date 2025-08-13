// 导入纹理映射常量
import {
  UVMapping, // UV映射
  CubeReflectionMapping, // 立方体反射映射
  CubeRefractionMapping, // 立方体折射映射
  EquirectangularReflectionMapping, // 等距圆柱反射映射
  EquirectangularRefractionMapping, // 等距圆柱折射映射
  CubeUVReflectionMapping, // 立方体UV反射映射
  RepeatWrapping, // 重复包装
  ClampToEdgeWrapping, // 边缘夹紧包装
  MirroredRepeatWrapping, // 镜像重复包装
  NearestFilter, // 最近邻过滤
  NearestMipmapNearestFilter, // 最近邻Mipmap最近邻过滤
  NearestMipmapLinearFilter, // 最近邻Mipmap线性过滤
  LinearFilter, // 线性过滤
  LinearMipmapNearestFilter, // 线性Mipmap最近邻过滤
  LinearMipmapLinearFilter, // 线性Mipmap线性过滤
} from "../constants.js";
// 导入实例化缓冲区属性
import { InstancedBufferAttribute } from "../core/InstancedBufferAttribute.js";
// 导入颜色类
import { Color } from "../math/Color.js";
// 导入3D对象基类
import { Object3D } from "../core/Object3D.js";
// 导入各种3D对象类型
import { Group } from "../objects/Group.js"; // 组对象
import { InstancedMesh } from "../objects/InstancedMesh.js"; // 实例化网格
import { BatchedMesh } from "../objects/BatchedMesh.js"; // 批处理网格
import { Sprite } from "../objects/Sprite.js"; // 精灵对象
import { Points } from "../objects/Points.js"; // 点对象
import { Line } from "../objects/Line.js"; // 线对象
import { LineLoop } from "../objects/LineLoop.js"; // 线环对象
import { LineSegments } from "../objects/LineSegments.js"; // 线段对象
import { LOD } from "../objects/LOD.js"; // 细节层次对象
import { Mesh } from "../objects/Mesh.js"; // 网格对象
import { SkinnedMesh } from "../objects/SkinnedMesh.js"; // 蒙皮网格对象
import { Bone } from "../objects/Bone.js"; // 骨骼对象
import { Skeleton } from "../objects/Skeleton.js"; // 骨架对象
// 导入形状类
import { Shape } from "../extras/core/Shape.js";
// 导入雾效果类
import { Fog } from "../scenes/Fog.js"; // 线性雾
import { FogExp2 } from "../scenes/FogExp2.js"; // 指数雾
// 导入各种光源类型
import { HemisphereLight } from "../lights/HemisphereLight.js"; // 半球光
import { SpotLight } from "../lights/SpotLight.js"; // 聚光灯
import { PointLight } from "../lights/PointLight.js"; // 点光源
import { DirectionalLight } from "../lights/DirectionalLight.js"; // 平行光
import { AmbientLight } from "../lights/AmbientLight.js"; // 环境光
import { RectAreaLight } from "../lights/RectAreaLight.js"; // 矩形区域光
import { LightProbe } from "../lights/LightProbe.js"; // 光探针
// 导入相机类型
import { OrthographicCamera } from "../cameras/OrthographicCamera.js"; // 正交相机
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.js"; // 透视相机
// 导入场景类
import { Scene } from "../scenes/Scene.js";
// 导入纹理类型
import { CubeTexture } from "../textures/CubeTexture.js"; // 立方体纹理
import { Texture } from "../textures/Texture.js"; // 基础纹理
import { Source } from "../textures/Source.js"; // 纹理源
import { DataTexture } from "../textures/DataTexture.js"; // 数据纹理
// 导入加载器相关类
import { ImageLoader } from "./ImageLoader.js"; // 图像加载器
import { LoadingManager } from "./LoadingManager.js"; // 加载管理器
import { AnimationClip } from "../animation/AnimationClip.js"; // 动画剪辑
import { MaterialLoader } from "./MaterialLoader.js"; // 材质加载器
import { LoaderUtils } from "./LoaderUtils.js"; // 加载器工具
import { BufferGeometryLoader } from "./BufferGeometryLoader.js"; // 缓冲几何体加载器
import { Loader } from "./Loader.js"; // 基础加载器
import { FileLoader } from "./FileLoader.js"; // 文件加载器
// 导入所有几何体类型
import * as Geometries from "../geometries/Geometries.js";
// 导入工具函数
import { getTypedArray } from "../utils.js";
// 导入数学类
import { Box3 } from "../math/Box3.js"; // 3D包围盒
import { Sphere } from "../math/Sphere.js"; // 球体

/**
 * 用于加载 [JSON对象/场景格式]{@link https://github.com/mrdoob/three.js/wiki/JSON-Object-Scene-format-4} 的JSON资源的加载器。
 * 文件通过 {@link FileLoader} 内部加载。
 *
 * ```js
 * const loader = new THREE.ObjectLoader();
 * const obj = await loader.loadAsync( 'models/json/example.json' );
 * scene.add( obj );
 *
 * // 或者，解析先前加载的JSON结构
 * const object = await loader.parseAsync( a_json_object );
 * scene.add( object );
 * ```
 *
 * @augments Loader
 */
class ObjectLoader extends Loader {
  /**
   * 构造一个新的对象加载器。
   *
   * @param {LoadingManager} [manager] - 加载管理器。
   */
  constructor(manager) {
    // 调用父类构造函数
    super(manager);
  }

  /**
   * 从给定的URL开始加载，并将加载的3D对象传递给 `onLoad()` 回调函数。
   *
   * @param {string} url - 要加载的文件的路径/URL。这也可以是数据URI。
   * @param {function(Object3D)} onLoad - 加载过程完成时执行的回调函数。
   * @param {onProgressCallback} onProgress - 加载过程中执行的进度回调函数。
   * @param {onErrorCallback} onError - 发生错误时执行的错误回调函数。
   */
  load(url, onLoad, onProgress, onError) {
    // 保存当前作用域的引用
    const scope = this;

    // 确定资源路径
    const path = this.path === "" ? LoaderUtils.extractUrlBase(url) : this.path;
    this.resourcePath = this.resourcePath || path;

    // 创建文件加载器实例
    const loader = new FileLoader(this.manager);
    // 设置加载路径
    loader.setPath(this.path);
    // 设置请求头
    loader.setRequestHeader(this.requestHeader);
    // 设置是否携带凭证
    loader.setWithCredentials(this.withCredentials);
    // 开始加载文件
    loader.load(
      url,
      function (text) {
        // 初始化JSON变量
        let json = null;

        try {
          // 解析JSON文本
          json = JSON.parse(text);
        } catch (error) {
          // 处理JSON解析错误
          if (onError !== undefined) onError(error);

          console.error("THREE:ObjectLoader: Can't parse " + url + ".", error.message);

          return;
        }

        // 获取元数据
        const metadata = json.metadata;

        // 验证元数据格式
        if (metadata === undefined || metadata.type === undefined || metadata.type.toLowerCase() === "geometry") {
          if (onError !== undefined) onError(new Error("THREE.ObjectLoader: Can't load " + url));

          console.error("THREE.ObjectLoader: Can't load " + url);
          return;
        }

        // 解析JSON并调用回调
        scope.parse(json, onLoad);
      },
      onProgress,
      onError
    );
  }

  /**
   * {@link ObjectLoader#load} 的异步版本。
   *
   * @async
   * @param {string} url - 要加载的文件的路径/URL。这也可以是数据URI。
   * @param {onProgressCallback} onProgress - 加载过程中执行的进度回调函数。
   * @return {Promise<Object3D>} 解析为加载的3D对象的Promise。
   */
  async loadAsync(url, onProgress) {
    // 保存当前作用域的引用
    const scope = this;

    // 确定资源路径
    const path = this.path === "" ? LoaderUtils.extractUrlBase(url) : this.path;
    this.resourcePath = this.resourcePath || path;

    // 创建文件加载器实例
    const loader = new FileLoader(this.manager);
    // 设置加载路径
    loader.setPath(this.path);
    // 设置请求头
    loader.setRequestHeader(this.requestHeader);
    // 设置是否携带凭证
    loader.setWithCredentials(this.withCredentials);

    // 异步加载文件文本
    const text = await loader.loadAsync(url, onProgress);

    // 解析JSON文本
    const json = JSON.parse(text);

    // 获取元数据
    const metadata = json.metadata;

    // 验证元数据格式
    if (metadata === undefined || metadata.type === undefined || metadata.type.toLowerCase() === "geometry") {
      throw new Error("THREE.ObjectLoader: Can't load " + url);
    }

    // 异步解析JSON并返回结果
    return await scope.parseAsync(json);
  }

  /**
   * 解析给定的JSON。这由 {@link ObjectLoader#load} 内部使用，
   * 但也可以直接用于解析先前加载的JSON结构。
   *
   * @param {Object} json - 序列化的3D对象。
   * @param {onLoad} onLoad - 当所有资源（如纹理）完全加载后执行的回调函数。
   * @return {Object3D} 解析后的3D对象。
   */
  parse(json, onLoad) {
    // 解析动画数据
    const animations = this.parseAnimations(json.animations);
    // 解析形状数据
    const shapes = this.parseShapes(json.shapes);
    // 解析几何体数据
    const geometries = this.parseGeometries(json.geometries, shapes);

    // 解析图像数据，并设置完成回调
    const images = this.parseImages(json.images, function () {
      if (onLoad !== undefined) onLoad(object);
    });

    // 解析纹理数据
    const textures = this.parseTextures(json.textures, images);
    // 解析材质数据
    const materials = this.parseMaterials(json.materials, textures);

    // 解析主对象
    const object = this.parseObject(json.object, geometries, materials, textures, animations);
    // 解析骨架数据
    const skeletons = this.parseSkeletons(json.skeletons, object);

    // 绑定骨架到对象
    this.bindSkeletons(object, skeletons);
    // 绑定光源目标
    this.bindLightTargets(object);

    // 处理加载完成回调

    if (onLoad !== undefined) {
      // 检查是否有图像需要加载
      let hasImages = false;

      for (const uuid in images) {
        if (images[uuid].data instanceof HTMLImageElement) {
          hasImages = true;
          break;
        }
      }

      // 如果没有图像需要加载，立即调用回调
      if (hasImages === false) onLoad(object);
    }

    // 返回解析完成的对象
    return object;
  }

  /**
   * {@link ObjectLoader#parse} 的异步版本。
   *
   * @param {Object} json - 序列化的3D对象。
   * @return {Promise<Object3D>} 解析为解析后的3D对象的Promise。
   */
  async parseAsync(json) {
    // 解析动画数据
    const animations = this.parseAnimations(json.animations);
    // 解析形状数据
    const shapes = this.parseShapes(json.shapes);
    // 解析几何体数据
    const geometries = this.parseGeometries(json.geometries, shapes);

    // 异步解析图像数据
    const images = await this.parseImagesAsync(json.images);

    // 解析纹理数据
    const textures = this.parseTextures(json.textures, images);
    // 解析材质数据
    const materials = this.parseMaterials(json.materials, textures);

    // 解析主对象
    const object = this.parseObject(json.object, geometries, materials, textures, animations);
    // 解析骨架数据
    const skeletons = this.parseSkeletons(json.skeletons, object);

    // 绑定骨架到对象
    this.bindSkeletons(object, skeletons);
    // 绑定光源目标
    this.bindLightTargets(object);

    // 返回解析完成的对象
    return object;
  }

  // 内部方法

  /**
   * 解析形状数据
   * @param {Array} json - 形状数据数组
   * @return {Object} 形状字典
   */
  parseShapes(json) {
    // 初始化形状字典
    const shapes = {};

    if (json !== undefined) {
      // 遍历所有形状数据
      for (let i = 0, l = json.length; i < l; i++) {
        // 从JSON创建形状对象
        const shape = new Shape().fromJSON(json[i]);

        // 将形状存储到字典中
        shapes[shape.uuid] = shape;
      }
    }

    // 返回形状字典
    return shapes;
  }

  /**
   * 解析骨架数据
   * @param {Array} json - 骨架数据数组
   * @param {Object3D} object - 包含骨骼的对象
   * @return {Object} 骨架字典
   */
  parseSkeletons(json, object) {
    // 初始化骨架和骨骼字典
    const skeletons = {};
    const bones = {};

    // 生成骨骼查找表

    object.traverse(function (child) {
      // 如果是骨骼对象，添加到查找表
      if (child.isBone) bones[child.uuid] = child;
    });

    // 创建骨架

    if (json !== undefined) {
      // 遍历所有骨架数据
      for (let i = 0, l = json.length; i < l; i++) {
        // 从JSON创建骨架对象
        const skeleton = new Skeleton().fromJSON(json[i], bones);

        // 将骨架存储到字典中
        skeletons[skeleton.uuid] = skeleton;
      }
    }

    // 返回骨架字典
    return skeletons;
  }

  /**
   * 解析几何体数据
   * @param {Array} json - 几何体数据数组
   * @param {Object} shapes - 形状字典
   * @return {Object} 几何体字典
   */
  parseGeometries(json, shapes) {
    // 初始化几何体字典
    const geometries = {};

    if (json !== undefined) {
      // 创建缓冲几何体加载器
      const bufferGeometryLoader = new BufferGeometryLoader();

      // 遍历所有几何体数据
      for (let i = 0, l = json.length; i < l; i++) {
        let geometry;
        const data = json[i];

        // 根据几何体类型进行解析
        switch (data.type) {
          case "BufferGeometry":
          case "InstancedBufferGeometry":
            // 使用缓冲几何体加载器解析
            geometry = bufferGeometryLoader.parse(data);
            break;

          default:
            // 检查是否为已知的几何体类型
            if (data.type in Geometries) {
              // 从JSON创建几何体
              geometry = Geometries[data.type].fromJSON(data, shapes);
            } else {
              console.warn(`THREE.ObjectLoader: Unsupported geometry type "${data.type}"`);
            }
        }

        geometry.uuid = data.uuid;

        if (data.name !== undefined) geometry.name = data.name;
        if (data.userData !== undefined) geometry.userData = data.userData;

        geometries[data.uuid] = geometry;
      }
    }

    return geometries;
  }

  /**
   * 解析材质数据
   * @param {Array} json - 材质数据数组
   * @param {Object} textures - 纹理字典
   * @return {Object} 材质字典
   */
  parseMaterials(json, textures) {
    // 初始化缓存和材质字典（用于多材质支持）
    const cache = {}; // MultiMaterial
    const materials = {};

    if (json !== undefined) {
      // 创建材质加载器
      const loader = new MaterialLoader();
      // 设置纹理字典到加载器
      loader.setTextures(textures);

      // 遍历所有材质数据
      for (let i = 0, l = json.length; i < l; i++) {
        const data = json[i];

        // 检查缓存中是否已存在该材质
        if (cache[data.uuid] === undefined) {
          // 解析材质数据并存储到缓存
          cache[data.uuid] = loader.parse(data);
        }

        // 将材质从缓存复制到材质字典
        materials[data.uuid] = cache[data.uuid];
      }
    }

    // 返回材质字典
    return materials;
  }

  /**
   * 解析动画数据
   * @param {Array} json - 动画数据数组
   * @return {Object} 动画字典
   */
  parseAnimations(json) {
    // 初始化动画字典
    const animations = {};

    if (json !== undefined) {
      // 遍历所有动画数据
      for (let i = 0; i < json.length; i++) {
        const data = json[i];

        // 解析动画剪辑
        const clip = AnimationClip.parse(data);

        // 将动画剪辑存储到字典中
        animations[clip.uuid] = clip;
      }
    }

    // 返回动画字典
    return animations;
  }

  /**
   * 解析图像数据
   * @param {Array} json - 图像数据数组
   * @param {Function} onLoad - 加载完成回调函数
   * @return {Object} 图像字典
   */
  parseImages(json, onLoad) {
    // 保存当前作用域的引用
    const scope = this;
    // 初始化图像字典
    const images = {};

    let loader;

    // 内部函数：加载图像
    function loadImage(url) {
      // 通知管理器开始加载项
      scope.manager.itemStart(url);

      // 加载图像并返回Promise
      return loader.load(
        url,
        function () {
          // 加载成功，通知管理器结束加载项
          scope.manager.itemEnd(url);
        },
        undefined,
        function () {
          // 加载失败，通知管理器错误和结束加载项
          scope.manager.itemError(url);
          scope.manager.itemEnd(url);
        }
      );
    }

    // 内部函数：反序列化图像数据
    function deserializeImage(image) {
      if (typeof image === "string") {
        // 如果图像是字符串URL
        const url = image;

        // 检查URL是否为绝对路径，否则使用资源路径
        const path = /^(\/\/)|([a-z]+:(\/\/)?)/i.test(url) ? url : scope.resourcePath + url;

        // 加载图像
        return loadImage(path);
      } else {
        // 如果图像是数据对象
        if (image.data) {
          // 返回包含类型化数组数据的对象
          return {
            data: getTypedArray(image.type, image.data),
            width: image.width,
            height: image.height,
          };
        } else {
          // 无效的图像数据
          return null;
        }
      }
    }

    if (json !== undefined && json.length > 0) {
      // 创建加载管理器，传入完成回调
      const manager = new LoadingManager(onLoad);

      // 创建图像加载器实例
      loader = new ImageLoader(manager);
      // 设置跨域属性
      loader.setCrossOrigin(this.crossOrigin);

      // 遍历所有图像数据
      for (let i = 0, il = json.length; i < il; i++) {
        const image = json[i];
        const url = image.url;

        if (Array.isArray(url)) {
          // 加载图像数组（例如立方体纹理）

          const imageArray = [];

          // 遍历URL数组中的每个URL
          for (let j = 0, jl = url.length; j < jl; j++) {
            const currentUrl = url[j];

            // 反序列化当前图像
            const deserializedImage = deserializeImage(currentUrl);

            if (deserializedImage !== null) {
              if (deserializedImage instanceof HTMLImageElement) {
                // 如果是HTML图像元素，直接添加
                imageArray.push(deserializedImage);
              } else {
                // 特殊情况：处理立方体纹理的数据纹理数组

                imageArray.push(new DataTexture(deserializedImage.data, deserializedImage.width, deserializedImage.height));
              }
            }
          }

          // 创建图像源并存储到字典
          images[image.uuid] = new Source(imageArray);
        } else {
          // 加载单个图像

          const deserializedImage = deserializeImage(image.url);
          // 创建图像源并存储到字典
          images[image.uuid] = new Source(deserializedImage);
        }
      }
    }

    return images;
  }

  /**
   * 异步解析图像数据
   * @param {Array} json - 图像数据数组
   * @return {Promise<Object>} 图像字典的Promise
   */
  async parseImagesAsync(json) {
    // 保存当前作用域的引用
    const scope = this;
    // 初始化图像字典
    const images = {};

    let loader;

    // 内部异步函数：反序列化图像数据
    async function deserializeImage(image) {
      if (typeof image === "string") {
        // 如果图像是字符串URL
        const url = image;

        // 检查URL是否为绝对路径，否则使用资源路径
        const path = /^(\/\/)|([a-z]+:(\/\/)?)/i.test(url) ? url : scope.resourcePath + url;

        // 异步加载图像
        return await loader.loadAsync(path);
      } else {
        // 如果图像是数据对象
        if (image.data) {
          // 返回包含类型化数组数据的对象
          return {
            data: getTypedArray(image.type, image.data),
            width: image.width,
            height: image.height,
          };
        } else {
          // 无效的图像数据
          return null;
        }
      }
    }

    if (json !== undefined && json.length > 0) {
      // 创建图像加载器实例
      loader = new ImageLoader(this.manager);
      // 设置跨域属性
      loader.setCrossOrigin(this.crossOrigin);

      // 遍历所有图像数据
      for (let i = 0, il = json.length; i < il; i++) {
        const image = json[i];
        const url = image.url;

        if (Array.isArray(url)) {
          // 加载图像数组（例如立方体纹理）

          const imageArray = [];

          // 遍历URL数组中的每个URL
          for (let j = 0, jl = url.length; j < jl; j++) {
            const currentUrl = url[j];

            // 异步反序列化当前图像
            const deserializedImage = await deserializeImage(currentUrl);

            if (deserializedImage !== null) {
              if (deserializedImage instanceof HTMLImageElement) {
                // 如果是HTML图像元素，直接添加
                imageArray.push(deserializedImage);
              } else {
                // 特殊情况：处理立方体纹理的数据纹理数组

                imageArray.push(new DataTexture(deserializedImage.data, deserializedImage.width, deserializedImage.height));
              }
            }
          }

          // 创建图像源并存储到字典
          images[image.uuid] = new Source(imageArray);
        } else {
          // 加载单个图像

          const deserializedImage = await deserializeImage(image.url);
          // 创建图像源并存储到字典
          images[image.uuid] = new Source(deserializedImage);
        }
      }
    }

    return images;
  }

  /**
   * 解析纹理数据
   * @param {Array} json - 纹理数据数组
   * @param {Object} images - 图像字典
   * @return {Object} 纹理字典
   */
  parseTextures(json, images) {
    // 内部函数：解析常量值
    function parseConstant(value, type) {
      // 如果值已经是数字，直接返回
      if (typeof value === "number") return value;

      // 发出警告：常量应该是数字形式
      console.warn("THREE.ObjectLoader.parseTexture: Constant should be in numeric form.", value);

      // 从类型映射表中查找对应的常量值
      return type[value];
    }

    // 初始化纹理字典
    const textures = {};

    if (json !== undefined) {
      // 遍历所有纹理数据
      for (let i = 0, l = json.length; i < l; i++) {
        const data = json[i];

        // 检查是否指定了图像
        if (data.image === undefined) {
          console.warn('THREE.ObjectLoader: No "image" specified for', data.uuid);
        }

        // 检查图像是否存在
        if (images[data.image] === undefined) {
          console.warn("THREE.ObjectLoader: Undefined image", data.image);
        }

        // 获取图像源和图像数据
        const source = images[data.image];
        const image = source.data;

        let texture;

        // 根据图像类型创建相应的纹理
        if (Array.isArray(image)) {
          // 如果是图像数组，创建立方体纹理
          texture = new CubeTexture();

          // 如果有6个面的图像，标记需要更新
          if (image.length === 6) texture.needsUpdate = true;
        } else {
          // 如果是单个图像
          if (image && image.data) {
            // 如果有数据，创建数据纹理
            texture = new DataTexture();
          } else {
            // 否则创建普通纹理
            texture = new Texture();
          }

          // 如果有图像数据，标记需要更新（纹理可能有未定义的图像数据）
          if (image) texture.needsUpdate = true;
        }

        // 设置纹理源
        texture.source = source;

        // 设置纹理UUID
        texture.uuid = data.uuid;

        // 设置纹理名称（如果有）
        if (data.name !== undefined) texture.name = data.name;

        // 设置纹理映射方式和通道
        if (data.mapping !== undefined) texture.mapping = parseConstant(data.mapping, TEXTURE_MAPPING);
        if (data.channel !== undefined) texture.channel = data.channel;

        // 设置纹理变换属性
        if (data.offset !== undefined) texture.offset.fromArray(data.offset);
        if (data.repeat !== undefined) texture.repeat.fromArray(data.repeat);
        if (data.center !== undefined) texture.center.fromArray(data.center);
        if (data.rotation !== undefined) texture.rotation = data.rotation;

        // 设置纹理包装方式
        if (data.wrap !== undefined) {
          texture.wrapS = parseConstant(data.wrap[0], TEXTURE_WRAPPING);
          texture.wrapT = parseConstant(data.wrap[1], TEXTURE_WRAPPING);
        }

        // 设置纹理格式属性
        if (data.format !== undefined) texture.format = data.format;
        if (data.internalFormat !== undefined) texture.internalFormat = data.internalFormat;
        if (data.type !== undefined) texture.type = data.type;
        if (data.colorSpace !== undefined) texture.colorSpace = data.colorSpace;

        // 设置纹理过滤器
        if (data.minFilter !== undefined) texture.minFilter = parseConstant(data.minFilter, TEXTURE_FILTER);
        if (data.magFilter !== undefined) texture.magFilter = parseConstant(data.magFilter, TEXTURE_FILTER);
        if (data.anisotropy !== undefined) texture.anisotropy = data.anisotropy;

        // 设置Y轴翻转
        if (data.flipY !== undefined) texture.flipY = data.flipY;

        // 设置其他纹理属性
        if (data.generateMipmaps !== undefined) texture.generateMipmaps = data.generateMipmaps;
        if (data.premultiplyAlpha !== undefined) texture.premultiplyAlpha = data.premultiplyAlpha;
        if (data.unpackAlignment !== undefined) texture.unpackAlignment = data.unpackAlignment;
        if (data.compareFunction !== undefined) texture.compareFunction = data.compareFunction;

        // 设置用户数据
        if (data.userData !== undefined) texture.userData = data.userData;

        // 将纹理存储到字典中
        textures[data.uuid] = texture;
      }
    }

    // 返回纹理字典
    return textures;
  }

  /**
   * 解析对象数据
   * @param {Object} data - 对象数据
   * @param {Object} geometries - 几何体字典
   * @param {Object} materials - 材质字典
   * @param {Object} textures - 纹理字典
   * @param {Object} animations - 动画字典
   * @return {Object3D} 解析后的3D对象
   */
  parseObject(data, geometries, materials, textures, animations) {
    let object;

    // 内部函数：获取几何体
    function getGeometry(name) {
      if (geometries[name] === undefined) {
        console.warn("THREE.ObjectLoader: Undefined geometry", name);
      }

      return geometries[name];
    }

    // 内部函数：获取材质
    function getMaterial(name) {
      if (name === undefined) return undefined;

      if (Array.isArray(name)) {
        // 如果是材质数组
        const array = [];

        for (let i = 0, l = name.length; i < l; i++) {
          const uuid = name[i];

          if (materials[uuid] === undefined) {
            console.warn("THREE.ObjectLoader: Undefined material", uuid);
          }

          array.push(materials[uuid]);
        }

        return array;
      }

      // 如果是单个材质
      if (materials[name] === undefined) {
        console.warn("THREE.ObjectLoader: Undefined material", name);
      }

      return materials[name];
    }

    // 内部函数：获取纹理
    function getTexture(uuid) {
      if (textures[uuid] === undefined) {
        console.warn("THREE.ObjectLoader: Undefined texture", uuid);
      }

      return textures[uuid];
    }

    // 声明几何体和材质变量
    let geometry, material;

    // 根据对象类型创建相应的对象
    switch (data.type) {
      case "Scene":
        // 创建场景对象
        object = new Scene();

        // 设置场景背景
        if (data.background !== undefined) {
          if (Number.isInteger(data.background)) {
            // 如果背景是整数，创建颜色背景
            object.background = new Color(data.background);
          } else {
            // 否则使用纹理背景
            object.background = getTexture(data.background);
          }
        }

        // 设置环境贴图
        if (data.environment !== undefined) {
          object.environment = getTexture(data.environment);
        }

        // 设置雾效果
        if (data.fog !== undefined) {
          if (data.fog.type === "Fog") {
            // 创建线性雾
            object.fog = new Fog(data.fog.color, data.fog.near, data.fog.far);
          } else if (data.fog.type === "FogExp2") {
            // 创建指数雾
            object.fog = new FogExp2(data.fog.color, data.fog.density);
          }

          // 设置雾的名称
          if (data.fog.name !== "") {
            object.fog.name = data.fog.name;
          }
        }

        // 设置背景模糊度
        if (data.backgroundBlurriness !== undefined) object.backgroundBlurriness = data.backgroundBlurriness;
        // 设置背景强度
        if (data.backgroundIntensity !== undefined) object.backgroundIntensity = data.backgroundIntensity;
        // 设置背景旋转
        if (data.backgroundRotation !== undefined) object.backgroundRotation.fromArray(data.backgroundRotation);

        // 设置环境强度
        if (data.environmentIntensity !== undefined) object.environmentIntensity = data.environmentIntensity;
        // 设置环境旋转
        if (data.environmentRotation !== undefined) object.environmentRotation.fromArray(data.environmentRotation);

        break;

      case "PerspectiveCamera":
        // 创建透视相机（视野角、宽高比、近裁剪面、远裁剪面）
        object = new PerspectiveCamera(data.fov, data.aspect, data.near, data.far);

        // 设置相机的可选属性
        if (data.focus !== undefined) object.focus = data.focus; // 焦点距离
        if (data.zoom !== undefined) object.zoom = data.zoom; // 缩放因子
        if (data.filmGauge !== undefined) object.filmGauge = data.filmGauge; // 胶片尺寸
        if (data.filmOffset !== undefined) object.filmOffset = data.filmOffset; // 胶片偏移
        if (data.view !== undefined) object.view = Object.assign({}, data.view); // 视图设置

        break;

      case "OrthographicCamera":
        // 创建正交相机（左、右、上、下、近裁剪面、远裁剪面）
        object = new OrthographicCamera(data.left, data.right, data.top, data.bottom, data.near, data.far);

        // 设置相机的可选属性
        if (data.zoom !== undefined) object.zoom = data.zoom; // 缩放因子
        if (data.view !== undefined) object.view = Object.assign({}, data.view); // 视图设置

        break;

      case "AmbientLight":
        // 创建环境光（颜色、强度）
        object = new AmbientLight(data.color, data.intensity);

        break;

      case "DirectionalLight":
        // 创建平行光（颜色、强度）
        object = new DirectionalLight(data.color, data.intensity);
        // 设置光源目标
        object.target = data.target || "";

        break;

      case "PointLight":
        // 创建点光源（颜色、强度、距离、衰减）
        object = new PointLight(data.color, data.intensity, data.distance, data.decay);

        break;

      case "RectAreaLight":
        // 创建矩形区域光（颜色、强度、宽度、高度）
        object = new RectAreaLight(data.color, data.intensity, data.width, data.height);

        break;

      case "SpotLight":
        // 创建聚光灯（颜色、强度、距离、角度、半影、衰减）
        object = new SpotLight(data.color, data.intensity, data.distance, data.angle, data.penumbra, data.decay);
        // 设置光源目标
        object.target = data.target || "";

        break;

      case "HemisphereLight":
        // 创建半球光（天空颜色、地面颜色、强度）
        object = new HemisphereLight(data.color, data.groundColor, data.intensity);

        break;

      case "LightProbe":
        // 创建光探针并从JSON数据恢复
        object = new LightProbe().fromJSON(data);

        break;

      case "SkinnedMesh":
        // 获取几何体和材质
        geometry = getGeometry(data.geometry);
        material = getMaterial(data.material);

        // 创建蒙皮网格
        object = new SkinnedMesh(geometry, material);

        // 设置蒙皮网格的特殊属性
        if (data.bindMode !== undefined) object.bindMode = data.bindMode; // 绑定模式
        if (data.bindMatrix !== undefined) object.bindMatrix.fromArray(data.bindMatrix); // 绑定矩阵
        if (data.skeleton !== undefined) object.skeleton = data.skeleton; // 骨架引用

        break;

      case "Mesh":
        // 获取几何体和材质
        geometry = getGeometry(data.geometry);
        material = getMaterial(data.material);

        // 创建普通网格
        object = new Mesh(geometry, material);

        break;

      case "InstancedMesh":
        // 获取几何体和材质
        geometry = getGeometry(data.geometry);
        material = getMaterial(data.material);
        // 获取实例数量和实例数据
        const count = data.count;
        const instanceMatrix = data.instanceMatrix;
        const instanceColor = data.instanceColor;

        // 创建实例化网格
        object = new InstancedMesh(geometry, material, count);
        // 设置实例矩阵属性（每个实例16个浮点数）
        object.instanceMatrix = new InstancedBufferAttribute(new Float32Array(instanceMatrix.array), 16);
        // 设置实例颜色属性（如果有）
        if (instanceColor !== undefined) object.instanceColor = new InstancedBufferAttribute(new Float32Array(instanceColor.array), instanceColor.itemSize);

        break;

      case "BatchedMesh":
        // 获取几何体和材质
        geometry = getGeometry(data.geometry);
        material = getMaterial(data.material);

        // 创建批处理网格（最大实例数、最大顶点数、最大索引数、材质）
        object = new BatchedMesh(data.maxInstanceCount, data.maxVertexCount, data.maxIndexCount, material);
        // 设置几何体
        object.geometry = geometry;
        // 设置渲染优化选项
        object.perObjectFrustumCulled = data.perObjectFrustumCulled; // 每对象视锥体剔除
        object.sortObjects = data.sortObjects; // 对象排序

        // 设置绘制范围和保留范围
        object._drawRanges = data.drawRanges;
        object._reservedRanges = data.reservedRanges;

        // 映射几何体信息，重建包围盒和包围球
        object._geometryInfo = data.geometryInfo.map((info) => {
          let box = null;
          let sphere = null;
          // 重建包围盒
          if (info.boundingBox !== undefined) {
            box = new Box3().fromJSON(info.boundingBox);
          }

          // 重建包围球
          if (info.boundingSphere !== undefined) {
            sphere = new Sphere().fromJSON(info.boundingSphere);
          }

          // 返回更新后的几何体信息
          return {
            ...info,
            boundingBox: box,
            boundingSphere: sphere,
          };
        });
        // 设置实例信息
        object._instanceInfo = data.instanceInfo;

        // 设置可用ID列表
        object._availableInstanceIds = data._availableInstanceIds;
        object._availableGeometryIds = data._availableGeometryIds;

        // 设置下一个起始位置
        object._nextIndexStart = data.nextIndexStart;
        object._nextVertexStart = data.nextVertexStart;
        object._geometryCount = data.geometryCount;

        // 设置最大计数
        object._maxInstanceCount = data.maxInstanceCount;
        object._maxVertexCount = data.maxVertexCount;
        object._maxIndexCount = data.maxIndexCount;

        // 设置初始化状态
        object._geometryInitialized = data.geometryInitialized;

        // 设置矩阵纹理
        object._matricesTexture = getTexture(data.matricesTexture.uuid);

        // 设置间接纹理
        object._indirectTexture = getTexture(data.indirectTexture.uuid);

        // 设置颜色纹理（如果有）
        if (data.colorsTexture !== undefined) {
          object._colorsTexture = getTexture(data.colorsTexture.uuid);
        }

        // 设置包围球（如果有）
        if (data.boundingSphere !== undefined) {
          object.boundingSphere = new Sphere().fromJSON(data.boundingSphere);
        }

        // 设置包围盒（如果有）
        if (data.boundingBox !== undefined) {
          object.boundingBox = new Box3().fromJSON(data.boundingBox);
        }

        break;

      case "LOD":
        // 创建细节层次对象
        object = new LOD();

        break;

      case "Line":
        // 创建线对象
        object = new Line(getGeometry(data.geometry), getMaterial(data.material));

        break;

      case "LineLoop":
        // 创建线环对象
        object = new LineLoop(getGeometry(data.geometry), getMaterial(data.material));

        break;

      case "LineSegments":
        // 创建线段对象
        object = new LineSegments(getGeometry(data.geometry), getMaterial(data.material));

        break;

      case "PointCloud":
      case "Points":
        // 创建点对象（兼容旧的PointCloud名称）
        object = new Points(getGeometry(data.geometry), getMaterial(data.material));

        break;

      case "Sprite":
        // 创建精灵对象
        object = new Sprite(getMaterial(data.material));

        break;

      case "Group":
        // 创建组对象
        object = new Group();

        break;

      case "Bone":
        // 创建骨骼对象
        object = new Bone();

        break;

      default:
        // 默认创建基础3D对象
        object = new Object3D();
    }

    // 设置对象UUID
    object.uuid = data.uuid;

    // 设置对象名称
    if (data.name !== undefined) object.name = data.name;

    // 设置变换矩阵或变换组件
    if (data.matrix !== undefined) {
      // 如果有矩阵数据，从数组恢复矩阵
      object.matrix.fromArray(data.matrix);

      // 设置矩阵自动更新标志
      if (data.matrixAutoUpdate !== undefined) object.matrixAutoUpdate = data.matrixAutoUpdate;
      // 如果启用自动更新，将矩阵分解为位置、旋转和缩放
      if (object.matrixAutoUpdate) object.matrix.decompose(object.position, object.quaternion, object.scale);
    } else {
      // 否则分别设置变换组件
      if (data.position !== undefined) object.position.fromArray(data.position); // 位置
      if (data.rotation !== undefined) object.rotation.fromArray(data.rotation); // 欧拉角旋转
      if (data.quaternion !== undefined) object.quaternion.fromArray(data.quaternion); // 四元数旋转
      if (data.scale !== undefined) object.scale.fromArray(data.scale); // 缩放
    }

    // 设置上方向向量
    if (data.up !== undefined) object.up.fromArray(data.up);

    // 设置阴影属性
    if (data.castShadow !== undefined) object.castShadow = data.castShadow; // 投射阴影
    if (data.receiveShadow !== undefined) object.receiveShadow = data.receiveShadow; // 接收阴影

    // 设置阴影详细属性
    if (data.shadow) {
      if (data.shadow.intensity !== undefined) object.shadow.intensity = data.shadow.intensity; // 阴影强度
      if (data.shadow.bias !== undefined) object.shadow.bias = data.shadow.bias; // 阴影偏移
      if (data.shadow.normalBias !== undefined) object.shadow.normalBias = data.shadow.normalBias; // 法线偏移
      if (data.shadow.radius !== undefined) object.shadow.radius = data.shadow.radius; // 阴影半径
      if (data.shadow.mapSize !== undefined) object.shadow.mapSize.fromArray(data.shadow.mapSize); // 阴影贴图尺寸
      if (data.shadow.camera !== undefined) object.shadow.camera = this.parseObject(data.shadow.camera); // 阴影相机
    }

    // 设置渲染属性
    if (data.visible !== undefined) object.visible = data.visible; // 可见性
    if (data.frustumCulled !== undefined) object.frustumCulled = data.frustumCulled; // 视锥体剔除
    if (data.renderOrder !== undefined) object.renderOrder = data.renderOrder; // 渲染顺序
    if (data.userData !== undefined) object.userData = data.userData; // 用户数据
    if (data.layers !== undefined) object.layers.mask = data.layers; // 图层掩码

    // 添加子对象
    if (data.children !== undefined) {
      const children = data.children;

      // 递归解析并添加每个子对象
      for (let i = 0; i < children.length; i++) {
        object.add(this.parseObject(children[i], geometries, materials, textures, animations));
      }
    }

    // 添加动画
    if (data.animations !== undefined) {
      const objectAnimations = data.animations;

      // 遍历动画UUID列表
      for (let i = 0; i < objectAnimations.length; i++) {
        const uuid = objectAnimations[i];

        // 将动画添加到对象的动画列表
        object.animations.push(animations[uuid]);
      }
    }

    // 处理LOD（细节层次）对象的特殊设置
    if (data.type === "LOD") {
      // 设置自动更新标志
      if (data.autoUpdate !== undefined) object.autoUpdate = data.autoUpdate;

      // 获取细节层次级别
      const levels = data.levels;

      // 遍历每个细节层次级别
      for (let l = 0; l < levels.length; l++) {
        const level = levels[l];
        // 通过UUID查找子对象
        const child = object.getObjectByProperty("uuid", level.object);

        if (child !== undefined) {
          // 添加细节层次级别（子对象、距离、滞后）
          object.addLevel(child, level.distance, level.hysteresis);
        }
      }
    }

    // 返回解析完成的对象
    return object;
  }

  /**
   * 绑定骨架到对象
   * @param {Object3D} object - 要绑定骨架的对象
   * @param {Object} skeletons - 骨架字典
   */
  bindSkeletons(object, skeletons) {
    // 如果没有骨架，直接返回
    if (Object.keys(skeletons).length === 0) return;

    // 遍历对象树
    object.traverse(function (child) {
      // 如果是蒙皮网格且有骨架定义
      if (child.isSkinnedMesh === true && child.skeleton !== undefined) {
        const skeleton = skeletons[child.skeleton];

        if (skeleton === undefined) {
          // 骨架未找到时发出警告
          console.warn("THREE.ObjectLoader: No skeleton found with UUID:", child.skeleton);
        } else {
          // 绑定骨架到蒙皮网格
          child.bind(skeleton, child.bindMatrix);
        }
      }
    });
  }

  /**
   * 绑定光源目标
   * @param {Object3D} object - 要绑定光源目标的对象
   */
  bindLightTargets(object) {
    // 遍历对象树
    object.traverse(function (child) {
      // 如果是平行光或聚光灯
      if (child.isDirectionalLight || child.isSpotLight) {
        const uuid = child.target;

        // 查找目标对象
        const target = object.getObjectByProperty("uuid", uuid);

        if (target !== undefined) {
          // 设置找到的目标
          child.target = target;
        } else {
          // 创建默认目标对象
          child.target = new Object3D();
        }
      }
    });
  }
}

// 纹理映射常量映射表
const TEXTURE_MAPPING = {
  UVMapping: UVMapping, // UV映射
  CubeReflectionMapping: CubeReflectionMapping, // 立方体反射映射
  CubeRefractionMapping: CubeRefractionMapping, // 立方体折射映射
  EquirectangularReflectionMapping: EquirectangularReflectionMapping, // 等距圆柱反射映射
  EquirectangularRefractionMapping: EquirectangularRefractionMapping, // 等距圆柱折射映射
  CubeUVReflectionMapping: CubeUVReflectionMapping, // 立方体UV反射映射
};

// 纹理包装常量映射表
const TEXTURE_WRAPPING = {
  RepeatWrapping: RepeatWrapping, // 重复包装
  ClampToEdgeWrapping: ClampToEdgeWrapping, // 边缘夹紧包装
  MirroredRepeatWrapping: MirroredRepeatWrapping, // 镜像重复包装
};

// 纹理过滤常量映射表
const TEXTURE_FILTER = {
  NearestFilter: NearestFilter, // 最近邻过滤
  NearestMipmapNearestFilter: NearestMipmapNearestFilter, // 最近邻Mipmap最近邻过滤
  NearestMipmapLinearFilter: NearestMipmapLinearFilter, // 最近邻Mipmap线性过滤
  LinearFilter: LinearFilter, // 线性过滤
  LinearMipmapNearestFilter: LinearMipmapNearestFilter, // 线性Mipmap最近邻过滤
  LinearMipmapLinearFilter: LinearMipmapLinearFilter, // 线性Mipmap线性过滤
};

// 导出ObjectLoader类
export { ObjectLoader };
