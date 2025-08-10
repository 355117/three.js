// 导入节点工具函数，用于哈希计算
import { hash, hashString } from "../../nodes/core/NodeUtils.js";

// 全局ID计数器，用于为每个渲染对象分配唯一ID
let _id = 0;

/**
 * 获取对象的所有键，包括原型链上的getter属性
 * 这个函数会遍历对象的原型链，收集所有可枚举的属性和getter方法
 *
 * @param {Object} obj - 要获取键的对象
 * @return {Array<string>} 包含所有键名的数组
 */
function getKeys(obj) {
  // 获取对象自身的所有可枚举属性键
  const keys = Object.keys(obj);

  // 获取对象的原型
  let proto = Object.getPrototypeOf(obj);

  // 遍历原型链
  while (proto) {
    // 获取当前原型上的所有属性描述符
    const descriptors = Object.getOwnPropertyDescriptors(proto);

    // 遍历所有属性描述符
    for (const key in descriptors) {
      // 检查描述符是否存在
      if (descriptors[key] !== undefined) {
        // 获取属性描述符
        const descriptor = descriptors[key];

        // 如果描述符存在且有getter方法，将键添加到数组中
        if (descriptor && typeof descriptor.get === "function") {
          keys.push(key);
        }
      }
    }

    // 继续向上遍历原型链
    proto = Object.getPrototypeOf(proto);
  }

  // 返回收集到的所有键
  return keys;
}

/**
 * 渲染对象类
 *
 * 渲染对象是渲染器对单个实体的表示，该实体通过绘制命令进行绘制。
 * 渲染对象与场景中的3D对象之间没有唯一的映射关系，因为渲染对象还依赖于
 * 所使用的材质、当前渲染上下文和当前场景的光照。
 *
 * 一般来说，渲染器的基本流程是：
 *
 * - 分析场景中的3D对象并生成包含渲染项的渲染列表
 * - 通过为每个渲染项调用一个或多个渲染命令来处理渲染列表
 * - 对于每个渲染命令，请求一个渲染对象并执行绘制
 *
 * 该模块提供了一个接口来获取绘制命令所需的数据，如实际的绘制参数或顶点缓冲区。
 * 它还包含一系列与缓存相关的方法，因为只有在必要时才应该创建渲染对象。
 *
 * @private
 */
class RenderObject {
  /**
   * 构造一个新的渲染对象
   *
   * @param {Nodes} nodes - 用于管理节点相关逻辑的渲染器组件
   * @param {Geometries} geometries - 用于管理几何体的渲染器组件
   * @param {Renderer} renderer - 渲染器实例
   * @param {Object3D} object - 3D对象
   * @param {Material} material - 3D对象的材质
   * @param {Scene} scene - 3D对象所属的场景
   * @param {Camera} camera - 用于渲染对象的相机
   * @param {LightsNode} lightsNode - 光源节点
   * @param {RenderContext} renderContext - 渲染上下文
   * @param {ClippingContext} clippingContext - 裁剪上下文
   */
  constructor(nodes, geometries, renderer, object, material, scene, camera, lightsNode, renderContext, clippingContext) {
    // 为渲染对象分配唯一ID
    this.id = _id++;

    /**
     * 用于管理节点相关逻辑的渲染器组件
     * 负责处理材质节点、着色器节点等的管理和更新
     *
     * @type {Nodes}
     * @private
     */
    this._nodes = nodes;

    /**
     * 用于管理几何体的渲染器组件
     * 负责处理顶点缓冲区、索引缓冲区等几何体相关数据
     *
     * @type {Geometries}
     * @private
     */
    this._geometries = geometries;

    /**
     * 渲染器实例
     * 提供渲染相关的全局功能和配置
     *
     * @type {Renderer}
     */
    this.renderer = renderer;

    /**
     * 要渲染的3D对象
     * 包含变换矩阵、几何体、材质等信息
     *
     * @type {Object3D}
     */
    this.object = object;

    /**
     * 3D对象的材质
     * 定义对象的外观属性，如颜色、纹理、着色器等
     *
     * @type {Material}
     */
    this.material = material;

    /**
     * 3D对象所属的场景
     * 包含场景级别的设置，如背景、雾效、环境光等
     *
     * @type {Scene}
     */
    this.scene = scene;

    /**
     * 用于渲染对象的相机
     * 定义视点、投影方式等渲染参数
     *
     * @type {Camera}
     */
    this.camera = camera;

    /**
     * 光源节点
     * 包含场景中所有光源的信息，用于光照计算
     *
     * @type {LightsNode}
     */
    this.lightsNode = lightsNode;

    /**
     * 渲染上下文
     * 包含当前渲染状态的所有信息，如渲染目标、视口等
     *
     * @type {RenderContext}
     */
    this.context = renderContext;

    /**
     * 3D对象的几何体
     * 包含顶点、法线、UV坐标等几何数据
     *
     * @type {BufferGeometry}
     */
    this.geometry = object.geometry;

    /**
     * 渲染对象的版本号
     * 基于材质版本，用于检测材质是否发生变化
     *
     * @type {number}
     */
    this.version = material.version;

    /**
     * 几何体的绘制范围
     * 指定要绘制的顶点或索引的起始位置和数量
     *
     * @type {?Object}
     * @default null
     */
    this.drawRange = null;

    /**
     * 保存渲染对象缓冲区属性的数组
     * 包含几何体级别和节点级别的属性定义
     * 如位置、法线、UV坐标、颜色等顶点属性
     *
     * @type {?Array<BufferAttribute>}
     * @default null
     */
    this.attributes = null;

    /**
     * 保存属性版本的对象
     * 键是属性名称，值是属性版本号
     * 用于检测属性是否发生变化，避免不必要的更新
     *
     * @type {?Object<string, number>}
     * @default null
     */
    this.attributesId = null;

    /**
     * 渲染对象使用的渲染管线的引用
     * 定义了渲染状态、着色器程序等渲染配置
     *
     * @type {RenderPipeline}
     * @default null
     */
    this.pipeline = null;

    /**
     * 仅与使用多个材质的对象相关
     * 表示来自相应 `BufferGeometry` 的组条目
     * 定义了要渲染的几何体部分的起始位置和数量
     *
     * @type {?{start: number, count: number}}
     * @default null
     */
    this.group = null;

    /**
     * 保存顶点缓冲区的数组
     * 可以是缓冲区属性，也可以是交错缓冲区
     * 用于存储实际的顶点数据，如位置、法线、UV等
     *
     * @type {?Array<BufferAttribute|InterleavedBuffer>}
     * @default null
     */
    this.vertexBuffers = null;

    /**
     * 绘制命令的参数
     * 包含绘制类型、顶点数量、索引等绘制相关信息
     *
     * @type {?Object}
     * @default null
     */
    this.drawParams = null;

    /**
     * 如果此渲染对象在渲染包内使用，
     * 此属性指向相应的包组
     * 渲染包用于优化批量渲染性能
     *
     * @type {?BundleGroup}
     * @default null
     */
    this.bundle = null;

    /**
     * 裁剪上下文
     * 包含裁剪平面和裁剪相关的设置信息
     *
     * @type {ClippingContext}
     */
    this.clippingContext = clippingContext;

    /**
     * 裁剪上下文的缓存键
     * 用于识别裁剪状态的变化，优化缓存管理
     *
     * @type {string}
     */
    this.clippingContextCacheKey = clippingContext !== null ? clippingContext.cacheKey : "";

    /**
     * 初始节点缓存键
     * 用于跟踪节点状态的变化，基于动态缓存键计算
     *
     * @type {number}
     */
    this.initialNodesCacheKey = this.getDynamicCacheKey();

    /**
     * 初始缓存键
     * 用于跟踪渲染对象整体状态的变化
     *
     * @type {number}
     */
    this.initialCacheKey = this.getCacheKey();

    /**
     * 节点构建器状态
     * 存储节点构建过程中的状态信息，用于着色器生成
     *
     * @type {?NodeBuilderState}
     * @private
     * @default null
     */
    this._nodeBuilderState = null;

    /**
     * 绑定组数组
     * 存储GPU资源绑定信息，如纹理、缓冲区、采样器等
     *
     * @type {?Array<BindGroup>}
     * @private
     * @default null
     */
    this._bindings = null;

    /**
     * 节点材质观察器的引用
     * 用于监控材质节点的变化，触发相应的更新操作
     *
     * @type {?NodeMaterialObserver}
     * @private
     * @default null
     */
    this._monitor = null;

    /**
     * 由 `RenderObjects` 定义的事件监听器
     * 在此渲染对象调用 `dispose()` 时执行清理任务
     *
     * @method
     */
    this.onDispose = null;

    /**
     * 用于类型测试的标志
     * 标识此对象为渲染对象类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isRenderObject = true;

    /**
     * 当此渲染对象的材质调用 `dispose()` 时执行的事件监听器
     * 确保在材质被销毁时，相关的渲染对象也被正确清理
     *
     * @method
     */
    this.onMaterialDispose = () => {
      // 销毁渲染对象
      this.dispose();
    };

    /**
     * 当此渲染对象的几何体调用 `dispose()` 时执行的事件监听器
     * 清理几何体相关的缓存数据
     *
     * @method
     */
    this.onGeometryDispose = () => {
      // 清除几何体缓存属性

      // 清空属性数组
      this.attributes = null;
      // 清空属性ID映射
      this.attributesId = null;
    };

    // 为材质添加销毁事件监听器
    this.material.addEventListener("dispose", this.onMaterialDispose);
    // 为几何体添加销毁事件监听器
    this.geometry.addEventListener("dispose", this.onGeometryDispose);
  }

  /**
   * 更新裁剪上下文
   * 设置新的裁剪上下文，用于裁剪平面等功能
   *
   * @param {ClippingContext} context - 要设置的裁剪上下文
   */
  updateClipping(context) {
    // 更新裁剪上下文引用
    this.clippingContext = context;
  }

  /**
   * 检查裁剪是否需要更新
   * 通过比较缓存键来判断裁剪状态是否发生变化
   *
   * @type {boolean}
   * @readonly
   */
  get clippingNeedsUpdate() {
    // 如果没有裁剪上下文或缓存键未变化，则不需要更新
    if (this.clippingContext === null || this.clippingContext.cacheKey === this.clippingContextCacheKey) return false;

    // 更新缓存键
    this.clippingContextCacheKey = this.clippingContext.cacheKey;

    // 返回需要更新
    return true;
  }

  /**
   * 在硬件裁剪上下文中定义的裁剪平面数量
   * 返回启用硬件裁剪时的裁剪平面数量
   *
   * @type {number}
   * @readonly
   */
  get hardwareClippingPlanes() {
    // 如果材质启用了硬件裁剪，返回联合裁剪数量，否则返回0
    return this.material.hardwareClipping === true ? this.clippingContext.unionClippingCount : 0;
  }

  /**
   * 返回此渲染对象的节点构建器状态
   * 懒加载模式，只在需要时创建
   *
   * @return {NodeBuilderState} 节点构建器状态
   */
  getNodeBuilderState() {
    // 如果状态不存在，则通过节点管理器创建
    return this._nodeBuilderState || (this._nodeBuilderState = this._nodes.getForRender(this));
  }

  /**
   * 返回此渲染对象的节点材质观察器
   * 用于监控材质节点的变化
   *
   * @return {NodeMaterialObserver} 节点材质观察器
   */
  getMonitor() {
    // 如果观察器不存在，则从节点构建器状态中获取
    return this._monitor || (this._monitor = this.getNodeBuilderState().observer);
  }

  /**
   * 返回此渲染对象的绑定组数组
   * 包含所有GPU资源绑定信息
   *
   * @return {Array<BindGroup>} 绑定组数组
   */
  getBindings() {
    // 如果绑定不存在，则通过节点构建器状态创建
    return this._bindings || (this._bindings = this.getNodeBuilderState().createBindings());
  }

  /**
   * 根据组名返回绑定组
   * 在绑定组数组中查找指定名称的绑定组
   *
   * @param {string} name - 绑定组的名称
   * @return {?BindGroup} 找到的绑定组，如果未找到则返回undefined
   */
  getBindingGroup(name) {
    // 遍历所有绑定组
    for (const bindingGroup of this.getBindings()) {
      // 如果找到匹配的名称，返回该绑定组
      if (bindingGroup.name === name) {
        return bindingGroup;
      }
    }
  }

  /**
   * 返回渲染对象几何体的索引
   * 用于索引绘制，提高渲染效率
   *
   * @return {?BufferAttribute} 索引缓冲区。对于非索引几何体返回 `null`
   */
  getIndex() {
    // 通过几何体管理器获取索引
    return this._geometries.getIndex(this);
  }

  /**
   * 返回间接缓冲区属性
   * 用于间接绘制，可以减少CPU-GPU通信开销
   *
   * @return {?BufferAttribute} 间接属性。如果未使用间接绘制则返回 `null`
   */
  getIndirect() {
    // 通过几何体管理器获取间接缓冲区
    return this._geometries.getIndirect(this);
  }

  /**
   * 返回用作在链式映射中标识渲染对象的键的数组
   * 这个数组包含了渲染对象的核心标识信息
   *
   * @return {Array<Object>} 包含对象引用的数组
   */
  getChainArray() {
    // 返回包含对象、材质、上下文和光源节点的数组
    return [this.object, this.material, this.context, this.lightsNode];
  }

  /**
   * 当3D对象的几何体被替换时使用此方法
   * 相应的渲染对象需要更新以反映新的几何体
   *
   * @param {BufferGeometry} geometry - 要设置的几何体
   */
  setGeometry(geometry) {
    // 设置新的几何体
    this.geometry = geometry;
    // 清空属性缓存，强制重新计算
    this.attributes = null;
    this.attributesId = null;
  }

  /**
   * 返回渲染对象的缓冲区属性
   * 返回的数组包含几何体级别和节点级别的属性定义
   *
   * @return {Array<BufferAttribute>} 包含缓冲区属性的数组
   */
  getAttributes() {
    // 如果属性已经计算过，直接返回缓存的结果
    if (this.attributes !== null) return this.attributes;

    // 获取节点构建器状态中的节点属性
    const nodeAttributes = this.getNodeBuilderState().nodeAttributes;
    // 获取几何体引用
    const geometry = this.geometry;

    // 初始化属性数组
    const attributes = [];
    // 用于跟踪顶点缓冲区的集合，避免重复
    const vertexBuffers = new Set();

    // 初始化属性ID映射
    const attributesId = {};

    // 遍历所有节点属性
    for (const nodeAttribute of nodeAttributes) {
      let attribute;

      // 检查是否为节点属性
      if (nodeAttribute.node && nodeAttribute.node.attribute) {
        // 节点属性：来自材质节点系统
        attribute = nodeAttribute.node.attribute;
      } else {
        // 几何体属性：来自几何体本身
        // 从几何体中获取指定名称的属性
        attribute = geometry.getAttribute(nodeAttribute.name);

        // 记录属性的版本号，用于变化检测
        attributesId[nodeAttribute.name] = attribute.version;
      }

      // 如果属性未定义，跳过此属性
      if (attribute === undefined) continue;

      // 将属性添加到属性数组中
      attributes.push(attribute);

      // 获取实际的缓冲区属性（处理交错缓冲区的情况）
      const bufferAttribute = attribute.isInterleavedBufferAttribute ? attribute.data : attribute;
      // 将缓冲区添加到顶点缓冲区集合中
      vertexBuffers.add(bufferAttribute);
    }

    // 缓存计算结果
    this.attributes = attributes;
    this.attributesId = attributesId;
    this.vertexBuffers = Array.from(vertexBuffers.values());

    // 返回属性数组
    return attributes;
  }

  /**
   * 返回渲染对象的顶点缓冲区
   * 包含所有顶点数据的缓冲区数组
   *
   * @return {Array<BufferAttribute|InterleavedBuffer>} 包含缓冲区属性或交错缓冲区的数组
   */
  getVertexBuffers() {
    // 如果顶点缓冲区为空，先计算属性
    if (this.vertexBuffers === null) this.getAttributes();

    // 返回顶点缓冲区数组
    return this.vertexBuffers;
  }

  /**
   * 返回渲染对象的绘制参数
   * 包含顶点数量、实例数量等绘制相关信息
   *
   * @return {?{vertexCount: number, firstVertex: number, instanceCount: number, firstInstance: number}} 绘制参数
   */
  getDrawParameters() {
    // 解构获取相关对象
    const { object, material, geometry, group, drawRange } = this;

    // 获取或创建绘制参数对象
    const drawParams =
      this.drawParams ||
      (this.drawParams = {
        vertexCount: 0, // 顶点数量
        firstVertex: 0, // 第一个顶点索引
        instanceCount: 0, // 实例数量
        firstInstance: 0, // 第一个实例索引
      });

    // 获取索引缓冲区
    const index = this.getIndex();
    // 检查是否使用索引绘制
    const hasIndex = index !== null;

    // 初始化实例数量
    let instanceCount = 1;

    // 检查是否为实例化几何体
    if (geometry.isInstancedBufferGeometry === true) {
      // 使用几何体的实例数量
      instanceCount = geometry.instanceCount;
    } else if (object.count !== undefined) {
      // 使用对象的count属性作为实例数量
      instanceCount = Math.max(0, object.count);
    }

    // 如果实例数量为0，返回null（无需绘制）
    if (instanceCount === 0) return null;

    // 设置实例数量
    drawParams.instanceCount = instanceCount;

    // 如果是批处理网格，直接返回参数（批处理网格有特殊处理）
    if (object.isBatchedMesh === true) return drawParams;

    // 范围因子，用于线框模式的特殊处理
    let rangeFactor = 1;

    // 如果是线框模式且不是点、线段、线或线环，需要特殊处理
    if (material.wireframe === true && !object.isPoints && !object.isLineSegments && !object.isLine && !object.isLineLoop) {
      // 线框模式需要更多的顶点来绘制边
      rangeFactor = 2;
    }

    // 计算绘制范围的起始和结束顶点
    let firstVertex = drawRange.start * rangeFactor;
    let lastVertex = (drawRange.start + drawRange.count) * rangeFactor;

    // 如果有组信息，进一步限制绘制范围
    if (group !== null) {
      firstVertex = Math.max(firstVertex, group.start * rangeFactor);
      lastVertex = Math.min(lastVertex, (group.start + group.count) * rangeFactor);
    }

    // 获取位置属性以确定总顶点数
    const position = geometry.attributes.position;
    let itemCount = Infinity;

    // 确定总的项目数量
    if (hasIndex) {
      // 如果有索引，使用索引数量
      itemCount = index.count;
    } else if (position !== undefined && position !== null) {
      // 否则使用位置属性的数量
      itemCount = position.count;
    }

    // 确保顶点范围在有效范围内
    firstVertex = Math.max(firstVertex, 0);
    lastVertex = Math.min(lastVertex, itemCount);

    // 计算要绘制的顶点数量
    const count = lastVertex - firstVertex;

    // 如果数量无效，返回null
    if (count < 0 || count === Infinity) return null;

    // 设置绘制参数
    drawParams.vertexCount = count;
    drawParams.firstVertex = firstVertex;

    // 返回绘制参数
    return drawParams;
  }

  /**
   * 返回渲染对象的几何体缓存键
   * 几何体缓存键是材质缓存键的一部分，用于识别几何体的结构变化
   *
   * @return {string} 几何体缓存键
   */
  getGeometryCacheKey() {
    // 获取几何体引用
    const { geometry } = this;

    // 初始化缓存键字符串
    let cacheKey = "";

    // 遍历所有几何体属性（按名称排序以确保一致性）
    for (const name of Object.keys(geometry.attributes).sort()) {
      const attribute = geometry.attributes[name];

      // 添加属性名称
      cacheKey += name + ",";

      // 添加属性的结构信息
      if (attribute.data) cacheKey += attribute.data.stride + ","; // 交错缓冲区的步长
      if (attribute.offset) cacheKey += attribute.offset + ","; // 属性偏移量
      if (attribute.itemSize) cacheKey += attribute.itemSize + ","; // 每个项目的大小
      if (attribute.normalized) cacheKey += "n,"; // 是否归一化
    }

    // 结构相等性对于变形目标是不够的，因为数据保存在纹理中
    // 只有当所有目标都相等时，纹理和 `MorphNode` 实例才能共享

    // 遍历所有变形属性（按名称排序）
    for (const name of Object.keys(geometry.morphAttributes).sort()) {
      const targets = geometry.morphAttributes[name];

      // 添加变形属性标识
      cacheKey += "morph-" + name + ",";

      // 遍历所有变形目标
      for (let i = 0, l = targets.length; i < l; i++) {
        const attribute = targets[i];

        // 添加每个变形目标的ID
        cacheKey += attribute.id + ",";
      }
    }

    // 如果有索引，添加索引标识
    if (geometry.index) {
      cacheKey += "index,";
    }

    // 返回完整的几何体缓存键
    return cacheKey;
  }

  /**
   * 返回渲染对象的材质缓存键
   * 材质缓存键是渲染对象缓存键的一部分，用于识别材质的变化
   *
   * @return {number} 材质缓存键
   */
  getMaterialCacheKey() {
    // 解构获取对象和材质
    const { object, material } = this;

    // 获取材质的自定义程序缓存键
    let cacheKey = material.customProgramCacheKey();

    // 遍历材质的所有属性
    for (const property of getKeys(material)) {
      // 跳过内部属性、类型标识和一些不影响渲染的属性
      if (/^(is[A-Z]|_)|^(visible|version|uuid|name|opacity|userData)$/.test(property)) continue;

      // 获取属性值
      const value = material[property];

      let valueKey;

      if (value !== null) {
        // 某些材质值需要特殊格式化

        const type = typeof value;

        if (type === "number") {
          // 将数字转换为开/关状态，对于clearcoat、transmission等很重要
          valueKey = value !== 0 ? "1" : "0";
        } else if (type === "object") {
          valueKey = "{";

          // 如果是纹理，添加映射信息
          if (value.isTexture) {
            valueKey += value.mapping;
          }

          valueKey += "}";
        } else {
          // 其他类型直接转换为字符串
          valueKey = String(value);
        }
      } else {
        // null值直接转换为字符串
        valueKey = String(value);
      }

      // 添加到缓存键中（注释掉的部分是属性名，为了简化缓存键）
      cacheKey += /*property + ':' +*/ valueKey + ",";
    }

    // 添加裁剪上下文缓存键
    cacheKey += this.clippingContextCacheKey + ",";

    // 如果对象有几何体，添加几何体缓存键
    if (object.geometry) {
      cacheKey += this.getGeometryCacheKey();
    }

    // 如果对象有骨骼，添加骨骼数量
    if (object.skeleton) {
      cacheKey += object.skeleton.bones.length + ",";
    }

    // 如果是批处理网格，添加相关纹理的UUID
    if (object.isBatchedMesh) {
      cacheKey += object._matricesTexture.uuid + ",";

      // 如果有颜色纹理，也添加其UUID
      if (object._colorsTexture !== null) {
        cacheKey += object._colorsTexture.uuid + ",";
      }
    }

    // 如果对象数量大于1，添加对象UUID
    if (object.count > 1) {
      // TODO: https://github.com/mrdoob/three.js/pull/29066#issuecomment-2269400850

      cacheKey += object.uuid + ",";
    }

    // 添加是否接收阴影的标识
    cacheKey += object.receiveShadow + ",";

    // 返回哈希后的缓存键
    return hashString(cacheKey);
  }

  /**
   * 检查几何体是否需要更新
   * 通过比较几何体ID和属性版本来判断
   *
   * @type {boolean}
   * @readonly
   */
  get needsGeometryUpdate() {
    // 如果几何体ID发生变化，需要更新
    if (this.geometry.id !== this.object.geometry.id) return true;

    // 如果已有属性缓存，检查属性是否发生变化
    if (this.attributes !== null) {
      const attributesId = this.attributesId;

      // 遍历所有缓存的属性ID
      for (const name in attributesId) {
        const attribute = this.geometry.getAttribute(name);

        // 如果属性不存在或ID发生变化，需要更新
        if (attribute === undefined || attributesId[name] !== attribute.id) {
          return true;
        }
      }
    }

    // 不需要更新
    return false;
  }

  /**
   * 检查渲染对象是否需要更新
   *
   * 注意：有两个不同的地方检查渲染对象是否需要更新：
   *
   * 1. 在 `RenderObjects.get()` 中，当请求渲染对象时执行。此方法检查 `needsUpdate` 标志，
   *    如果需要则重新创建渲染对象。
   * 2. 在 `Renderer._renderObjectDirect()` 中，在通过 `RenderObjects.get()` 获取渲染对象后立即执行。
   *    然后使用渲染对象的 NodeMaterialObserver 来检测由于材质、几何体或对象相关值变化而需要刷新。
   *
   * TODO: 调查是否可以合并这两个步骤，使只有一个地方执行 'needsUpdate' 检查。
   *
   * @type {boolean}
   * @readonly
   */
  get needsUpdate() {
    // 检查动态缓存键是否发生变化或裁剪是否需要更新
    return /*this.object.static !== true &&*/ this.initialNodesCacheKey !== this.getDynamicCacheKey() || this.clippingNeedsUpdate;
  }

  /**
   * 返回动态缓存键
   * 表示每个绘制命令计算的键，用于跟踪运行时状态变化
   *
   * @return {number} 缓存键
   */
  getDynamicCacheKey() {
    // 初始化缓存键
    let cacheKey = 0;

    // `Nodes.getCacheKey()` 返回环境缓存键，
    // 当渲染器在阴影通道内时不相关

    // 如果不是阴影通道材质，获取节点缓存键
    if (this.material.isShadowPassMaterial !== true) {
      cacheKey = this._nodes.getCacheKey(this.scene, this.lightsNode);
    }

    // 如果是数组相机，将相机数量纳入缓存键
    if (this.camera.isArrayCamera) {
      cacheKey = hash(cacheKey, this.camera.cameras.length);
    }

    // 如果对象接收阴影，将此状态纳入缓存键
    if (this.object.receiveShadow) {
      cacheKey = hash(cacheKey, 1);
    }

    // 返回计算的动态缓存键
    return cacheKey;
  }

  /**
   * 返回渲染对象的缓存键
   * 结合材质缓存键和动态缓存键
   *
   * @return {number} 缓存键
   */
  getCacheKey() {
    // 返回材质缓存键和动态缓存键的组合
    return this.getMaterialCacheKey() + this.getDynamicCacheKey();
  }

  /**
   * 释放内部资源
   * 清理事件监听器和相关资源
   */
  dispose() {
    // 移除材质销毁事件监听器
    this.material.removeEventListener("dispose", this.onMaterialDispose);
    // 移除几何体销毁事件监听器
    this.geometry.removeEventListener("dispose", this.onGeometryDispose);

    // 调用自定义销毁回调
    this.onDispose();
  }
}

// 导出渲染对象类
export default RenderObject;
