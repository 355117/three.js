// 导入节点加载器
import NodeLoader from "./NodeLoader.js";
// 导入节点材质加载器
import NodeMaterialLoader from "./NodeMaterialLoader.js";

// 导入对象加载器基类
import { ObjectLoader } from "../../loaders/ObjectLoader.js";

/**
 * 用于加载使用节点材质的3D对象的特殊对象加载器
 * A special type of object loader for loading 3D objects using
 * node materials.
 *
 * @augments ObjectLoader
 */
class NodeObjectLoader extends ObjectLoader {
  /**
   * 构造一个新的节点对象加载器
   * Constructs a new node object loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器的引用 A reference to a loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数
    super(manager);

    /**
     * 表示节点类型字典
     * Represents a dictionary of node types.
     *
     * @type {Object<string,Node.constructor>}
     */
    this.nodes = {};

    /**
     * 表示节点材质类型字典
     * Represents a dictionary of node material types.
     *
     * @type {Object<string,NodeMaterial.constructor>}
     */
    this.nodeMaterials = {};

    /**
     * 用于保存`nodes` JSON属性的引用
     * A reference to hold the `nodes` JSON property.
     *
     * @private
     * @type {?Object[]}
     */
    this._nodesJSON = null;
  }

  /**
   * 定义节点类型字典
   * Defines the dictionary of node types.
   *
   * @param {Object<string,Node.constructor>} value - 节点库定义为`<classname,class>` The node library defined as `<classname,class>`.
   * @return {NodeObjectLoader} 此加载器的引用 A reference to this loader.
   */
  setNodes(value) {
    // 设置节点类型字典
    this.nodes = value;
    // 返回this以支持链式调用
    return this;
  }

  /**
   * 定义节点材质类型字典
   * Defines the dictionary of node material types.
   *
   * @param {Object<string,NodeMaterial.constructor>} value - 节点材质库定义为`<classname,class>` The node material library defined as `<classname,class>`.
   * @return {NodeObjectLoader} 此加载器的引用 A reference to this loader.
   */
  setNodeMaterials(value) {
    // 设置节点材质类型字典
    this.nodeMaterials = value;
    // 返回this以支持链式调用
    return this;
  }

  /**
   * 从给定的JSON解析节点对象
   * Parses the node objects from the given JSON.
   *
   * @param {Object} json - JSON定义 The JSON definition
   * @param {Function} onLoad - 加载完成回调函数 The onLoad callback function.
   * @return {Object3D} 解析后的3D对象 The parsed 3D object.
   */
  parse(json, onLoad) {
    // 保存节点JSON数据的引用
    this._nodesJSON = json.nodes;

    // 调用父类的parse方法
    const data = super.parse(json, onLoad);

    // 清理节点JSON引用，释放内存
    this._nodesJSON = null; // dispose

    // 返回解析后的数据
    return data;
  }

  /**
   * 从给定的JSON和纹理解析节点对象
   * Parses the node objects from the given JSON and textures.
   *
   * @param {Object[]} json - JSON定义 The JSON definition
   * @param {Object<string,Texture>} textures - 纹理库 The texture library.
   * @return {Object<string,Node>} 解析后的节点 The parsed nodes.
   */
  parseNodes(json, textures) {
    // 如果JSON定义存在
    if (json !== undefined) {
      // 创建节点加载器实例
      const loader = new NodeLoader();
      // 设置节点类型字典
      loader.setNodes(this.nodes);
      // 设置纹理库
      loader.setTextures(textures);

      // 使用节点加载器解析节点
      return loader.parseNodes(json);
    }

    // 如果没有JSON定义，返回空对象
    return {};
  }

  /**
   * 从给定的JSON和纹理解析节点材质
   * Parses the node materials from the given JSON and textures.
   *
   * @param {Object} json - JSON定义 The JSON definition
   * @param {Object<string,Texture>} textures - 纹理库 The texture library.
   * @return {Object<string,NodeMaterial>} 解析后的材质 The parsed materials.
   */
  parseMaterials(json, textures) {
    // 初始化材质字典
    const materials = {};

    // 如果JSON定义存在
    if (json !== undefined) {
      // 首先解析节点对象
      const nodes = this.parseNodes(this._nodesJSON, textures);

      // 创建节点材质加载器实例
      const loader = new NodeMaterialLoader();
      // 设置纹理库
      loader.setTextures(textures);
      // 设置节点字典
      loader.setNodes(nodes);
      // 设置节点材质类型字典
      loader.setNodeMaterials(this.nodeMaterials);

      // 遍历所有材质定义
      for (let i = 0, l = json.length; i < l; i++) {
        // 获取当前材质数据
        const data = json[i];

        // 解析材质并存储到字典中
        materials[data.uuid] = loader.parse(data);
      }
    }

    // 返回解析后的材质字典
    return materials;
  }
}

// 导出NodeObjectLoader类作为默认导出
export default NodeObjectLoader;
