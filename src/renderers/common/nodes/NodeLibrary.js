/**
 * NodeLibrary.js
 *
 * 节点库 - 将节点实现分配给现有库功能
 *
 * 节点库的目的是为现有的库功能分配节点实现。在WebGPURenderer中，
 * 光源、非NodeMaterial材质以及色调映射技术都通过基于节点的模块实现。
 *
 * 主要功能：
 * 1. 光源到光源节点的映射
 * 2. 传统材质到节点材质的转换
 * 3. 色调映射技术的节点实现
 * 4. 类型安全的注册和查找机制
 *
 * 这种设计允许渲染器在保持向后兼容性的同时，
 * 内部使用统一的节点系统进行渲染。
 *
 * @private
 */
class NodeLibrary {
  /**
   * 构造新的节点库
   *
   * 初始化三个主要的映射表：光源节点、材质节点和色调映射节点。
   * 这些映射表用于在传统Three.js对象和节点系统之间建立桥梁。
   */
  constructor() {
    /**
     * 光源到光源节点的弱映射
     *
     * 将Light类构造函数映射到对应的AnalyticLightNode类构造函数。
     * 使用WeakMap确保当光源类被垃圾回收时，映射也会被清理。
     *
     * @type {WeakMap<import('../../../lights/Light.js').Light.constructor,import('../../../nodes/lighting/AnalyticLightNode.js').AnalyticLightNode.constructor>}
     */
    this.lightNodes = new WeakMap();

    /**
     * 材质类型到节点材质的映射
     *
     * 将材质类型字符串映射到对应的NodeMaterial类构造函数。
     * 用于将传统材质转换为节点材质。
     *
     * @type {Map<string,import('../../../materials/nodes/NodeMaterial.js').NodeMaterial.constructor>}
     */
    this.materialNodes = new Map();

    /**
     * 色调映射技术到节点函数的映射
     *
     * 将色调映射常量映射到对应的色调映射节点函数。
     * 用于在节点系统中实现各种色调映射算法。
     *
     * @type {Map<number,Function>}
     */
    this.toneMappingNodes = new Map();
  }

  /**
   * 为给定的材质对象返回匹配的节点材质实例
   *
   * 这个方法将传统的Three.js材质转换为对应的节点材质。
   * 它会将原材质的所有属性复制到节点材质中，确保当前的
   * 材质配置能够传递到节点版本。
   *
   * 转换过程：
   * 1. 检查材质是否已经是节点材质
   * 2. 根据材质类型查找对应的节点材质类
   * 3. 创建节点材质实例并复制所有属性
   *
   * @param {import('../../../materials/Material.js').Material} material - 要转换的材质
   * @return {import('../../../materials/nodes/NodeMaterial.js').NodeMaterial} 对应的节点材质
   */
  fromMaterial(material) {
    // 如果已经是节点材质，直接返回
    if (material.isNodeMaterial) return material;

    let nodeMaterial = null;

    // 根据材质类型获取对应的节点材质类
    const nodeMaterialClass = this.getMaterialNodeClass(material.type);

    if (nodeMaterialClass !== null) {
      // 创建节点材质实例
      nodeMaterial = new nodeMaterialClass();

      // 复制原材质的所有属性到节点材质
      for (const key in material) {
        nodeMaterial[key] = material[key];
      }
    }

    return nodeMaterial;
  }

  /**
   * 为色调映射技术添加色调映射节点函数
   *
   * 注册一个色调映射节点函数，使其可以通过色调映射常量进行查找。
   * 这允许渲染器使用节点系统实现各种色调映射算法。
   *
   * @param {Function} toneMappingNode - 色调映射节点函数
   * @param {number} toneMapping - 色调映射常量
   */
  addToneMapping(toneMappingNode, toneMapping) {
    this.addType(toneMappingNode, toneMapping, this.toneMappingNodes);
  }

  /**
   * 获取色调映射技术对应的色调映射节点函数
   *
   * 根据色调映射常量查找对应的节点函数。如果找不到匹配的
   * 节点函数，返回null。
   *
   * @param {number} toneMapping - 色调映射常量
   * @return {?Function} 色调映射节点函数，如果未找到则返回null
   */
  getToneMappingFunction(toneMapping) {
    return this.toneMappingNodes.get(toneMapping) || null;
  }

  /**
   * 获取材质类型对应的节点材质类定义
   *
   * 根据材质类型字符串查找对应的节点材质类构造函数。
   * 这用于将传统材质转换为节点材质。
   *
   * @param {string} materialType - 材质类型字符串
   * @return {?import('../../../materials/nodes/NodeMaterial.js').NodeMaterial.constructor} 节点材质类定义，如果未找到则返回null
   */
  getMaterialNodeClass(materialType) {
    return this.materialNodes.get(materialType) || null;
  }

  /**
   * 为给定的材质类型添加节点材质类定义
   *
   * 注册一个节点材质类，使其可以通过材质类型字符串进行查找。
   * 这允许渲染器将传统材质自动转换为对应的节点材质。
   *
   * @param {import('../../../materials/nodes/NodeMaterial.js').NodeMaterial.constructor} materialNodeClass - 节点材质类定义
   * @param {string} materialClassType - 材质类型字符串
   */
  addMaterial(materialNodeClass, materialClassType) {
    this.addType(materialNodeClass, materialClassType, this.materialNodes);
  }

  /**
   * 获取光源类对应的光源节点类定义
   *
   * 根据光源类构造函数查找对应的光源节点类构造函数。
   * 这用于将传统光源转换为节点系统中的光源节点。
   *
   * @param {import('../../../lights/Light.js').Light.constructor} light - 光源类定义
   * @return {?import('../../../nodes/lighting/AnalyticLightNode.js').AnalyticLightNode.constructor} 光源节点类定义，如果未找到则返回null
   */
  getLightNodeClass(light) {
    return this.lightNodes.get(light) || null;
  }

  /**
   * 为给定的光源类添加光源节点类定义
   *
   * 注册一个光源节点类，使其可以通过光源类构造函数进行查找。
   * 这允许渲染器将传统光源自动转换为对应的光源节点。
   *
   * @param {import('../../../nodes/lighting/AnalyticLightNode.js').AnalyticLightNode.constructor} lightNodeClass - 光源节点类定义
   * @param {import('../../../lights/Light.js').Light.constructor} lightClass - 光源类定义
   */
  addLight(lightNodeClass, lightClass) {
    this.addClass(lightNodeClass, lightClass, this.lightNodes);
  }

  /**
   * 为给定类型向提供的类型库添加节点类定义
   *
   * 这是一个通用的注册方法，用于将节点类与类型标识符关联。
   * 包含类型安全检查和重复定义检测。
   *
   * @param {any} nodeClass - 节点类定义（构造函数）
   * @param {number|string} type - 对象类型标识符
   * @param {Map} library - 类型库（Map实例）
   */
  addType(nodeClass, type, library) {
    // 检查是否已存在该类型的定义
    if (library.has(type)) {
      console.warn(`Redefinition of node ${type}`);
      return;
    }

    // 类型安全检查
    if (typeof nodeClass !== "function") throw new Error(`Node class ${nodeClass.name} is not a class.`);
    if (typeof type === "function" || typeof type === "object") throw new Error(`Base class ${type} is not a class.`);

    // 注册类型映射
    library.set(type, nodeClass);
  }

  /**
   * 为给定类定义向提供的类型库添加节点类定义
   *
   * 这是专门用于类到类映射的注册方法，主要用于光源类的注册。
   * 使用WeakMap确保当基类被垃圾回收时，映射也会被清理。
   *
   * @param {any} nodeClass - 节点类定义（构造函数）
   * @param {any} baseClass - 基类定义（构造函数）
   * @param {WeakMap} library - 类型库（WeakMap实例）
   */
  addClass(nodeClass, baseClass, library) {
    // 检查是否已存在该基类的定义
    if (library.has(baseClass)) {
      console.warn(`Redefinition of node ${baseClass.name}`);
      return;
    }

    // 类型安全检查
    if (typeof nodeClass !== "function") throw new Error(`Node class ${nodeClass.name} is not a class.`);
    if (typeof baseClass !== "function") throw new Error(`Base class ${baseClass.name} is not a class.`);

    // 注册类映射
    library.set(baseClass, nodeClass);
  }
}

export default NodeLibrary;
