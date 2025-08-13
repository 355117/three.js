// 从TSL基础模块导入nodeObject和float函数，用于创建节点对象和浮点数节点
import { nodeObject, float } from "../../nodes/tsl/TSLBase.js";

// 导入基础加载器类
import { Loader } from "../Loader.js";
// 导入文件加载器类，用于加载文件内容
import { FileLoader } from "../../loaders/FileLoader.js";

/**
 * 用于加载three.js JSON对象/场景格式中节点对象的加载器
 * A loader for loading node objects in the three.js JSON Object/Scene format.
 *
 * @augments Loader
 */
class NodeLoader extends Loader {
  /**
   * 构造一个新的节点加载器
   * Constructs a new node loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器的引用 A reference to a loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数
    super(manager);

    /**
     * 表示纹理字典
     * Represents a dictionary of textures.
     *
     * @type {Object<string,Texture>}
     */
    this.textures = {};

    /**
     * 表示节点类型字典
     * Represents a dictionary of node types.
     *
     * @type {Object<string,Node.constructor>}
     */
    this.nodes = {};
  }

  /**
   * 从给定的URL加载节点定义
   * Loads the node definitions from the given URL.
   *
   * @param {string} url - 要加载的文件路径/URL The path/URL of the file to be loaded.
   * @param {Function} onLoad - 加载完成时调用的回调函数 Will be called when load completes.
   * @param {Function} onProgress - 加载过程中调用的进度回调函数 Will be called while load progresses.
   * @param {Function} onError - 加载过程中出现错误时调用的错误回调函数 Will be called when errors are thrown during the loading process.
   */
  load(url, onLoad, onProgress, onError) {
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
      (text) => {
        // 文件加载成功的回调函数
        try {
          // 尝试解析JSON并调用onLoad回调
          onLoad(this.parse(JSON.parse(text)));
        } catch (e) {
          // 捕获解析错误
          if (onError) {
            // 如果提供了错误回调，调用它
            onError(e);
          } else {
            // 否则在控制台输出错误
            console.error(e);
          }

          // 通知加载管理器该项目加载失败
          this.manager.itemError(url);
        }
      },
      onProgress,
      onError
    );
  }

  /**
   * 解析已加载节点的节点依赖关系
   * Parse the node dependencies for the loaded node.
   *
   * @param {Array<Object>} [json] - JSON定义 The JSON definition
   * @return {Object<string,Node>} 包含节点依赖关系的字典 A dictionary with node dependencies.
   */
  parseNodes(json) {
    // 初始化节点字典
    const nodes = {};

    // 如果JSON定义存在
    if (json !== undefined) {
      // 第一遍遍历：创建所有节点实例
      for (const nodeJSON of json) {
        // 解构获取uuid和type
        const { uuid, type } = nodeJSON;

        // 根据类型创建节点并设置uuid
        nodes[uuid] = this.createNodeFromType(type);
        nodes[uuid].uuid = uuid;
      }

      // 创建元数据对象，包含节点和纹理
      const meta = { nodes, textures: this.textures };

      // 第二遍遍历：反序列化所有节点
      for (const nodeJSON of json) {
        // 为节点JSON添加元数据引用
        nodeJSON.meta = meta;

        // 获取对应的节点实例
        const node = nodes[nodeJSON.uuid];
        // 反序列化节点数据
        node.deserialize(nodeJSON);

        // 清理元数据引用
        delete nodeJSON.meta;
      }
    }

    // 返回解析后的节点字典
    return nodes;
  }

  /**
   * 从给定的JSON解析节点
   * Parses the node from the given JSON.
   *
   * @param {Object} json - JSON定义 The JSON definition
   * @param {string} json.type - 节点类型 The node type.
   * @param {string} json.uuid - 节点UUID The node UUID.
   * @param {Array<Object>} [json.nodes] - 节点依赖关系 The node dependencies.
   * @param {Object} [json.meta] - 元数据 The meta data.
   * @return {Node} 解析后的节点 The parsed node.
   */
  parse(json) {
    // 根据类型创建节点实例
    const node = this.createNodeFromType(json.type);
    // 设置节点UUID
    node.uuid = json.uuid;

    // 解析节点依赖关系
    const nodes = this.parseNodes(json.nodes);
    // 创建元数据对象
    const meta = { nodes, textures: this.textures };

    // 为JSON添加元数据引用
    json.meta = meta;

    // 反序列化节点数据
    node.deserialize(json);

    // 清理元数据引用
    delete json.meta;

    // 返回解析后的节点
    return node;
  }

  /**
   * 定义纹理字典
   * Defines the dictionary of textures.
   *
   * @param {Object<string,Texture>} value - 纹理库定义为`<uuid,texture>` The texture library defines as `<uuid,texture>`.
   * @return {NodeLoader} 此加载器的引用 A reference to this loader.
   */
  setTextures(value) {
    // 设置纹理字典
    this.textures = value;
    // 返回this以支持链式调用
    return this;
  }

  /**
   * 定义节点类型字典
   * Defines the dictionary of node types.
   *
   * @param {Object<string,Node.constructor>} value - 节点库定义为`<classname,class>` The node library defined as `<classname,class>`.
   * @return {NodeLoader} 此加载器的引用 A reference to this loader.
   */
  setNodes(value) {
    // 设置节点类型字典
    this.nodes = value;
    // 返回this以支持链式调用
    return this;
  }

  /**
   * 从给定类型创建节点对象
   * Creates a node object from the given type.
   *
   * @param {string} type - 节点类型 The node type.
   * @return {Node} 创建的节点实例 The created node instance.
   */
  createNodeFromType(type) {
    // 检查节点类型是否存在
    if (this.nodes[type] === undefined) {
      // 如果节点类型未找到，输出错误信息
      console.error("THREE.NodeLoader: Node type not found:", type);
      // 返回默认的浮点数节点
      return float();
    }

    // 创建并返回节点对象
    return nodeObject(new this.nodes[type]());
  }
}

// 导出NodeLoader类作为默认导出
export default NodeLoader;
