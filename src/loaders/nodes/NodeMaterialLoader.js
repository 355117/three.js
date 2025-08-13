// 导入材质加载器类，作为节点材质加载器的基类
import { MaterialLoader } from "../../loaders/MaterialLoader.js";

/**
 * 用于加载节点材质的特殊类型材质加载器。
 * A special type of material loader for loading node materials.
 *
 * @augments MaterialLoader
 */
class NodeMaterialLoader extends MaterialLoader {
  /**
   * 构造一个新的节点材质加载器。
   * Constructs a new node material loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器的引用。A reference to a loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数，传入加载管理器
    super(manager);

    /**
     * 表示节点类型的字典。
     * Represents a dictionary of node types.
     *
     * @type {Object<string,Node.constructor>}
     */
    this.nodes = {};

    /**
     * 表示节点材质类型的字典。
     * Represents a dictionary of node material types.
     *
     * @type {Object<string,NodeMaterial.constructor>}
     */
    this.nodeMaterials = {};
  }

  /**
   * 从给定的JSON解析节点材质。
   * Parses the node material from the given JSON.
   *
   * @param {Object} json - JSON定义。The JSON definition
   * @return {NodeMaterial}. 解析后的材质。The parsed material.
   */
  parse(json) {
    // 调用父类的parse方法解析基础材质
    const material = super.parse(json);

    // 获取节点字典的引用
    const nodes = this.nodes;
    // 获取输入节点数据
    const inputNodes = json.inputNodes;

    // 遍历所有输入节点属性
    for (const property in inputNodes) {
      // 获取节点的UUID
      const uuid = inputNodes[property];

      // 将对应的节点实例赋值给材质的属性
      material[property] = nodes[uuid];
    }

    // 返回解析完成的材质
    return material;
  }

  /**
   * 定义节点类型字典。
   * Defines the dictionary of node types.
   *
   * @param {Object<string,Node.constructor>} value - 定义为 `<类名,类>` 的节点库。The node library defined as `<classname,class>`.
   * @return {NodeLoader} 对此加载器的引用。A reference to this loader.
   */
  setNodes(value) {
    // 设置节点字典
    this.nodes = value;
    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 定义节点材质类型字典。
   * Defines the dictionary of node material types.
   *
   * @param {Object<string,NodeMaterial.constructor>} value - 定义为 `<类名,类>` 的节点材质库。The node material library defined as `<classname,class>`.
   * @return {NodeLoader} 对此加载器的引用。A reference to this loader.
   */
  setNodeMaterials(value) {
    // 设置节点材质字典
    this.nodeMaterials = value;
    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 从给定类型创建节点材质。
   * Creates a node material from the given type.
   *
   * @param {string} type - 节点材质类型。The node material type.
   * @return {Node} 创建的节点材质实例。The created node material instance.
   */
  createMaterialFromType(type) {
    // 从节点材质字典中获取对应的材质类
    const materialClass = this.nodeMaterials[type];

    // 如果找到了对应的材质类
    if (materialClass !== undefined) {
      // 创建并返回新的材质实例
      return new materialClass();
    }

    // 如果没有找到，调用父类的方法
    return super.createMaterialFromType(type);
  }
}

// 导出NodeMaterialLoader类作为默认导出
export default NodeMaterialLoader;
