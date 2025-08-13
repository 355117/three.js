// 导入球体类，用于表示几何体的包围球
import { Sphere } from "../math/Sphere.js";
// 导入缓冲区属性类，用于存储几何体的顶点数据
import { BufferAttribute } from "../core/BufferAttribute.js";
// 导入缓冲区几何体类，用于表示几何体对象
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入文件加载器类，用于处理文件的异步加载
import { FileLoader } from "./FileLoader.js";
// 导入基础加载器类，提供加载器的基本功能
import { Loader } from "./Loader.js";
// 导入实例化缓冲区几何体类，用于实例化渲染
import { InstancedBufferGeometry } from "../core/InstancedBufferGeometry.js";
// 导入实例化缓冲区属性类，用于实例化渲染的属性数据
import { InstancedBufferAttribute } from "../core/InstancedBufferAttribute.js";
// 导入交错缓冲区属性类，用于处理交错存储的顶点数据
import { InterleavedBufferAttribute } from "../core/InterleavedBufferAttribute.js";
// 导入交错缓冲区类，用于存储交错的顶点数据
import { InterleavedBuffer } from "../core/InterleavedBuffer.js";
// 导入工具函数，用于获取类型化数组
import { getTypedArray } from "../utils.js";

/**
 * 用于加载几何体的类。文件内部通过 {@link FileLoader} 进行加载。
 * Class for loading geometries. The files are internally
 * loaded via {@link FileLoader}.
 *
 * ```js
 * const loader = new THREE.BufferGeometryLoader();
 * const geometry = await loader.loadAsync( 'models/json/pressure.json' );
 *
 * const material = new THREE.MeshBasicMaterial( { color: 0xF5F5F5 } );
 * const object = new THREE.Mesh( geometry, material );
 * scene.add( object );
 * ```
 *
 * @augments Loader
 */
class BufferGeometryLoader extends Loader {
  /**
   * 构造一个新的几何体加载器。
   * Constructs a new geometry loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器。The loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数，传入加载管理器
    super(manager);
  }

  /**
   * 从给定的URL开始加载，并将加载的几何体传递给 `onLoad()` 回调函数。
   * Starts loading from the given URL and pass the loaded geometry to the `onLoad()` callback.
   *
   * @param {string} url - 要加载的文件路径/URL。也可以是数据URI。The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(BufferGeometry)} onLoad - 加载过程完成时执行的回调函数。Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - 加载过程中执行的进度回调函数。Executed while the loading is in progress.
   * @param {onErrorCallback} onError - 发生错误时执行的错误回调函数。Executed when errors occur.
   */
  load(url, onLoad, onProgress, onError) {
    // 保存当前实例的引用，用于在回调函数中访问
    const scope = this;

    // 创建文件加载器实例，传入加载管理器
    const loader = new FileLoader(scope.manager);
    // 设置文件加载路径
    loader.setPath(scope.path);
    // 设置请求头信息
    loader.setRequestHeader(scope.requestHeader);
    // 设置是否携带凭证信息
    loader.setWithCredentials(scope.withCredentials);
    // 开始加载文件，传入URL和回调函数
    loader.load(
      url,
      function (text) {
        // 使用try-catch捕获解析过程中可能出现的异常
        try {
          // 将加载的文本解析为JSON，然后调用parse方法解析为几何体，最后调用onLoad回调
          onLoad(scope.parse(JSON.parse(text)));
        } catch (e) {
          // 如果提供了错误回调函数
          if (onError) {
            // 调用错误回调函数，传入异常对象
            onError(e);
          } else {
            // 否则在控制台输出错误信息
            console.error(e);
          }

          // 通知加载管理器该项目加载失败
          scope.manager.itemError(url);
        }
      },
      onProgress,
      onError
    );
  }

  /**
   * 解析给定的JSON对象并返回几何体。
   * Parses the given JSON object and returns a geometry.
   *
   * @param {Object} json - 序列化的几何体数据。The serialized geometry.
   * @return {BufferGeometry} 解析后的几何体。The parsed geometry.
   */
  parse(json) {
    // 创建交错缓冲区映射表，用于缓存已创建的交错缓冲区
    const interleavedBufferMap = {};
    // 创建数组缓冲区映射表，用于缓存已创建的数组缓冲区
    const arrayBufferMap = {};

    // 定义获取交错缓冲区的内部函数
    function getInterleavedBuffer(json, uuid) {
      // 如果交错缓冲区已存在于映射表中，直接返回
      if (interleavedBufferMap[uuid] !== undefined) return interleavedBufferMap[uuid];

      // 从JSON数据中获取交错缓冲区集合
      const interleavedBuffers = json.interleavedBuffers;
      // 根据UUID获取特定的交错缓冲区数据
      const interleavedBuffer = interleavedBuffers[uuid];

      // 获取对应的数组缓冲区
      const buffer = getArrayBuffer(json, interleavedBuffer.buffer);

      // 根据类型创建类型化数组
      const array = getTypedArray(interleavedBuffer.type, buffer);
      // 创建交错缓冲区实例，传入数组和步长
      const ib = new InterleavedBuffer(array, interleavedBuffer.stride);
      // 设置交错缓冲区的UUID
      ib.uuid = interleavedBuffer.uuid;

      // 将创建的交错缓冲区存储到映射表中
      interleavedBufferMap[uuid] = ib;

      // 返回创建的交错缓冲区
      return ib;
    }

    // 定义获取数组缓冲区的内部函数
    function getArrayBuffer(json, uuid) {
      // 如果数组缓冲区已存在于映射表中，直接返回
      if (arrayBufferMap[uuid] !== undefined) return arrayBufferMap[uuid];

      // 从JSON数据中获取数组缓冲区集合
      const arrayBuffers = json.arrayBuffers;
      // 根据UUID获取特定的数组缓冲区数据
      const arrayBuffer = arrayBuffers[uuid];

      // 创建Uint32Array并获取其底层ArrayBuffer
      const ab = new Uint32Array(arrayBuffer).buffer;

      // 将创建的数组缓冲区存储到映射表中
      arrayBufferMap[uuid] = ab;

      // 返回创建的数组缓冲区
      return ab;
    }

    // 根据JSON数据判断是否为实例化几何体，创建相应的几何体实例
    const geometry = json.isInstancedBufferGeometry ? new InstancedBufferGeometry() : new BufferGeometry();

    // 获取索引数据
    const index = json.data.index;

    // 如果存在索引数据
    if (index !== undefined) {
      // 根据索引类型创建类型化数组
      const typedArray = getTypedArray(index.type, index.array);
      // 为几何体设置索引，每个索引占用1个元素
      geometry.setIndex(new BufferAttribute(typedArray, 1));
    }

    // 获取属性数据集合
    const attributes = json.data.attributes;

    // 遍历所有属性
    for (const key in attributes) {
      // 获取当前属性数据
      const attribute = attributes[key];
      // 声明缓冲区属性变量
      let bufferAttribute;

      // 如果是交错缓冲区属性
      if (attribute.isInterleavedBufferAttribute) {
        // 获取对应的交错缓冲区
        const interleavedBuffer = getInterleavedBuffer(json.data, attribute.data);
        // 创建交错缓冲区属性，传入缓冲区、项大小、偏移量和是否标准化
        bufferAttribute = new InterleavedBufferAttribute(interleavedBuffer, attribute.itemSize, attribute.offset, attribute.normalized);
      } else {
        // 根据属性类型创建类型化数组
        const typedArray = getTypedArray(attribute.type, attribute.array);
        // 根据是否为实例化属性选择构造函数
        const bufferAttributeConstr = attribute.isInstancedBufferAttribute ? InstancedBufferAttribute : BufferAttribute;
        // 创建缓冲区属性，传入数组、项大小和是否标准化
        bufferAttribute = new bufferAttributeConstr(typedArray, attribute.itemSize, attribute.normalized);
      }

      // 如果属性有名称，设置缓冲区属性的名称
      if (attribute.name !== undefined) bufferAttribute.name = attribute.name;
      // 如果属性有使用方式，设置缓冲区属性的使用方式
      if (attribute.usage !== undefined) bufferAttribute.setUsage(attribute.usage);

      // 将缓冲区属性添加到几何体中
      geometry.setAttribute(key, bufferAttribute);
    }

    // 获取变形属性数据
    const morphAttributes = json.data.morphAttributes;

    // 如果存在变形属性
    if (morphAttributes) {
      // 遍历所有变形属性类型
      for (const key in morphAttributes) {
        // 获取当前变形属性数组
        const attributeArray = morphAttributes[key];

        // 创建空数组用于存储变形属性
        const array = [];

        // 遍历变形属性数组中的每个属性
        for (let i = 0, il = attributeArray.length; i < il; i++) {
          // 获取当前变形属性数据
          const attribute = attributeArray[i];
          // 声明缓冲区属性变量
          let bufferAttribute;

          // 如果是交错缓冲区属性
          if (attribute.isInterleavedBufferAttribute) {
            // 获取对应的交错缓冲区
            const interleavedBuffer = getInterleavedBuffer(json.data, attribute.data);
            // 创建交错缓冲区属性
            bufferAttribute = new InterleavedBufferAttribute(interleavedBuffer, attribute.itemSize, attribute.offset, attribute.normalized);
          } else {
            // 根据属性类型创建类型化数组
            const typedArray = getTypedArray(attribute.type, attribute.array);
            // 创建普通缓冲区属性
            bufferAttribute = new BufferAttribute(typedArray, attribute.itemSize, attribute.normalized);
          }

          // 如果属性有名称，设置缓冲区属性的名称
          if (attribute.name !== undefined) bufferAttribute.name = attribute.name;
          // 将缓冲区属性添加到数组中
          array.push(bufferAttribute);
        }

        // 将变形属性数组添加到几何体的变形属性中
        geometry.morphAttributes[key] = array;
      }
    }

    // 获取变形目标相对标志
    const morphTargetsRelative = json.data.morphTargetsRelative;

    // 如果变形目标是相对的
    if (morphTargetsRelative) {
      // 设置几何体的变形目标为相对模式
      geometry.morphTargetsRelative = true;
    }

    // 获取组数据，支持多种命名方式（groups、drawcalls、offsets）
    const groups = json.data.groups || json.data.drawcalls || json.data.offsets;

    // 如果存在组数据
    if (groups !== undefined) {
      // 遍历所有组
      for (let i = 0, n = groups.length; i !== n; ++i) {
        // 获取当前组数据
        const group = groups[i];

        // 向几何体添加组，指定起始位置、数量和材质索引
        geometry.addGroup(group.start, group.count, group.materialIndex);
      }
    }

    // 获取包围球数据
    const boundingSphere = json.data.boundingSphere;

    // 如果存在包围球数据
    if (boundingSphere !== undefined) {
      // 创建球体并从JSON数据中恢复，设置为几何体的包围球
      geometry.boundingSphere = new Sphere().fromJSON(boundingSphere);
    }

    // 如果JSON数据中有名称，设置几何体的名称
    if (json.name) geometry.name = json.name;
    // 如果JSON数据中有用户数据，设置几何体的用户数据
    if (json.userData) geometry.userData = json.userData;

    // 返回解析完成的几何体
    return geometry;
  }
}

// 导出BufferGeometryLoader类供其他模块使用
export { BufferGeometryLoader };
