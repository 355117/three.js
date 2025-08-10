/**
 * Geometries.js
 *
 * 几何体管理器 - 管理渲染器中的几何体数据
 *
 * 这个模块管理渲染器中的几何体，包括顶点属性、索引、线框渲染
 * 等功能。它继承自DataMap，为每个几何体提供数据存储和管理。
 */

// 导入依赖模块
import DataMap from "./DataMap.js"; // 数据映射基类
import { AttributeType } from "./Constants.js"; // 属性类型常量
import { arrayNeedsUint32 } from "../../utils.js"; // 数组类型判断工具

// 导入缓冲区属性类
import { Uint16BufferAttribute, Uint32BufferAttribute } from "../../core/BufferAttribute.js";

/**
 * 获取给定几何体的线框版本号
 *
 * 返回几何体线框渲染所需的版本号。版本号用于检测几何体
 * 是否发生变化，以决定是否需要重新生成线框索引。
 *
 * @private
 * @function
 * @param {import('../../core/BufferGeometry.js').BufferGeometry} geometry - 几何体对象
 * @return {number} 版本号
 */
function getWireframeVersion(geometry) {
  // 如果有索引，使用索引的版本号；否则使用位置属性的版本号
  return geometry.index !== null ? geometry.index.version : geometry.attributes.position.version;
}

/**
 * 为给定几何体生成线框索引属性
 *
 * 生成用于线框渲染的索引属性。线框渲染需要将三角形的每条边
 * 都绘制出来，因此需要特殊的索引排列。
 *
 * 对于每个三角形(a,b,c)，生成线段索引：a-b, b-c, c-a
 *
 * @private
 * @function
 * @param {import('../../core/BufferGeometry.js').BufferGeometry} geometry - 几何体对象
 * @return {import('../../core/BufferAttribute.js').BufferAttribute} 线框索引属性
 */
function getWireframeIndex(geometry) {
  const indices = [];

  const geometryIndex = geometry.index;
  const geometryPosition = geometry.attributes.position;

  if (geometryIndex !== null) {
    // 有索引的几何体：遍历索引数组，每3个索引构成一个三角形
    const array = geometryIndex.array;

    for (let i = 0, l = array.length; i < l; i += 3) {
      const a = array[i + 0];
      const b = array[i + 1];
      const c = array[i + 2];

      // 为三角形的每条边添加线段索引：a-b, b-c, c-a
      indices.push(a, b, b, c, c, a);
    }
  } else {
    // 无索引的几何体：直接使用顶点位置索引
    const array = geometryPosition.array;

    for (let i = 0, l = array.length / 3 - 1; i < l; i += 3) {
      const a = i + 0;
      const b = i + 1;
      const c = i + 2;

      // 为三角形的每条边添加线段索引：a-b, b-c, c-a
      indices.push(a, b, b, c, c, a);
    }
  }

  // 根据索引数量选择合适的缓冲区属性类型
  const attribute = new (arrayNeedsUint32(indices) ? Uint32BufferAttribute : Uint16BufferAttribute)(indices, 1);
  // 设置版本号以便跟踪变化
  attribute.version = getWireframeVersion(geometry);

  return attribute;
}

/**
 * 几何体管理器类
 *
 * 这个渲染器模块管理几何体。它负责几何体的初始化、属性更新、
 * 线框渲染、间接绘制等功能，是渲染管线中几何体处理的核心组件。
 *
 * 主要功能：
 * - 几何体数据的初始化和管理
 * - 顶点属性和索引的更新
 * - 线框渲染的索引生成
 * - 间接绘制参数的处理
 * - 内存和性能监控
 *
 * @private
 * @augments DataMap
 */
class Geometries extends DataMap {
  /**
   * 构造新的几何体管理组件
   *
   * 创建几何体管理器实例，设置属性管理器和信息监控组件的引用。
   * 初始化线框缓存和属性调用跟踪。
   *
   * @param {import('./Attributes.js').default} attributes - 用于管理属性的渲染器组件
   * @param {import('./Info.js').default} info - 用于管理指标和监控数据的渲染器组件
   */
  constructor(attributes, info) {
    // 调用父类构造函数
    super();

    /**
     * 属性管理器组件
     *
     * 用于管理顶点属性、索引等缓冲区数据的渲染器组件。
     * 负责属性的创建、更新和GPU上传。
     *
     * @type {import('./Attributes.js').default}
     */
    this.attributes = attributes;

    /**
     * 信息监控组件
     *
     * 用于管理指标和监控数据的渲染器组件。跟踪几何体数量、
     * 内存使用、渲染调用等统计信息。
     *
     * @type {import('./Info.js').default}
     */
    this.info = info;

    /**
     * 线框渲染属性缓存
     *
     * 用于管理线框渲染属性的WeakMap。为每个几何体缓存
     * 生成的线框索引属性，避免重复计算。
     *
     * @type {WeakMap<import('../../core/BufferGeometry.js').BufferGeometry,import('../../core/BufferAttribute.js').BufferAttribute>}
     */
    this.wireframes = new WeakMap();

    /**
     * 属性调用跟踪
     *
     * 这个WeakMap用于确保缓冲区属性在每次渲染调用中只更新一次。
     * 存储属性与渲染调用ID的映射，防止重复更新。
     *
     * @type {WeakMap<import('../../core/BufferAttribute.js').BufferAttribute,number>}
     */
    this.attributeCall = new WeakMap();
  }

  /**
   * 检查给定的渲染对象是否有已初始化的几何体
   *
   * 检查渲染对象的几何体是否已经初始化并准备好进行渲染。
   * 这包括检查几何体是否存在于数据映射中以及是否已标记为已初始化。
   *
   * @param {import('./RenderObject.js').default} renderObject - 渲染对象
   * @return {boolean} 给定的渲染对象是否有已初始化的几何体
   */
  has(renderObject) {
    const geometry = renderObject.geometry;

    // 检查几何体是否存在于数据映射中且已初始化
    return super.has(geometry) && this.get(geometry).initialized === true;
  }

  /**
   * 为渲染准备给定渲染对象的几何体
   *
   * 确保渲染对象的几何体已经初始化并且属性是最新的。
   * 如果几何体尚未初始化，则先进行初始化，然后更新属性。
   *
   * @param {import('./RenderObject.js').default} renderObject - 渲染对象
   */
  updateForRender(renderObject) {
    // 如果几何体未初始化，先进行初始化
    if (this.has(renderObject) === false) this.initGeometry(renderObject);

    // 更新几何体属性
    this.updateAttributes(renderObject);
  }

  /**
   * 初始化给定渲染对象的几何体
   *
   * 对几何体进行初始化设置，包括标记为已初始化、更新内存统计、
   * 设置资源清理监听器等。这是几何体生命周期管理的重要环节。
   *
   * @param {import('./RenderObject.js').default} renderObject - 渲染对象
   */
  initGeometry(renderObject) {
    const geometry = renderObject.geometry;
    const geometryData = this.get(geometry);

    // 标记几何体为已初始化
    geometryData.initialized = true;

    // 增加几何体内存统计计数
    this.info.memory.geometries++;

    // 定义几何体销毁时的清理函数
    const onDispose = () => {
      // 减少几何体内存统计计数
      this.info.memory.geometries--;

      // 清理索引属性
      const index = geometry.index;
      const geometryAttributes = renderObject.getAttributes();

      if (index !== null) {
        this.attributes.delete(index);
      }

      // 清理所有几何体属性
      for (const geometryAttribute of geometryAttributes) {
        this.attributes.delete(geometryAttribute);
      }

      // 清理线框属性（如果存在）
      const wireframeAttribute = this.wireframes.get(geometry);

      if (wireframeAttribute !== undefined) {
        this.attributes.delete(wireframeAttribute);
      }

      // 移除事件监听器，避免内存泄漏
      geometry.removeEventListener("dispose", onDispose);
    };

    // 监听几何体的销毁事件，确保资源正确清理
    geometry.addEventListener("dispose", onDispose);
  }

  /**
   * 更新给定渲染对象的几何体属性
   *
   * 更新渲染对象几何体的所有属性，包括顶点属性、索引、间接绘制参数等。
   * 根据属性类型选择合适的更新策略，确保GPU缓冲区数据是最新的。
   *
   * @param {import('./RenderObject.js').default} renderObject - 渲染对象
   */
  updateAttributes(renderObject) {
    // 更新顶点属性
    const attributes = renderObject.getAttributes();

    for (const attribute of attributes) {
      // 根据属性类型选择更新方式
      if (attribute.isStorageBufferAttribute || attribute.isStorageInstancedBufferAttribute) {
        // 存储缓冲区属性（用于计算着色器）
        this.updateAttribute(attribute, AttributeType.STORAGE);
      } else {
        // 普通顶点属性（位置、法线、UV等）
        this.updateAttribute(attribute, AttributeType.VERTEX);
      }
    }

    // 更新索引
    const index = this.getIndex(renderObject);

    if (index !== null) {
      this.updateAttribute(index, AttributeType.INDEX);
    }

    // 更新间接绘制参数
    const indirect = renderObject.geometry.indirect;

    if (indirect !== null) {
      this.updateAttribute(indirect, AttributeType.INDIRECT);
    }
  }

  /**
   * 更新给定的属性
   *
   * 更新单个缓冲区属性，使用调用ID跟踪机制确保每个渲染调用中
   * 属性只更新一次。对交错缓冲区属性有特殊的处理逻辑。
   *
   * @param {import('../../core/BufferAttribute.js').BufferAttribute} attribute - 要更新的属性
   * @param {number} type - 属性类型（来自AttributeType枚举）
   */
  updateAttribute(attribute, type) {
    // 获取当前渲染调用ID，用于跟踪更新状态
    const callId = this.info.render.calls;

    if (!attribute.isInterleavedBufferAttribute) {
      // 普通缓冲区属性的处理
      if (this.attributeCall.get(attribute) !== callId) {
        // 如果属性在当前渲染调用中尚未更新，则进行更新
        this.attributes.update(attribute, type);

        // 记录属性已在当前调用中更新
        this.attributeCall.set(attribute, callId);
      }
    } else {
      // 交错缓冲区属性的特殊处理
      if (this.attributeCall.get(attribute) === undefined) {
        // 首次更新交错缓冲区属性
        this.attributes.update(attribute, type);

        this.attributeCall.set(attribute, callId);
      } else if (this.attributeCall.get(attribute.data) !== callId) {
        // 如果底层数据缓冲区在当前调用中尚未更新
        this.attributes.update(attribute, type);

        // 同时记录数据缓冲区和属性的更新状态
        this.attributeCall.set(attribute.data, callId);
        this.attributeCall.set(attribute, callId);
      }
    }
  }

  /**
   * 获取给定渲染对象的间接缓冲区属性
   *
   * 返回用于间接绘制的缓冲区属性。间接绘制允许GPU直接决定
   * 绘制参数，无需CPU干预，提高渲染性能。
   *
   * @param {import('./RenderObject.js').default} renderObject - 渲染对象
   * @return {?import('../../core/BufferAttribute.js').BufferAttribute} 间接属性，如果不使用间接绘制则返回`null`
   */
  getIndirect(renderObject) {
    return renderObject.geometry.indirect;
  }

  /**
   * 获取给定渲染对象几何体的索引
   *
   * 返回几何体的索引属性。这个方法的实现考虑了线框渲染的特殊需求，
   * 在线框模式下会返回专门生成的线框索引而不是原始索引。
   *
   * @param {import('./RenderObject.js').default} renderObject - 渲染对象
   * @return {?import('../../core/BufferAttribute.js').BufferAttribute} 索引属性，对于非索引几何体返回`null`
   */
  getIndex(renderObject) {
    const { geometry, material } = renderObject;

    let index = geometry.index;

    // 检查是否需要线框渲染
    if (material.wireframe === true) {
      const wireframes = this.wireframes;

      // 尝试获取缓存的线框索引
      let wireframeAttribute = wireframes.get(geometry);

      if (wireframeAttribute === undefined) {
        // 首次生成线框索引
        wireframeAttribute = getWireframeIndex(geometry);

        wireframes.set(geometry, wireframeAttribute);
      } else if (wireframeAttribute.version !== getWireframeVersion(geometry)) {
        // 几何体已更新，需要重新生成线框索引
        this.attributes.delete(wireframeAttribute);

        wireframeAttribute = getWireframeIndex(geometry);

        wireframes.set(geometry, wireframeAttribute);
      }

      // 使用线框索引替代原始索引
      index = wireframeAttribute;
    }

    return index;
  }
}

// 导出几何体管理器类
export default Geometries;
