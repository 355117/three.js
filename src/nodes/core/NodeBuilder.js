// 导入节点系统核心组件
import NodeUniform from "./NodeUniform.js"; // 节点统一变量类
import NodeAttribute from "./NodeAttribute.js"; // 节点属性类
import NodeVarying from "./NodeVarying.js"; // 节点变化变量类
import NodeVar from "./NodeVar.js"; // 节点变量类
import NodeCode from "./NodeCode.js"; // 节点代码类
import NodeCache from "./NodeCache.js"; // 节点缓存类
import ParameterNode from "./ParameterNode.js"; // 参数节点类
import StructType from "./StructType.js"; // 结构体类型类
import FunctionNode from "../code/FunctionNode.js"; // 函数节点类
import NodeMaterial from "../../materials/nodes/NodeMaterial.js"; // 节点材质类
import { getTypeFromLength } from "./NodeUtils.js"; // 从长度获取类型的工具函数
import { NodeUpdateType, defaultBuildStages, shaderStages } from "./constants.js"; // 节点更新类型和构建阶段常量

// 导入各种类型的节点统一变量类
import {
  NumberNodeUniform,
  Vector2NodeUniform,
  Vector3NodeUniform,
  Vector4NodeUniform,
  ColorNodeUniform,
  Matrix2NodeUniform,
  Matrix3NodeUniform,
  Matrix4NodeUniform,
} from "../../renderers/common/nodes/NodeUniform.js";

// 导入堆栈相关功能
import { stack } from "./StackNode.js"; // 堆栈节点
import { getCurrentStack, setCurrentStack } from "../tsl/TSLBase.js"; // TSL基础堆栈管理

// 导入渲染相关组件
import CubeRenderTarget from "../../renderers/common/CubeRenderTarget.js"; // 立方体渲染目标
import ChainMap from "../../renderers/common/ChainMap.js"; // 链式映射

import BindGroup from "../../renderers/common/BindGroup.js"; // 绑定组

// 导入Three.js核心常量和类
import { REVISION, IntType, UnsignedIntType, LinearFilter, LinearMipmapNearestFilter, NearestMipmapLinearFilter, LinearMipmapLinearFilter } from "../../constants.js";
import { RenderTarget } from "../../core/RenderTarget.js"; // 渲染目标
import { Color } from "../../math/Color.js"; // 颜色类
import { Vector2 } from "../../math/Vector2.js"; // 二维向量类
import { Vector3 } from "../../math/Vector3.js"; // 三维向量类
import { Vector4 } from "../../math/Vector4.js"; // 四维向量类
import { Float16BufferAttribute } from "../../core/BufferAttribute.js"; // 16位浮点缓冲属性

// 渲染器缓存，使用WeakMap确保当渲染器被垃圾回收时，相关缓存也会被清理
const rendererCache = new WeakMap();

// 类型化数组到着色器类型的映射表
// 用于将JavaScript的类型化数组转换为对应的着色器数据类型
const typeFromArray = new Map([
  [Int8Array, "int"], // 8位有符号整数数组 -> int类型
  [Int16Array, "int"], // 16位有符号整数数组 -> int类型
  [Int32Array, "int"], // 32位有符号整数数组 -> int类型
  [Uint8Array, "uint"], // 8位无符号整数数组 -> uint类型
  [Uint16Array, "uint"], // 16位无符号整数数组 -> uint类型
  [Uint32Array, "uint"], // 32位无符号整数数组 -> uint类型
  [Float32Array, "float"], // 32位浮点数组 -> float类型
]);

/**
 * 将数值转换为着色器中的浮点数字符串格式。
 * 确保生成的浮点数符合着色器语法要求。
 *
 * @param {number|string} value - 要转换的数值
 * @return {string} 格式化后的浮点数字符串
 */
const toFloat = (value) => {
  // 如果值包含科学计数法（如1e-5），移除正号
  if (/e/g.test(value)) {
    return String(value).replace(/\+/g, "");
  } else {
    // 转换为数字类型
    value = Number(value);

    // 如果是整数，添加.0后缀以确保着色器识别为浮点数
    return value + (value % 1 ? "" : ".0");
  }
};

/**
 * 用于生成基于3D对象及其节点材质定义的着色器程序的构建器基类。
 *
 * NodeBuilder是Three.js节点系统的核心组件，负责将节点图转换为实际的着色器代码。
 * 它管理着色器的构建过程，包括节点分析、代码生成、变量管理等功能。
 * 不同的渲染后端（如WebGL、WebGPU）会继承此类并实现特定的着色器生成逻辑。
 */
class NodeBuilder {
  /**
   * 构造一个新的节点构建器。
   *
   * 此构造函数初始化NodeBuilder实例，设置构建着色器所需的所有基础属性和数据结构。
   * 构建器将基于提供的3D对象、渲染器和解析器来生成相应的着色器代码。
   *
   * @param {Object3D} object - 3D对象，包含几何体和材质信息
   * @param {*} renderer - 当前渲染器实例
   * @param {*} parser - 节点解析器的引用
   */
  constructor(object, renderer, parser) {
    /**
     * 3D对象。
     * 包含要渲染的几何体、材质和变换信息。
     *
     * @type {Object3D}
     */
    this.object = object;

    /**
     * 3D对象的材质。
     * 如果对象存在且有材质，则使用该材质，否则为null。
     *
     * @type {?Material}
     */
    this.material = (object && object.material) || null;

    /**
     * 3D对象的几何体。
     * 包含顶点、法线、UV坐标等几何信息。
     *
     * @type {?BufferGeometry}
     */
    this.geometry = (object && object.geometry) || null;

    /**
     * 当前渲染器。
     * 负责实际的渲染操作，不同的渲染器（WebGL、WebGPU等）有不同的实现。
     *
     * @type {*}
     */
    this.renderer = renderer;

    /**
     * 节点解析器的引用。
     * 用于解析和处理节点图中的各种节点类型。
     *
     * @type {*}
     */
    this.parser = parser;

    /**
     * 3D对象所属的场景。
     * 包含场景级别的信息，如光照、雾效等。
     *
     * @type {?Scene}
     * @default null
     */
    this.scene = null;

    /**
     * 渲染3D对象时使用的相机。
     * 提供视图和投影变换信息。
     *
     * @type {?Camera}
     * @default null
     */
    this.camera = null;

    /**
     * 构建器为此3D对象处理的所有节点列表。
     * 包含参与着色器构建过程的所有节点实例。
     *
     * @type {Array<Node>}
     */
    this.nodes = [];

    /**
     * 所有顺序节点的列表。
     * 这些节点需要按特定顺序处理，通常用于帧和渲染事件。
     *
     * @type {Array<Node>}
     */
    this.sequentialNodes = [];

    /**
     * 需要执行 {@link Node#update} 方法的所有节点列表。
     * 这些节点在每次渲染时都需要更新其状态。
     *
     * @type {Array<Node>}
     */
    this.updateNodes = [];

    /**
     * 需要执行 {@link Node#updateBefore} 方法的所有节点列表。
     * 这些节点在主要更新之前需要执行预处理操作。
     *
     * @type {Array<Node>}
     */
    this.updateBeforeNodes = [];

    /**
     * 需要执行 {@link Node#updateAfter} 方法的所有节点列表。
     * 这些节点在主要更新之后需要执行后处理操作。
     *
     * @type {Array<Node>}
     */
    this.updateAfterNodes = [];

    /**
     * 将每个节点分配给唯一哈希值的字典。
     * 用于快速查找和去重节点，避免重复处理相同的节点。
     *
     * @type {Object<number,Node>}
     */
    this.hashNodes = {};

    /**
     * 节点材质观察者的引用。
     * 用于监听材质变化并触发相应的更新操作。
     *
     * @type {?*}
     * @default null
     */
    this.observer = null;

    /**
     * 当前光照节点的引用。
     * 管理场景中的所有光源信息，用于光照计算。
     *
     * @type {?*}
     * @default null
     */
    this.lightsNode = null;

    /**
     * 当前环境节点的引用。
     * 处理环境光照、反射等环境相关的渲染效果。
     *
     * @type {?Node}
     * @default null
     */
    this.environmentNode = null;

    /**
     * 当前雾效节点的引用。
     * 处理场景中的雾化效果，如线性雾、指数雾等。
     *
     * @type {?Node}
     * @default null
     */
    this.fogNode = null;

    /**
     * 当前裁剪上下文。
     * 管理几何体的裁剪平面和裁剪操作。
     *
     * @type {?*}
     */
    this.clippingContext = null;

    /**
     * 生成的顶点着色器代码。
     * 包含完整的顶点着色器源代码字符串。
     *
     * @type {?string}
     */
    this.vertexShader = null;

    /**
     * 生成的片段着色器代码。
     * 包含完整的片段着色器源代码字符串。
     *
     * @type {?string}
     */
    this.fragmentShader = null;

    /**
     * 生成的计算着色器代码。
     * 包含完整的计算着色器源代码字符串。
     *
     * @type {?string}
     */
    this.computeShader = null;

    /**
     * 用于代码生成主要流程的节点。
     * 按着色器阶段分组存储参与代码生成的节点。
     *
     * @type {Object<string,Array<Node>>}
     */
    this.flowNodes = { vertex: [], fragment: [], compute: [] };

    /**
     * 来自 `.flowNodes` 的节点代码。
     * 存储各个着色器阶段生成的代码字符串。
     *
     * @type {Object<string,string>}
     */
    this.flowCode = { vertex: "", fragment: "", compute: "" };

    /**
     * 此字典保存构建器的节点统一变量。
     * 统一变量按着色器阶段分别维护在数组中。
     *
     * @type {Object}
     */
    this.uniforms = { vertex: [], fragment: [], compute: [], index: 0 };

    /**
     * 此字典保存构建器的输出结构体。
     * 结构体按着色器阶段分别维护在数组中。
     *
     * @type {Object}
     */
    this.structs = { vertex: [], fragment: [], compute: [], index: 0 };

    /**
     * 此字典保存每个着色器阶段的绑定。
     * 用于管理着色器资源的绑定关系。
     *
     * @type {Object}
     */
    this.bindings = { vertex: {}, fragment: {}, compute: {} };

    /**
     * 此字典维护每个绑定组的绑定索引。
     * 用于跟踪和管理资源绑定的索引分配。
     *
     * @type {Object}
     */
    this.bindingsIndexes = {};

    /**
     * 绑定组数组的引用。
     * 存储所有的资源绑定组，用于着色器资源管理。
     *
     * @type {?Array<*>}
     */
    this.bindGroups = null;

    /**
     * 此数组保存通过 {@link AttributeNode} 创建的构建器节点属性。
     * 存储所有的顶点属性信息，如位置、法线、UV坐标等。
     *
     * @type {Array<NodeAttribute>}
     */
    this.attributes = [];

    /**
     * 此数组保存通过 {@link BufferAttributeNode} 创建的构建器节点属性。
     * 存储来自缓冲区的属性信息，通常用于实例化渲染等高级功能。
     *
     * @type {Array<NodeAttribute>}
     */
    this.bufferAttributes = [];

    /**
     * 此数组保存构建器的节点变化变量。
     * 存储在顶点着色器和片段着色器之间传递的变量。
     *
     * @type {Array<NodeVarying>}
     */
    this.varyings = [];

    /**
     * 此字典保存构建器的（原生）节点代码。
     * 代码按着色器阶段分别维护在数组中。
     *
     * @type {Object<string,Array<NodeCode>>}
     */
    this.codes = {};

    /**
     * 此字典保存构建器的节点变量。
     * 变量按着色器阶段分别维护在数组中。
     * 此字典还用于根据变量类型（const、vars）计算变量数量。
     *
     * @type {Object<string,Array<NodeVar>|number>}
     */
    this.vars = {};

    /**
     * 此字典保存每个着色器阶段的声明。
     * 用于管理变量、函数等的声明信息。
     *
     * @type {Object}
     */
    this.declarations = {};

    /**
     * 当前代码流。
     * 在此堆栈中生成的所有代码都将存储在 `.flow` 中。
     *
     * @type {{code: string}}
     */
    this.flow = { code: "" };

    /**
     * 节点链。
     * 用于检查节点图中的递归调用。
     *
     * @type {Array<Node>}
     */
    this.chaining = [];

    /**
     * 当前堆栈。
     * 这反映了代码块层次结构中的当前进程，
     * 了解当前进程是否在条件语句内部等信息很有用。
     *
     * @type {*}
     */
    this.stack = stack();

    /**
     * 堆栈节点列表。
     * 当前堆栈层次结构存储在数组中。
     *
     * @type {Array<*>}
     */
    this.stacks = [];

    /**
     * 制表符值。用于着色器字符串生成。
     * 控制生成代码的缩进格式。
     *
     * @type {string}
     * @default '\t'
     */
    this.tab = "\t";

    /**
     * 当前函数节点的引用。
     * 指向正在处理的函数节点，用于函数作用域管理。
     *
     * @type {?*}
     * @default null
     */
    this.currentFunctionNode = null;

    /**
     * 构建器的上下文。
     * 包含构建过程中需要的各种上下文信息。
     *
     * @type {Object}
     */
    this.context = {
      material: this.material,
    };

    /**
     * 构建器的缓存。
     * 用于缓存节点数据，提高构建性能。
     *
     * @type {NodeCache}
     */
    this.cache = new NodeCache();

    /**
     * 由于 {@link NodeBuilder#cache} 可能被其他缓存临时覆盖，
     * 此成员保留对构建器自己缓存的引用。
     *
     * @type {NodeCache}
     * @default this.cache
     */
    this.globalCache = this.cache;

    // 流数据的弱映射，用于存储节点流相关的数据
    this.flowsData = new WeakMap();

    /**
     * 当前着色器阶段。
     * 指示当前正在处理的着色器类型（顶点、片段、计算等）。
     *
     * @type {?('vertex'|'fragment'|'compute'|'any')}
     */
    this.shaderStage = null;

    /**
     * 当前构建阶段。
     * 指示当前处于构建过程的哪个阶段（设置、分析、生成）。
     *
     * @type {?('setup'|'analyze'|'generate')}
     */
    this.buildStage = null;

    /**
     * 子构建层。
     * 用于管理嵌套的构建过程和层次结构。
     *
     * @type {Array<*>}
     * @default []
     */
    this.subBuildLayers = [];

    /**
     * 当前节点堆栈。
     * 指向当前活动的节点堆栈。
     *
     * @type {?*}
     * @default null
     */
    this.currentStack = null;

    /**
     * 当前子构建TSL函数(Fn)。
     * 用于管理TSL（Three.js Shading Language）函数的构建。
     *
     * @type {?string}
     * @default null
     */
    this.subBuildFn = null;
  }

  /**
   * 返回当前渲染器的绑定组缓存。
   *
   * 此方法管理渲染器级别的绑定组缓存，确保相同的绑定组可以在多个材质间共享，
   * 从而提高渲染性能并减少内存使用。
   *
   * @return {ChainMap} 绑定组缓存
   */
  getBindGroupsCache() {
    // 从渲染器缓存中获取绑定组缓存
    let bindGroupsCache = rendererCache.get(this.renderer);

    // 如果缓存不存在，创建新的链式映射缓存
    if (bindGroupsCache === undefined) {
      bindGroupsCache = new ChainMap();

      // 将新创建的缓存存储到渲染器缓存中
      rendererCache.set(this.renderer, bindGroupsCache);
    }

    return bindGroupsCache;
  }

  /**
   * 用于创建具有给定尺寸和选项的 {@link RenderTarget} 实例的工厂方法。
   *
   * 渲染目标用于离屏渲染，可以将渲染结果输出到纹理而不是屏幕。
   * 常用于后处理效果、阴影映射、反射等高级渲染技术。
   *
   * @param {number} width - 渲染目标的宽度
   * @param {number} height - 渲染目标的高度
   * @param {Object} options - 渲染目标的选项配置
   * @return {RenderTarget} 创建的渲染目标实例
   */
  createRenderTarget(width, height, options) {
    return new RenderTarget(width, height, options);
  }

  /**
   * 用于创建具有给定尺寸和选项的 {@link CubeRenderTarget} 实例的工厂方法。
   *
   * 立方体渲染目标用于环境映射、天空盒渲染等需要6个面的渲染技术。
   * 它包含6个纹理面，分别对应立方体的正X、负X、正Y、负Y、正Z、负Z面。
   *
   * @param {number} size - 立方体渲染目标的尺寸（每个面的边长）
   * @param {Object} options - 立方体渲染目标的选项配置
   * @return {CubeRenderTarget} 创建的立方体渲染目标实例
   */
  createCubeRenderTarget(size, options) {
    return new CubeRenderTarget(size, options);
  }

  /**
   * 检查给定节点是否包含在内部节点数组中。
   *
   * 此方法用于验证节点是否已经被添加到构建器的处理列表中，
   * 避免重复添加相同的节点。
   *
   * @param {Node} node - 要测试的节点
   * @return {boolean} 如果节点包含在内部数组中则返回true，否则返回false
   */
  includes(node) {
    return this.nodes.includes(node);
  }

  /**
   * 返回 {@link OutputStructNode} 所需的输出结构体名称。
   *
   * 这是一个抽象方法，需要在子类中实现。不同的渲染后端
   * 可能有不同的输出结构体命名规则。
   *
   * @abstract
   * @return {string} 输出结构体的名称
   */
  getOutputStructName() {}

  /**
   * 为给定的组名和绑定返回一个绑定组。
   *
   * 此私有方法负责创建和管理着色器资源的绑定组。绑定组是现代图形API
   * （如WebGPU）中用于组织和管理着色器资源（纹理、缓冲区等）的概念。
   *
   * @private
   * @param {string} groupName - 组名称
   * @param {Array<*>} bindings - 绑定列表
   * @return {*} 绑定组实例
   */
  _getBindGroup(groupName, bindings) {
    // 获取绑定组缓存
    const bindGroupsCache = this.getBindGroupsCache();

    // 创建绑定数组
    const bindingsArray = [];

    // 检查是否为共享组（所有绑定都不是独占的）
    let sharedGroup = true;

    // 遍历所有绑定，构建绑定数组并检查共享状态
    for (const binding of bindings) {
      bindingsArray.push(binding);

      // 如果任何绑定的groupNode.shared为true，则不是共享组
      sharedGroup = sharedGroup && binding.groupNode.shared !== true;
    }

    let bindGroup;

    // 如果是共享组，尝试从缓存中获取
    if (sharedGroup) {
      bindGroup = bindGroupsCache.get(bindingsArray);

      // 如果缓存中没有，创建新的绑定组并缓存
      if (bindGroup === undefined) {
        bindGroup = new BindGroup(groupName, bindingsArray, this.bindingsIndexes[groupName].group, bindingsArray);

        bindGroupsCache.set(bindingsArray, bindGroup);
      }
    } else {
      // 如果不是共享组，直接创建新的绑定组
      bindGroup = new BindGroup(groupName, bindingsArray, this.bindingsIndexes[groupName].group, bindingsArray);
    }

    return bindGroup;
  }

  /**
   * 为给定的组名和着色器阶段返回节点统一变量组数组。
   *
   * 此方法管理着色器阶段特定的绑定组，确保每个着色器阶段都有
   * 正确的资源绑定配置。
   *
   * @param {string} groupName - 组名称
   * @param {('vertex'|'fragment'|'compute'|'any')} shaderStage - 着色器阶段
   * @return {Array<*>} 节点统一变量组数组
   */
  getBindGroupArray(groupName, shaderStage) {
    // 获取指定着色器阶段的绑定
    const bindings = this.bindings[shaderStage];

    // 获取指定组名的绑定组
    let bindGroup = bindings[groupName];

    // 如果绑定组不存在，创建新的
    if (bindGroup === undefined) {
      // 如果绑定索引不存在，初始化它
      if (this.bindingsIndexes[groupName] === undefined) {
        this.bindingsIndexes[groupName] = {
          binding: 0,
          group: Object.keys(this.bindingsIndexes).length,
        };
      }

      // 创建新的绑定组数组
      bindings[groupName] = bindGroup = [];
    }

    return bindGroup;
  }

  /**
   * 返回按组分离的所有着色器阶段的绑定列表。
   *
   * 此方法收集所有着色器阶段的绑定，并将它们按组进行组织。
   * 这是着色器资源管理的关键步骤，确保资源能够正确地绑定到着色器。
   *
   * @return {Array<*>} 绑定组列表
   */
  getBindings() {
    // 获取已缓存的绑定组
    let bindingsGroups = this.bindGroups;

    // 如果绑定组尚未创建，则创建它们
    if (bindingsGroups === null) {
      const groups = {};
      const bindings = this.bindings;

      // 遍历所有着色器阶段
      for (const shaderStage of shaderStages) {
        // 遍历当前着色器阶段的所有组
        for (const groupName in bindings[shaderStage]) {
          const uniforms = bindings[shaderStage][groupName];

          // 获取或创建组的统一变量数组
          const groupUniforms = groups[groupName] || (groups[groupName] = []);
          // 将当前阶段的统一变量添加到组中
          groupUniforms.push(...uniforms);
        }
      }

      // 初始化绑定组数组
      bindingsGroups = [];

      // 为每个组创建绑定组
      for (const groupName in groups) {
        const group = groups[groupName];

        // 创建绑定组实例
        const bindingsGroup = this._getBindGroup(groupName, group);

        bindingsGroups.push(bindingsGroup);
      }

      // 缓存创建的绑定组
      this.bindGroups = bindingsGroups;
    }

    return bindingsGroups;
  }

  /**
   * 对绑定组进行排序并更新 {@link NodeBuilder#bindingsIndexes}。
   *
   * 此方法根据绑定组的顺序对它们进行排序，并更新相应的索引。
   * 正确的排序对于着色器资源的绑定顺序很重要。
   */
  sortBindingGroups() {
    // 获取所有绑定组
    const bindingsGroups = this.getBindings();

    // 根据第一个绑定的groupNode.order进行排序
    bindingsGroups.sort((a, b) => a.bindings[0].groupNode.order - b.bindings[0].groupNode.order);

    // 更新每个绑定组的索引
    for (let i = 0; i < bindingsGroups.length; i++) {
      const bindingGroup = bindingsGroups[i];
      // 更新绑定索引中的组索引
      this.bindingsIndexes[bindingGroup.name].group = i;

      // 设置绑定组的索引
      bindingGroup.index = i;
    }
  }

  /**
   * 构建器在基于哈希的字典中维护每个节点。
   * 此方法将给定的节点（值）与给定的哈希（键）设置到此字典中。
   *
   * 哈希字典用于快速查找和去重节点，避免重复处理相同的节点。
   *
   * @param {Node} node - 要添加的节点
   * @param {number} hash - 节点的哈希值
   */
  setHashNode(node, hash) {
    this.hashNodes[hash] = node;
  }

  /**
   * 向此构建器添加一个节点。
   *
   * 此方法将节点添加到构建器的处理列表中，并为其分配哈希值。
   * 如果节点已经存在，则不会重复添加。
   *
   * @param {Node} node - 要添加的节点
   */
  addNode(node) {
    // 检查节点是否已经存在，避免重复添加
    if (this.nodes.includes(node) === false) {
      // 将节点添加到节点列表
      this.nodes.push(node);

      // 为节点设置哈希值，用于快速查找和去重
      this.setHashNode(node, node.getHash(this));
    }
  }

  /**
   * 用于添加将用作FRAME和RENDER事件的节点，
   * 这些节点需要按照特定的调用顺序才能正常工作。
   * 此函数应在'build()'过程中的'setup()'之后调用，以确保子节点首先被处理。
   *
   * 顺序节点通常用于时间相关的更新和渲染事件处理。
   *
   * @param {Node} node - 要添加的节点
   */
  addSequentialNode(node) {
    // 检查节点是否已经在顺序节点列表中
    if (this.sequentialNodes.includes(node) === false) {
      this.sequentialNodes.push(node);
    }
  }

  /**
   * 检查节点的更新类型。
   *
   * 此方法遍历所有节点，根据它们的更新类型将它们分类到不同的更新列表中。
   * 这样可以在渲染时按照正确的顺序和时机执行节点更新。
   */
  buildUpdateNodes() {
    // 遍历所有普通节点
    for (const node of this.nodes) {
      const updateType = node.getUpdateType();

      // 如果节点需要更新，添加到更新节点列表
      if (updateType !== NodeUpdateType.NONE) {
        this.updateNodes.push(node.getSelf());
      }
    }

    // 遍历所有顺序节点
    for (const node of this.sequentialNodes) {
      const updateBeforeType = node.getUpdateBeforeType();
      const updateAfterType = node.getUpdateAfterType();

      // 如果节点需要前置更新，添加到前置更新列表
      if (updateBeforeType !== NodeUpdateType.NONE) {
        this.updateBeforeNodes.push(node.getSelf());
      }

      // 如果节点需要后置更新，添加到后置更新列表
      if (updateAfterType !== NodeUpdateType.NONE) {
        this.updateAfterNodes.push(node.getSelf());
      }
    }
  }

  /**
   * 当前节点的引用，即节点链中的最后一个节点。
   *
   * 此getter返回当前正在处理的节点，通常是节点链中的最后一个节点。
   * 用于跟踪当前的处理上下文。
   *
   * @type {Node}
   */
  get currentNode() {
    return this.chaining[this.chaining.length - 1];
  }

  /**
   * 检查给定纹理是否使用了过滤。
   *
   * 此方法检查纹理的放大和缩小过滤器设置，判断是否使用了线性过滤。
   * 过滤纹理通常需要特殊的处理，特别是在某些渲染管线中。
   *
   * @param {Texture} texture - 要检查的纹理
   * @return {boolean} 如果纹理使用了过滤则返回true，否则返回false
   */
  isFilteredTexture(texture) {
    return (
      // 检查放大过滤器是否为线性过滤
      texture.magFilter === LinearFilter ||
      texture.magFilter === LinearMipmapNearestFilter ||
      texture.magFilter === NearestMipmapLinearFilter ||
      texture.magFilter === LinearMipmapLinearFilter ||
      // 检查缩小过滤器是否为线性过滤
      texture.minFilter === LinearFilter ||
      texture.minFilter === LinearMipmapNearestFilter ||
      texture.minFilter === NearestMipmapLinearFilter ||
      texture.minFilter === LinearMipmapLinearFilter
    );
  }

  /**
   * 将给定节点添加到内部节点链中。
   * 这用于检查节点图中的递归调用。
   *
   * 节点链用于跟踪当前的处理路径，防止无限递归。
   *
   * @param {Node} node - 要添加的节点
   */
  addChain(node) {
    /*
		// 可选的递归检测代码（已注释）
		if ( this.chaining.indexOf( node ) !== - 1 ) {
			console.warn( 'Recursive node: ', node );
		}
		*/

    // 将节点添加到链的末尾
    this.chaining.push(node);
  }

  /**
   * 从内部节点链中移除给定节点。
   *
   * 此方法确保节点链的完整性，移除的节点必须是链中的最后一个节点。
   * 如果不是，则抛出错误。
   *
   * @param {Node} node - 要移除的节点
   */
  removeChain(node) {
    // 移除链中的最后一个节点
    const lastChain = this.chaining.pop();

    // 验证移除的节点是否正确
    if (lastChain !== node) {
      throw new Error("NodeBuilder: Invalid node chaining!");
    }
  }

  /**
   * 为给定的通用名称返回原生着色器方法名称。
   * 例如，方法名称 `textureDimensions` 匹配WGSL名称，但在GLSL中必须解析为 `textureSize`。
   *
   * 这是一个抽象方法，不同的着色器语言实现会有不同的方法名称映射。
   *
   * @abstract
   * @param {string} method - 要解析的方法名称
   * @return {string} 解析后的方法名称
   */
  getMethod(method) {
    return method;
  }

  /**
   * 返回三元操作的原生代码片段。
   * 例如，GLSL会输出三元操作为 `cond ? x : y`，而WGSL会输出为 `select(y, x, cond)`。
   *
   * 这是一个抽象方法，不同的着色器语言有不同的三元操作语法。
   *
   * @abstract
   * @param {string} condSnippet - 决定解析哪个表达式的条件
   * @param {string} ifSnippet - 条件为真时解析的表达式
   * @param {string} elseSnippet - 条件为假时解析的表达式
   * @return {string} 解析后的方法名称
   */
  getTernary(/* condSnippet, ifSnippet, elseSnippet*/) {
    return null;
  }

  /**
   * 为给定的哈希返回节点，参见 {@link NodeBuilder#setHashNode}。
   *
   * 此方法用于根据哈希值快速查找已缓存的节点，避免重复创建相同的节点。
   *
   * @param {number} hash - 节点的哈希值
   * @return {Node} 找到的节点
   */
  getNodeFromHash(hash) {
    return this.hashNodes[hash];
  }

  /**
   * 将节点添加到目标流中，以便在'generate'过程中生成代码。
   *
   * 流节点用于组织代码生成的顺序，确保着色器代码按正确的顺序生成。
   *
   * @param {('vertex'|'fragment'|'compute')} shaderStage - 着色器阶段
   * @param {Node} node - 要添加的节点
   * @return {Node} 添加的节点
   */
  addFlow(shaderStage, node) {
    // 将节点添加到指定着色器阶段的流节点列表
    this.flowNodes[shaderStage].push(node);

    return node;
  }

  /**
   * 设置构建器的上下文。
   *
   * 上下文包含构建过程中需要的各种信息和状态。
   *
   * @param {Object} context - 要设置的上下文
   */
  setContext(context) {
    this.context = context;
  }

  /**
   * 返回构建器的当前上下文。
   *
   * 上下文包含当前构建过程的状态和配置信息。
   *
   * @return {Object} 构建器的当前上下文
   */
  getContext() {
    return this.context;
  }

  /**
   * 获取可在不同材质间共享的着色器构建上下文。
   * 这是必要的，因为渲染器缓存可以重用在一个材质中生成的着色器并在另一个材质中使用它们。
   *
   * 共享上下文移除了材质特定的信息，使着色器可以在多个材质间复用。
   *
   * @return {Object} 不包含材质信息的构建器当前上下文
   */
  getSharedContext() {
    // 创建上下文的副本
    const context = { ...this.context };

    // 移除材质特定的信息
    delete context.material;

    // 注意：这里应该返回context而不是this.context
    return context;
  }

  /**
   * 设置构建器的缓存。
   *
   * 缓存用于存储节点数据，提高构建性能并避免重复计算。
   *
   * @param {NodeCache} cache - 要设置的缓存
   */
  setCache(cache) {
    this.cache = cache;
  }

  /**
   * 返回构建器的当前缓存。
   *
   * 缓存包含了构建过程中的节点数据和中间结果。
   *
   * @return {NodeCache} 构建器的当前缓存
   */
  getCache() {
    return this.cache;
  }

  /**
   * 为给定节点返回一个缓存。
   *
   * 此方法为节点创建或获取专用的缓存，用于存储节点特定的数据。
   * 可以选择是否使用父缓存来建立缓存层次结构。
   *
   * @param {Node} node - 节点
   * @param {boolean} [parent=true] - 此节点是否引用共享的父缓存
   * @return {NodeCache} 节点的缓存
   */
  getCacheFromNode(node, parent = true) {
    // 获取节点的数据
    const data = this.getDataFromNode(node);
    // 如果缓存不存在，创建新的缓存
    if (data.cache === undefined) data.cache = new NodeCache(parent ? this.getCache() : null);

    return data.cache;
  }

  /**
   * 检查请求的功能是否可用。
   *
   * 这是一个抽象方法，不同的渲染后端会有不同的功能支持。
   * 例如，某些功能可能只在WebGPU中可用，而在WebGL中不可用。
   *
   * @abstract
   * @param {string} name - 请求的功能名称
   * @return {boolean} 功能是否受支持
   */
  isAvailable(/*name*/) {
    return false;
  }

  /**
   * 返回顶点索引输入变量的原生着色器字符串。
   *
   * 这是一个抽象方法，不同的着色器语言有不同的顶点索引变量名称。
   * 顶点索引用于标识当前处理的顶点在顶点数组中的位置。
   *
   * @abstract
   * @return {string} 顶点索引着色器字符串
   */
  getVertexIndex() {
    console.warn("Abstract function.");
  }

  /**
   * 返回实例索引输入变量的原生着色器字符串。
   *
   * 这是一个抽象方法，用于实例化渲染。实例索引标识当前渲染的实例。
   * 在实例化渲染中，同一个几何体可以被渲染多次，每次有不同的变换。
   *
   * @abstract
   * @return {string} 实例索引着色器字符串
   */
  getInstanceIndex() {
    console.warn("Abstract function.");
  }

  /**
   * 返回绘制索引输入变量的原生着色器字符串。
   * 仅与WebGL及其 `WEBGL_multi_draw` 扩展相关。
   *
   * 绘制索引用于多重绘制调用，允许在单个绘制调用中渲染多个对象。
   * 这是一个性能优化功能，主要在WebGL中使用。
   *
   * @abstract
   * @return {?string} 绘制索引着色器字符串
   */
  getDrawIndex() {
    console.warn("Abstract function.");
  }

  /**
   * 返回正面朝向输入变量的原生着色器字符串。
   *
   * 正面朝向变量用于确定当前片段是否属于面向相机的表面。
   * 这在双面材质渲染和背面剔除中很有用。
   *
   * @abstract
   * @return {string} 正面朝向着色器字符串
   */
  getFrontFacing() {
    console.warn("Abstract function.");
  }

  /**
   * 返回片段坐标输入变量的原生着色器字符串。
   *
   * 片段坐标提供当前片段在屏幕空间中的像素坐标。
   * 常用于屏幕空间效果和后处理。
   *
   * @abstract
   * @return {string} 片段坐标着色器字符串
   */
  getFragCoord() {
    console.warn("Abstract function.");
  }

  /**
   * 是否沿垂直轴翻转纹理数据。
   * WebGL需要此方法返回 `true`，WebGPU需要返回 `false`。
   *
   * 不同的图形API对纹理坐标系统有不同的约定。
   * WebGL使用左下角为原点，而WebGPU使用左上角为原点。
   *
   * @abstract
   * @return {boolean} 是否沿垂直轴翻转纹理数据
   */
  isFlipY() {
    return false;
  }

  /**
   * 调用此方法将给定节点的使用计数增加一。
   *
   * 使用计数用于跟踪节点被引用的次数，这对于优化和调试很有用。
   * 高使用计数的节点可能需要特殊的优化处理。
   *
   * @param {Node} node - 要增加使用计数的节点
   * @return {number} 更新后的使用计数
   */
  increaseUsage(node) {
    // 获取节点数据
    const nodeData = this.getDataFromNode(node);
    // 增加使用计数，如果未定义则初始化为1
    nodeData.usageCount = nodeData.usageCount === undefined ? 1 : nodeData.usageCount + 1;

    return nodeData.usageCount;
  }

  /**
   * 为给定的纹理数据生成纹理采样着色器字符串。
   *
   * 这是一个抽象方法，不同的着色器语言有不同的纹理采样语法。
   * 纹理采样是着色器中最常用的操作之一。
   *
   * @abstract
   * @param {Texture} texture - 纹理对象
   * @param {string} textureProperty - 纹理属性名称
   * @param {string} uvSnippet - 定义纹理坐标的代码片段
   * @return {string} 生成的着色器字符串
   */
  generateTexture(/* texture, textureProperty, uvSnippet */) {
    console.warn("Abstract function.");
  }

  /**
   * 为给定的纹理数据生成纹理LOD着色器字符串。
   *
   * LOD（Level of Detail）采样允许指定要采样的mip级别。
   * 这对于实现特殊的视觉效果和性能优化很有用。
   *
   * @abstract
   * @param {Texture} texture - 纹理对象
   * @param {string} textureProperty - 纹理属性名称
   * @param {string} uvSnippet - 定义纹理坐标的代码片段
   * @param {?string} depthSnippet - 定义要采样的基于0的纹理数组索引的代码片段
   * @param {string} levelSnippet - 定义mip级别的代码片段
   * @return {string} 生成的着色器字符串
   */
  generateTextureLod(/* texture, textureProperty, uvSnippet, depthSnippet, levelSnippet */) {
    console.warn("Abstract function.");
  }

  /**
   * 生成数组声明字符串。
   *
   * 此方法创建着色器中数组类型的声明语法。
   * 不同的着色器语言可能有不同的数组声明语法。
   *
   * @param {string} type - 数组元素类型
   * @param {?number} [count] - 数组元素数量
   * @return {string} 生成的着色器字符串
   */
  generateArrayDeclaration(type, count) {
    // 生成类似 "float[ 5 ]" 的数组声明
    return this.getType(type) + "[ " + count + " ]";
  }

  /**
   * 为给定类型和值生成数组着色器字符串。
   *
   * 此方法生成数组的初始化语法，包括数组声明和初始值。
   * 如果没有提供值，则使用默认的常量值填充。
   *
   * @param {string} type - 数组元素类型
   * @param {?number} [count] - 数组元素数量
   * @param {?Array<Node>} [values=null] - 默认值数组
   * @return {string} 生成的着色器字符串
   */
  generateArray(type, count, values = null) {
    // 开始构建数组初始化语法
    let snippet = this.generateArrayDeclaration(type, count) + "( ";

    // 遍历数组元素
    for (let i = 0; i < count; i++) {
      // 获取当前索引的值
      const value = values ? values[i] : null;

      if (value !== null) {
        // 如果有值，构建节点代码
        snippet += value.build(this, type);
      } else {
        // 如果没有值，使用默认常量
        snippet += this.generateConst(type);
      }

      // 添加分隔符（除了最后一个元素）
      if (i < count - 1) snippet += ", ";
    }

    // 结束数组初始化语法
    snippet += " )";

    return snippet;
  }

  /**
   * 生成结构体着色器字符串。
   *
   * 此方法根据成员布局和值生成结构体的初始化代码。
   * 结构体是着色器中组织复杂数据的重要方式。
   *
   * @param {string} type - 结构体类型名称
   * @param {Array<Object>} [membersLayout] - 成员布局定义
   * @param {?Array<Node>} [values=null] - 默认值
   * @return {string} 生成的着色器字符串
   */
  generateStruct(type, membersLayout, values = null) {
    const snippets = [];

    // 遍历结构体的每个成员
    for (const member of membersLayout) {
      const { name, type } = member;

      // 如果提供了值且该值是节点
      if (values && values[name] && values[name].isNode) {
        // 构建节点代码
        snippets.push(values[name].build(this, type));
      } else {
        // 使用默认常量值
        snippets.push(this.generateConst(type));
      }
    }

    // 生成结构体构造函数调用
    return type + "( " + snippets.join(", ") + " )";
  }

  /**
   * 为给定类型和值生成着色器字符串。
   *
   * 此方法是常量生成的核心，处理各种基础类型和复合类型的常量生成。
   * 它确保生成的常量符合目标着色器语言的语法要求。
   *
   * @param {string} type - 数据类型
   * @param {?any} [value=null] - 值，如果为null则使用默认值
   * @return {string} 生成的着色器字符串
   */
  generateConst(type, value = null) {
    // 如果没有提供值，使用类型的默认值
    if (value === null) {
      if (type === "float" || type === "int" || type === "uint") value = 0;
      else if (type === "bool") value = false;
      else if (type === "color") value = new Color();
      else if (type === "vec2") value = new Vector2();
      else if (type === "vec3") value = new Vector3();
      else if (type === "vec4") value = new Vector4();
    }

    // 处理基础类型
    if (type === "float") return toFloat(value);
    if (type === "int") return `${Math.round(value)}`;
    if (type === "uint") return value >= 0 ? `${Math.round(value)}u` : "0u";
    if (type === "bool") return value ? "true" : "false";
    if (type === "color") return `${this.getType("vec3")}( ${toFloat(value.r)}, ${toFloat(value.g)}, ${toFloat(value.b)} )`;

    // 获取类型长度和组件类型
    const typeLength = this.getTypeLength(type);
    const componentType = this.getComponentType(type);

    // 递归生成组件常量的函数
    const generateConst = (value) => this.generateConst(componentType, value);

    // 处理向量类型
    if (typeLength === 2) {
      return `${this.getType(type)}( ${generateConst(value.x)}, ${generateConst(value.y)} )`;
    } else if (typeLength === 3) {
      return `${this.getType(type)}( ${generateConst(value.x)}, ${generateConst(value.y)}, ${generateConst(value.z)} )`;
    } else if (typeLength === 4 && type !== "mat2") {
      return `${this.getType(type)}( ${generateConst(value.x)}, ${generateConst(value.y)}, ${generateConst(value.z)}, ${generateConst(value.w)} )`;
    } else if (typeLength >= 4 && value && (value.isMatrix2 || value.isMatrix3 || value.isMatrix4)) {
      // 处理矩阵类型
      return `${this.getType(type)}( ${value.elements.map(generateConst).join(", ")} )`;
    } else if (typeLength > 4) {
      // 处理复杂类型，使用默认构造函数
      return `${this.getType(type)}()`;
    }

    // 如果类型不支持，抛出错误
    throw new Error(`NodeBuilder: Type '${type}' not found in generate constant attempt.`);
  }

  /**
   * 可能需要将某些数据类型转换为不同的类型，
   * 此方法可用于隐藏转换过程。
   *
   * 不同的着色器语言可能对相同的概念使用不同的类型名称。
   * 例如，Three.js中的"color"类型在着色器中通常表示为"vec3"。
   *
   * @param {string} type - 输入类型
   * @return {string} 更新后的类型
   */
  getType(type) {
    // 将颜色类型转换为vec3
    if (type === "color") return "vec3";

    return type;
  }

  /**
   * 检查给定的属性名称是否在几何体中定义。
   *
   * 此方法用于验证几何体是否包含指定的顶点属性，
   * 如位置、法线、UV坐标等。
   *
   * @param {string} name - 属性名称
   * @return {boolean} 如果属性在几何体中定义则返回true
   */
  hasGeometryAttribute(name) {
    return this.geometry && this.geometry.getAttribute(name) !== undefined;
  }

  /**
   * 为给定的名称和类型返回节点属性。
   *
   * 此方法首先查找现有的属性，如果找不到则创建新的属性。
   * 这确保了相同名称的属性只会被创建一次。
   *
   * @param {string} name - 属性名称
   * @param {string} type - 属性类型
   * @return {NodeAttribute} 节点属性
   */
  getAttribute(name, type) {
    const attributes = this.attributes;

    // 查找现有属性
    for (const attribute of attributes) {
      if (attribute.name === name) {
        return attribute;
      }
    }

    // 如果不存在则创建新属性
    const attribute = new NodeAttribute(name, type);

    // 注册属性声明
    this.registerDeclaration(attribute);

    // 添加到属性列表
    attributes.push(attribute);

    return attribute;
  }

  /**
   * 为给定节点和着色器阶段返回着色器的属性名称。
   *
   * 此方法用于获取节点在特定着色器阶段中的属性名称。
   * 默认实现返回节点的名称，但子类可以重写此方法。
   *
   * @param {Node} node - 节点
   * @param {('vertex'|'fragment'|'compute'|'any')} shaderStage - 着色器阶段
   * @return {string} 属性名称
   */
  getPropertyName(node /*, shaderStage*/) {
    return node.name;
  }

  /**
   * 检查给定类型是否为向量类型。
   *
   * 向量类型包括vec2、vec3、vec4等。
   * 此方法使用正则表达式来匹配向量类型模式。
   *
   * @param {string} type - 要检查的类型
   * @return {boolean} 如果是向量类型则返回true
   */
  isVector(type) {
    return /vec\d/.test(type);
  }

  /**
   * 检查给定类型是否为矩阵类型。
   *
   * 矩阵类型包括mat2、mat3、mat4等。
   * 此方法使用正则表达式来匹配矩阵类型模式。
   *
   * @param {string} type - 要检查的类型
   * @return {boolean} 如果是矩阵类型则返回true
   */
  isMatrix(type) {
    return /mat\d/.test(type);
  }

  /**
   * 检查给定类型是否为引用类型。
   *
   * 引用类型是不直接存储值的类型，而是引用其他资源。
   * 这些类型在着色器中有特殊的处理方式。
   *
   * @param {string} type - 要检查的类型
   * @return {boolean} 如果是引用类型则返回true
   */
  isReference(type) {
    return (
      type === "void" || // 空类型
      type === "property" || // 属性类型
      type === "sampler" || // 采样器类型
      type === "samplerComparison" || // 比较采样器类型
      type === "texture" || // 纹理类型
      type === "cubeTexture" || // 立方体纹理类型
      type === "storageTexture" || // 存储纹理类型
      type === "depthTexture" || // 深度纹理类型
      type === "texture3D" // 3D纹理类型
    );
  }

  /**
   * 检查给定纹理是否需要手动转换到工作颜色空间。
   *
   * 这是一个抽象方法，不同的渲染后端可能有不同的颜色空间处理需求。
   * 颜色空间转换对于正确的颜色显示很重要。
   *
   * @abstract
   * @param {Texture} texture - 要检查的纹理
   * @return {boolean} 如果纹理需要转换到工作颜色空间则返回true
   */
  needsToWorkingColorSpace(/*texture*/) {
    return false;
  }

  /**
   * 返回给定纹理的组件类型。
   *
   * 根据纹理的数据类型确定其组件类型。
   * 数据纹理可能包含整数数据，而普通纹理通常是浮点数据。
   *
   * @param {Texture} texture - 纹理对象
   * @return {string} 组件类型
   */
  getComponentTypeFromTexture(texture) {
    const type = texture.type;

    // 如果是数据纹理，检查具体的数据类型
    if (texture.isDataTexture) {
      if (type === IntType) return "int";
      if (type === UnsignedIntType) return "uint";
    }

    // 默认为浮点类型
    return "float";
  }

  /**
   * 返回给定类型的元素类型。
   *
   * 对于矩阵类型，返回其行向量类型。
   * 对于其他类型，返回其组件类型。
   *
   * @param {string} type - 输入类型
   * @return {string} 元素类型
   */
  getElementType(type) {
    // 矩阵类型的元素类型是对应的向量类型
    if (type === "mat2") return "vec2";
    if (type === "mat3") return "vec3";
    if (type === "mat4") return "vec4";

    // 其他类型返回组件类型
    return this.getComponentType(type);
  }

  /**
   * 返回给定类型的组件类型。
   *
   * 此方法解析复合类型（如向量、矩阵）的基础组件类型。
   * 使用正则表达式来解析类型字符串。
   *
   * @param {string} type - 输入类型
   * @return {string} 组件类型
   */
  getComponentType(type) {
    // 首先获取向量类型
    type = this.getVectorType(type);

    // 如果是基础类型，直接返回
    if (type === "float" || type === "bool" || type === "int" || type === "uint") return type;

    // 使用正则表达式解析复合类型
    // 匹配模式：(前缀)(vec|mat)(维度)
    const componentType = /(b|i|u|)(vec|mat)([2-4])/.exec(type);

    if (componentType === null) return null;

    // 根据前缀确定组件类型
    if (componentType[1] === "b") return "bool"; // 布尔类型前缀
    if (componentType[1] === "i") return "int"; // 整数类型前缀
    if (componentType[1] === "u") return "uint"; // 无符号整数类型前缀

    return "float";
  }

  /**
   * 根据给定的类型返回向量类型。
   * 将特殊类型（如颜色、纹理）映射到对应的向量类型。
   *
   * @param {string} type - 输入类型
   * @return {string} 对应的向量类型
   */
  getVectorType(type) {
    // 颜色类型映射为三维向量
    if (type === "color") return "vec3";
    // 各种纹理类型映射为四维向量
    if (type === "texture" || type === "cubeTexture" || type === "storageTexture" || type === "texture3D") return "vec4";

    // 其他类型保持不变
    return type;
  }

  /**
   * 根据给定的长度和组件类型返回数据类型。
   * 用于构建向量或矩阵类型的字符串表示。
   *
   * @param {number} length - 向量长度
   * @param {string} [componentType='float'] - 组件类型（默认为float）
   * @return {string} 构建的类型字符串
   */
  getTypeFromLength(length, componentType = "float") {
    // 长度为1时直接返回组件类型
    if (length === 1) return componentType;

    // 获取基础类型（如vec2、vec3、vec4）
    let baseType = getTypeFromLength(length);
    // 为非float类型添加前缀（如i、u）
    const prefix = componentType === "float" ? "" : componentType[0];

    // 修复mat2x2与vec4大小相同的边界情况
    if (/mat2/.test(componentType) === true) {
      baseType = baseType.replace("vec", "mat");
    }

    // 返回带前缀的类型
    return prefix + baseType;
  }

  /**
   * 根据给定的类型化数组返回对应的类型。
   * 通过查找预定义的映射表获取数组构造函数对应的类型。
   *
   * @param {TypedArray} array - 类型化数组
   * @return {string} 对应的类型字符串
   */
  getTypeFromArray(array) {
    // 从映射表中获取数组构造函数对应的类型
    return typeFromArray.get(array.constructor);
  }

  /**
   * 判断给定类型是否为整数类型。
   * 通过正则表达式检查类型名称中是否包含整数标识符。
   *
   * @param {string} type - 要检查的类型
   * @return {boolean} 如果是整数类型返回true，否则返回false
   */
  isInteger(type) {
    // 检查是否包含int、uint或整数向量类型标识符
    return /int|uint|(i|u)vec/.test(type);
  }

  /**
   * 根据给定的缓冲区属性返回对应的类型。
   * 分析缓冲区属性的数组类型、项大小和标准化状态来确定类型。
   *
   * @param {BufferAttribute} attribute - 缓冲区属性
   * @return {string} 对应的类型字符串
   */
  getTypeFromAttribute(attribute) {
    // 获取数据属性，处理交错缓冲区属性的情况
    let dataAttribute = attribute;

    // 如果是交错缓冲区属性，使用其数据部分
    if (attribute.isInterleavedBufferAttribute) dataAttribute = attribute.data;

    // 提取属性信息
    const array = dataAttribute.array; // 底层数组
    const itemSize = attribute.itemSize; // 每项的大小
    const normalized = attribute.normalized; // 是否标准化

    let arrayType;

    // 对于非Float16且未标准化的属性，获取数组类型
    if (!(attribute instanceof Float16BufferAttribute) && normalized !== true) {
      arrayType = this.getTypeFromArray(array);
    }

    // 根据项大小和数组类型构建最终类型
    return this.getTypeFromLength(itemSize, arrayType);
  }

  /**
   * 返回给定数据类型的长度。
   * 用于确定向量、矩阵等类型包含的元素数量。
   *
   * @param {string} type - 数据类型
   * @return {number} 类型的长度（元素数量）
   */
  getTypeLength(type) {
    // 获取向量类型
    const vecType = this.getVectorType(type);
    // 提取向量维度数字（如vec3中的3）
    const vecNum = /vec([2-4])/.exec(vecType);

    // 如果是向量类型，返回维度数
    if (vecNum !== null) return Number(vecNum[1]);
    // 标量类型长度为1
    if (vecType === "float" || vecType === "bool" || vecType === "int" || vecType === "uint") return 1;
    // 矩阵类型的长度
    if (/mat2/.test(type) === true) return 4; // 2x2矩阵
    if (/mat3/.test(type) === true) return 9; // 3x3矩阵
    if (/mat4/.test(type) === true) return 16; // 4x4矩阵

    // 未知类型返回0
    return 0;
  }

  /**
   * 根据给定的矩阵类型返回对应的向量类型。
   * 简单地将"mat"替换为"vec"来实现转换。
   *
   * @param {string} type - 矩阵类型
   * @return {string} 对应的向量类型
   */
  getVectorFromMatrix(type) {
    // 将矩阵类型转换为向量类型（mat -> vec）
    return type.replace("mat", "vec");
  }

  /**
   * 为给定类型更改组件类型。
   * 例如，将`vec4`的组件类型更改为`uint`会得到`uvec4`。
   *
   * @param {string} type - 原始类型
   * @param {string} newComponentType - 新的组件类型
   * @return {string} 更改组件类型后的新类型
   */
  changeComponentType(type, newComponentType) {
    // 获取类型长度，然后用新组件类型重新构建
    return this.getTypeFromLength(this.getTypeLength(type), newComponentType);
  }

  /**
   * 返回给定类型对应的整数类型。
   * 如果已经是整数类型则直接返回，否则转换为int类型。
   *
   * @param {string} type - 输入类型
   * @return {string} 对应的整数类型
   */
  getIntegerType(type) {
    // 获取组件类型
    const componentType = this.getComponentType(type);

    // 如果已经是整数类型，直接返回
    if (componentType === "int" || componentType === "uint") return type;

    // 否则转换为int类型
    return this.changeComponentType(type, "int");
  }

  /**
   * 向内部堆栈添加一个堆栈节点。
   * 用于管理节点构建过程中的上下文堆栈。
   *
   * @return {StackNode} 添加的堆栈节点
   */
  addStack() {
    // 创建新的堆栈节点，以当前堆栈为父节点
    this.stack = stack(this.stack);

    // 将当前堆栈或新堆栈推入堆栈数组
    this.stacks.push(getCurrentStack() || this.stack);
    // 设置当前堆栈
    setCurrentStack(this.stack);

    return this.stack;
  }

  /**
   * 从内部堆栈移除最后一个堆栈节点。
   * 恢复到上一个堆栈状态。
   *
   * @return {StackNode} 被移除的堆栈节点
   */
  removeStack() {
    // 保存当前堆栈引用
    const lastStack = this.stack;
    // 恢复到父堆栈
    this.stack = lastStack.parent;

    // 从堆栈数组中弹出并设置为当前堆栈
    setCurrentStack(this.stacks.pop());

    return lastStack;
  }

  /**
   * 构建器在构建过程中为每个节点维护（缓存的）数据。
   * 此方法可用于获取特定着色器阶段和缓存的这些数据。
   *
   * @param {Node} node - 要获取数据的节点
   * @param {('vertex'|'fragment'|'compute'|'any')} [shaderStage=this.shaderStage] - 着色器阶段
   * @param {?NodeCache} cache - 可选的缓存对象
   * @return {Object} 节点数据
   */
  getDataFromNode(node, shaderStage = this.shaderStage, cache = null) {
    // 确定使用的缓存：全局节点使用全局缓存，否则使用本地缓存
    cache = cache === null ? (node.isGlobal(this) ? this.globalCache : this.cache) : cache;

    // 从缓存中获取节点数据
    let nodeData = cache.getData(node);

    // 如果数据不存在，创建新的数据对象
    if (nodeData === undefined) {
      nodeData = {};
      cache.setData(node, nodeData);
    }

    // 确保着色器阶段的数据对象存在
    if (nodeData[shaderStage] === undefined) nodeData[shaderStage] = {};

    // 获取当前着色器阶段的数据
    let data = nodeData[shaderStage];

    // 处理子构建相关的数据
    const subBuilds = nodeData.any ? nodeData.any.subBuilds : null;
    const subBuild = this.getClosestSubBuild(subBuilds);

    if (subBuild) {
      // 为子构建创建缓存
      if (data.subBuildsCache === undefined) data.subBuildsCache = {};

      // 获取或创建子构建的数据
      data = data.subBuildsCache[subBuild] || (data.subBuildsCache[subBuild] = {});
      data.subBuilds = subBuilds;
    }

    return data;
  }

  /**
   * 返回给定节点和着色器阶段的属性。
   * 用于获取节点的配置属性和输出节点信息。
   *
   * @param {Node} node - 要获取属性的节点
   * @param {('vertex'|'fragment'|'compute'|'any')} [shaderStage='any'] - 着色器阶段
   * @return {Object} 节点属性对象
   */
  getNodeProperties(node, shaderStage = "any") {
    // 获取节点数据
    const nodeData = this.getDataFromNode(node, shaderStage);

    // 返回属性对象，如果不存在则创建默认属性
    return nodeData.properties || (nodeData.properties = { outputNode: null });
  }

  /**
   * 为给定的缓冲区属性节点返回NodeAttribute实例。
   * 用于管理顶点属性和缓冲区数据的映射。
   *
   * @param {BufferAttributeNode} node - 缓冲区属性节点
   * @param {string} type - 节点类型
   * @return {NodeAttribute} 节点属性对象
   */
  getBufferAttributeFromNode(node, type) {
    // 获取节点数据
    const nodeData = this.getDataFromNode(node);

    // 检查是否已存在缓冲区属性
    let bufferAttribute = nodeData.bufferAttribute;

    if (bufferAttribute === undefined) {
      // 生成唯一索引
      const index = this.uniforms.index++;

      // 创建新的节点属性
      bufferAttribute = new NodeAttribute("nodeAttribute" + index, type, node);

      // 添加到缓冲区属性列表
      this.bufferAttributes.push(bufferAttribute);

      // 缓存属性对象
      nodeData.bufferAttribute = bufferAttribute;
    }

    return bufferAttribute;
  }

  /**
   * 为给定的输出结构节点返回StructType实例。
   * 用于定义着色器中的结构体类型。
   *
   * @param {OutputStructNode} node - 输出结构节点
   * @param {Array<Object>} membersLayout - 结构体成员布局
   * @param {?string} [name=null] - 结构体名称
   * @param {('vertex'|'fragment'|'compute'|'any')} [shaderStage=this.shaderStage] - 着色器阶段
   * @return {StructType} 结构体类型属性
   */
  getStructTypeFromNode(node, membersLayout, name = null, shaderStage = this.shaderStage) {
    // 从全局缓存获取节点数据
    const nodeData = this.getDataFromNode(node, shaderStage, this.globalCache);

    // 检查是否已存在结构体类型
    let structType = nodeData.structType;

    if (structType === undefined) {
      // 生成唯一索引
      const index = this.structs.index++;

      // 如果未提供名称，生成默认名称
      if (name === null) name = "StructType" + index;

      // 创建新的结构体类型
      structType = new StructType(name, membersLayout);

      // 添加到对应着色器阶段的结构体列表
      this.structs[shaderStage].push(structType);

      // 缓存结构体类型
      nodeData.structType = structType;
    }

    return structType;
  }

  /**
   * 为给定的输出结构节点返回输出专用的StructType实例。
   * 专门用于片段着色器的输出结构体定义。
   *
   * @param {OutputStructNode} node - 输出结构节点
   * @param {Array<Object>} membersLayout - 结构体成员布局
   * @return {StructType} 输出结构体类型属性
   */
  getOutputStructTypeFromNode(node, membersLayout) {
    // 创建片段着色器的输出结构体类型
    const structType = this.getStructTypeFromNode(node, membersLayout, "OutputType", "fragment");
    // 标记为输出类型
    structType.output = true;

    return structType;
  }

  /**
   * 为给定的uniform节点返回NodeUniform实例。
   * 用于管理着色器中的uniform变量。
   *
   * @param {UniformNode} node - uniform节点
   * @param {string} type - uniform类型
   * @param {('vertex'|'fragment'|'compute'|'any')} [shaderStage=this.shaderStage] - 着色器阶段
   * @param {?string} name - uniform的名称
   * @return {NodeUniform} 节点uniform对象
   */
  getUniformFromNode(node, type, shaderStage = this.shaderStage, name = null) {
    // 从全局缓存获取节点数据
    const nodeData = this.getDataFromNode(node, shaderStage, this.globalCache);

    // 检查是否已存在uniform
    let nodeUniform = nodeData.uniform;

    if (nodeUniform === undefined) {
      // 生成唯一索引
      const index = this.uniforms.index++;

      // 创建新的节点uniform，使用提供的名称或生成默认名称
      nodeUniform = new NodeUniform(name || "nodeUniform" + index, type, node);

      // 添加到对应着色器阶段的uniform列表
      this.uniforms[shaderStage].push(nodeUniform);

      // 注册声明
      this.registerDeclaration(nodeUniform);

      // 缓存uniform对象
      nodeData.uniform = nodeUniform;
    }

    return nodeUniform;
  }

  /**
   * 为给定的变量节点返回NodeVar实例。
   * 用于管理着色器中的局部变量和常量。
   *
   * @param {VarNode} node - 变量节点
   * @param {?string} name - 变量名称
   * @param {string} [type=node.getNodeType( this )] - 变量类型
   * @param {('vertex'|'fragment'|'compute'|'any')} [shaderStage=this.shaderStage] - 着色器阶段
   * @param {boolean} [readOnly=false] - 是否为只读变量（常量）
   *
   * @return {NodeVar} 节点变量对象
   */
  getVarFromNode(node, name = null, type = node.getNodeType(this), shaderStage = this.shaderStage, readOnly = false) {
    // 获取节点数据
    const nodeData = this.getDataFromNode(node, shaderStage);
    // 获取子构建变量属性名
    const subBuildVariable = this.getSubBuildProperty("variable", nodeData.subBuilds);

    // 检查是否已存在变量
    let nodeVar = nodeData[subBuildVariable];

    if (nodeVar === undefined) {
      // 根据是否只读确定命名空间
      const idNS = readOnly ? "_const" : "_var";

      // 获取或创建变量数组和ID计数器
      const vars = this.vars[shaderStage] || (this.vars[shaderStage] = []);
      const id = this.vars[idNS] || (this.vars[idNS] = 0);

      // 如果未提供名称，生成默认名称
      if (name === null) {
        name = (readOnly ? "nodeConst" : "nodeVar") + id;
        this.vars[idNS]++;
      }

      // 处理子构建的名称修饰
      if (subBuildVariable !== "variable") {
        name = this.getSubBuildProperty(name, nodeData.subBuilds);
      }

      // 获取数组计数
      const count = node.getArrayCount(this);

      // 创建新的节点变量
      nodeVar = new NodeVar(name, type, readOnly, count);

      // 非只读变量需要添加到变量列表
      if (!readOnly) {
        vars.push(nodeVar);
      }

      // 注册声明
      this.registerDeclaration(nodeVar);

      // 缓存变量对象
      nodeData[subBuildVariable] = nodeVar;
    }

    return nodeVar;
  }

  /**
   * 判断节点或其流程是否是确定性的，用于决定是否可以用作常量。
   * 确定性节点的输出不依赖于运行时状态，可以在编译时计算。
   *
   * @param {Node} node - 要检查的节点
   * @return {boolean} 如果是确定性的返回true
   */
  isDeterministic(node) {
    // 数学节点：检查所有操作数是否都是确定性的
    if (node.isMathNode) {
      return this.isDeterministic(node.aNode) && (node.bNode ? this.isDeterministic(node.bNode) : true) && (node.cNode ? this.isDeterministic(node.cNode) : true);
    }
    // 操作符节点：检查操作数是否都是确定性的
    else if (node.isOperatorNode) {
      return this.isDeterministic(node.aNode) && (node.bNode ? this.isDeterministic(node.bNode) : true);
    }
    // 数组节点：检查所有元素是否都是确定性的
    else if (node.isArrayNode) {
      if (node.values !== null) {
        for (const n of node.values) {
          if (!this.isDeterministic(n)) {
            return false;
          }
        }
      }
      return true;
    }
    // 常量节点：总是确定性的
    else if (node.isConstNode) {
      return true;
    }

    // 其他类型的节点默认为非确定性
    return false;
  }

  /**
   * 为给定的varying节点返回NodeVarying实例。
   * varying变量用于在顶点着色器和片段着色器之间传递数据。
   *
   * @param {(VaryingNode|PropertyNode)} node - varying节点
   * @param {?string} name - varying的名称
   * @param {string} [type=node.getNodeType( this )] - varying的类型
   * @param {?string} interpolationType - 插值类型
   * @param {?string} interpolationSampling - 插值采样类型
   * @return {NodeVar} 节点varying对象
   */
  getVaryingFromNode(node, name = null, type = node.getNodeType(this), interpolationType = null, interpolationSampling = null) {
    // 获取节点数据（使用"any"阶段，因为varying在多个阶段间共享）
    const nodeData = this.getDataFromNode(node, "any");
    // 获取子构建varying属性名
    const subBuildVarying = this.getSubBuildProperty("varying", nodeData.subBuilds);

    // 检查是否已存在varying
    let nodeVarying = nodeData[subBuildVarying];

    if (nodeVarying === undefined) {
      // 获取varying列表和索引
      const varyings = this.varyings;
      const index = varyings.length;

      // 如果未提供名称，生成默认名称
      if (name === null) name = "nodeVarying" + index;

      // 处理子构建的名称修饰
      if (subBuildVarying !== "varying") {
        name = this.getSubBuildProperty(name, nodeData.subBuilds);
      }

      // 创建新的节点varying
      nodeVarying = new NodeVarying(name, type, interpolationType, interpolationSampling);

      // 添加到varying列表
      varyings.push(nodeVarying);

      // 注册声明
      this.registerDeclaration(nodeVarying);

      // 缓存varying对象
      nodeData[subBuildVarying] = nodeVarying;
    }

    return nodeVarying;
  }

  /**
   * 在当前着色器阶段注册节点声明。
   * 确保声明名称的唯一性，避免命名冲突。
   *
   * @param {Object} node - 要注册的节点
   */
  registerDeclaration(node) {
    // 获取当前着色器阶段
    const shaderStage = this.shaderStage;
    // 获取或创建该阶段的声明对象
    const declarations = this.declarations[shaderStage] || (this.declarations[shaderStage] = {});

    // 获取节点的属性名
    const property = this.getPropertyName(node);

    let index = 1;
    let name = property;

    // 如果名称已被使用，自动重命名
    while (declarations[name] !== undefined) {
      name = property + "_" + index++;
    }

    // 如果发生了重命名，更新节点名称并发出警告
    if (index > 1) {
      node.name = name;
      console.warn(`THREE.TSL: Declaration name '${property}' of '${node.type}' already in use. Renamed to '${name}'.`);
    }

    // 注册声明
    declarations[name] = node;
  }

  /**
   * 为给定的代码节点返回NodeCode实例。
   * 用于管理着色器中的自定义代码片段。
   *
   * @param {CodeNode} node - 代码节点
   * @param {string} type - 节点类型
   * @param {('vertex'|'fragment'|'compute'|'any')} [shaderStage=this.shaderStage] - 着色器阶段
   * @return {NodeCode} 节点代码对象
   */
  getCodeFromNode(node, type, shaderStage = this.shaderStage) {
    // 获取节点数据
    const nodeData = this.getDataFromNode(node);

    // 检查是否已存在代码对象
    let nodeCode = nodeData.code;

    if (nodeCode === undefined) {
      // 获取或创建代码列表
      const codes = this.codes[shaderStage] || (this.codes[shaderStage] = []);
      const index = codes.length;

      // 创建新的节点代码对象
      nodeCode = new NodeCode("nodeCode" + index, type);

      // 添加到代码列表
      codes.push(nodeCode);

      // 缓存代码对象
      nodeData.code = nodeCode;
    }

    return nodeCode;
  }

  /**
   * 基于代码块层次结构添加代码流。
   *
   * 这用于确保像If、Else这样的代码块在节点仅在当前着色器阶段的
   * 某个条件分支内使用时，能够在本地创建其变量。
   *
   * @param {Node} node - 要添加的节点
   * @param {Node} nodeBlock - 基于节点的代码块，通常是'ConditionalNode'
   */
  addFlowCodeHierarchy(node, nodeBlock) {
    // 从节点数据中获取流代码和代码块信息
    const { flowCodes, flowCodeBlock } = this.getDataFromNode(node);

    let needsFlowCode = true;
    let nodeBlockHierarchy = nodeBlock;

    // 遍历节点块层次结构
    while (nodeBlockHierarchy) {
      // 检查当前层次是否已经处理过流代码
      if (flowCodeBlock.get(nodeBlockHierarchy) === true) {
        needsFlowCode = false;
        break;
      }

      // 向上遍历到父节点块
      nodeBlockHierarchy = this.getDataFromNode(nodeBlockHierarchy).parentNodeBlock;
    }

    // 如果需要流代码，添加所有流代码
    if (needsFlowCode) {
      for (const flowCode of flowCodes) {
        this.addLineFlowCode(flowCode);
      }
    }
  }

  /**
   * 向当前流代码块添加内联代码。
   * 用于在特定的代码块上下文中添加代码。
   *
   * @param {Node} node - 要添加的节点
   * @param {string} code - 要添加的代码
   * @param {Node} nodeBlock - 当前的条件节点
   */
  addLineFlowCodeBlock(node, code, nodeBlock) {
    // 获取节点数据
    const nodeData = this.getDataFromNode(node);
    // 获取或创建流代码数组
    const flowCodes = nodeData.flowCodes || (nodeData.flowCodes = []);
    // 获取或创建代码块映射
    const codeBlock = nodeData.flowCodeBlock || (nodeData.flowCodeBlock = new WeakMap());

    // 添加代码到流代码数组
    flowCodes.push(code);
    // 标记该节点块已处理
    codeBlock.set(nodeBlock, true);
  }

  /**
   * 向当前流添加内联代码。
   * 这是添加着色器代码行的主要方法。
   *
   * @param {string} code - 要添加的代码
   * @param {?Node} [node= null] - 可选的节点，可以帮助系统理解节点是否属于代码块
   * @return {NodeBuilder} 返回此节点构建器的引用
   */
  addLineFlowCode(code, node = null) {
    // 如果代码为空，直接返回
    if (code === "") return this;

    // 如果提供了节点且存在节点块上下文，添加到代码块
    if (node !== null && this.context.nodeBlock) {
      this.addLineFlowCodeBlock(node, code, this.context.nodeBlock);
    }

    // 添加缩进
    code = this.tab + code;

    // 如果代码行末尾没有分号，添加分号和换行符
    if (!/;\s*$/.test(code)) {
      code = code + ";\n";
    }

    // 将代码添加到当前流
    this.flow.code += code;

    return this;
  }

  /**
   * 向当前代码流添加代码。
   * 直接添加代码而不进行格式化处理。
   *
   * @param {string} code - 着色器代码
   * @return {NodeBuilder} 返回此节点构建器的引用
   */
  addFlowCode(code) {
    // 直接将代码添加到当前流
    this.flow.code += code;

    return this;
  }

  /**
   * 在将要生成的代码中添加制表符，以便其他代码片段遵循当前的缩进。
   * 通常用于包含If、Else的代码中。
   *
   * @return {NodeBuilder} 返回此节点构建器的引用
   */
  addFlowTab() {
    // 增加一个制表符的缩进
    this.tab += "\t";

    return this;
  }

  /**
   * 移除一个制表符的缩进。
   * 用于减少代码块的缩进级别。
   *
   * @return {NodeBuilder} 返回此节点构建器的引用
   */
  removeFlowTab() {
    // 移除最后一个制表符
    this.tab = this.tab.slice(0, -1);

    return this;
  }

  /**
   * 根据节点获取当前的流数据。
   * 用于检索特定节点的流处理结果。
   *
   * @param {Node} node - 启动流的节点
   * @param {('vertex'|'fragment'|'compute'|'any')} shaderStage - 着色器阶段
   * @return {Object} 流数据对象
   */
  getFlowData(node /*, shaderStage*/) {
    // 从流数据映射中获取节点对应的数据
    return this.flowsData.get(node);
  }

  /**
   * 基于根节点执行节点流以生成最终的着色器代码。
   * 这是节点流处理的核心方法。
   *
   * @param {Node} node - 要执行的节点
   * @return {Object} 代码流对象
   */
  flowNode(node) {
    // 获取节点的输出类型
    const output = node.getNodeType(this);

    // 执行子节点流处理
    const flowData = this.flowChildNode(node, output);

    // 将流数据存储到映射中
    this.flowsData.set(node, flowData);

    return flowData;
  }

  /**
   * 将节点包含到当前函数节点中。
   * 用于管理函数节点的依赖关系。
   *
   * @param {Node} node - 要包含的节点
   * @returns {void}
   */
  addInclude(node) {
    // 如果存在当前函数节点，将节点添加到其包含列表中
    if (this.currentFunctionNode !== null) {
      this.currentFunctionNode.includes.push(node);
    }
  }

  /**
   * 为给定的着色器节点构建函数节点。
   * 这是一个类似于{@link NodeBuilder#getMethod}的方法类型。
   *
   * @param {ShaderNodeInternal} shaderNode - 用于构建函数节点的着色器节点
   * @return {FunctionNode} 构建的函数节点
   */
  buildFunctionNode(shaderNode) {
    // 创建新的函数节点
    const fn = new FunctionNode();

    // 保存当前函数节点的引用
    const previous = this.currentFunctionNode;

    // 设置当前函数节点
    this.currentFunctionNode = fn;

    // 构建函数代码
    fn.code = this.buildFunctionCode(shaderNode);

    // 恢复之前的函数节点
    this.currentFunctionNode = previous;

    return fn;
  }

  /**
   * 基于TSL函数生成代码流：Fn()。
   * 处理着色器函数的参数和调用逻辑。
   *
   * @param {ShaderNodeInternal} shaderNode - 将基于此输入生成函数代码
   * @return {Object} 流数据对象
   */
  flowShaderNode(shaderNode) {
    // 获取着色器节点的布局信息
    const layout = shaderNode.layout;

    // 创建输入参数对象，包含迭代器
    const inputs = {
      // 实现迭代器接口，使输入对象可迭代
      [Symbol.iterator]() {
        let index = 0;
        const values = Object.values(this);
        return {
          next: () => ({
            value: values[index],
            done: index++ >= values.length,
          }),
        };
      },
    };

    // 为布局中的每个输入创建参数节点
    for (const input of layout.inputs) {
      inputs[input.name] = new ParameterNode(input.type, input.name);
    }

    // 临时清除着色器节点的布局
    shaderNode.layout = null;

    // 调用着色器节点并获取流数据
    const callNode = shaderNode.call(inputs);
    const flowData = this.flowStagesNode(callNode, layout.type);

    // 恢复着色器节点的布局
    shaderNode.layout = layout;

    return flowData;
  }

  /**
   * 在特定构建阶段执行节点。
   * 允许在指定的构建阶段运行节点处理逻辑。
   *
   * @param {Node} node - 要执行的节点
   * @param {string} buildStage - 执行节点的构建阶段
   * @param {Node|string|null} output - 期望的输出类型，例如'vec3'
   * @return {Node|string|null} 节点构建的结果
   */
  flowBuildStage(node, buildStage, output = null) {
    // 保存当前构建阶段
    const previousBuildStage = this.getBuildStage();

    // 设置新的构建阶段
    this.setBuildStage(buildStage);

    // 在指定阶段构建节点
    const result = node.build(this, output);

    // 恢复之前的构建阶段
    this.setBuildStage(previousBuildStage);

    return result;
  }

  /**
   * 通过所有创建步骤运行节点流：'setup'、'analyze'、'generate'。
   * 这是完整的节点处理流程，包含所有构建阶段。
   *
   * @param {Node} node - 要执行的节点
   * @param {?string} output - 期望的输出类型，例如'vec3'
   * @return {Object} 流数据对象
   */
  flowStagesNode(node, output = null) {
    // 保存当前状态
    const previousFlow = this.flow;
    const previousVars = this.vars;
    const previousDeclarations = this.declarations;
    const previousCache = this.cache;
    const previousBuildStage = this.buildStage;
    const previousStack = this.stack;

    // 创建新的流对象
    const flow = {
      code: "",
    };

    // 重置构建器状态
    this.flow = flow;
    this.vars = {};
    this.declarations = {};
    this.cache = new NodeCache();
    this.stack = stack();

    // 遍历所有默认构建阶段
    for (const buildStage of defaultBuildStages) {
      this.setBuildStage(buildStage);
      // 在当前阶段构建节点
      flow.result = node.build(this, output);
    }

    // 获取当前着色器阶段的变量
    flow.vars = this.getVars(this.shaderStage);

    // 恢复之前的状态
    this.flow = previousFlow;
    this.vars = previousVars;
    this.declarations = previousDeclarations;
    this.cache = previousCache;
    this.stack = previousStack;

    // 恢复之前的构建阶段
    this.setBuildStage(previousBuildStage);

    return flow;
  }

  /**
   * 为给定的通用名称返回原生着色器操作符名称。
   * 这是一个类似于{@link NodeBuilder#getMethod}的方法类型。
   *
   * @abstract
   * @param {string} op - 要解析的操作符名称
   * @return {?string} 解析后的操作符名称
   */
  getFunctionOperator(/* op */) {
    // 抽象方法，子类需要实现
    return null;
  }

  /**
   * 构建给定的着色器节点。
   * 抽象方法，需要在子类中实现具体的构建逻辑。
   *
   * @abstract
   * @param {ShaderNodeInternal} shaderNode - 着色器节点
   * @return {string} 函数代码
   */
  buildFunctionCode(/* shaderNode */) {
    // 抽象方法警告
    console.warn("Abstract function.");
  }

  /**
   * 基于子节点生成代码流。
   * 创建独立的流上下文来处理子节点。
   *
   * @param {Node} node - 要执行的节点
   * @param {?string} output - 期望的输出类型，例如'vec3'
   * @return {Object} 代码流对象
   */
  flowChildNode(node, output = null) {
    // 保存当前流
    const previousFlow = this.flow;

    // 创建新的流对象
    const flow = {
      code: "",
    };

    // 设置新流
    this.flow = flow;

    // 构建节点并获取结果
    flow.result = node.build(this, output);

    // 恢复之前的流
    this.flow = previousFlow;

    return flow;
  }

  /**
   * 在不同阶段执行代码流。
   *
   * 某些节点如`varying()`具有在顶点阶段计算代码并在片段阶段返回值的能力，
   * 即使它在片段输入中被执行。
   *
   * @param {('vertex'|'fragment'|'compute'|'any')} shaderStage - 着色器阶段
   * @param {Node} node - 要执行的节点
   * @param {?string} output - 期望的输出类型，例如'vec3'
   * @param {?string} propertyName - 分配结果的属性名称
   * @return {Object|Node|null} 代码流或node.build()结果
   */
  flowNodeFromShaderStage(shaderStage, node, output = null, propertyName = null) {
    // 保存当前状态
    const previousTab = this.tab;
    const previousCache = this.cache;
    const previousShaderStage = this.shaderStage;
    const previousContext = this.context;

    // 设置新的着色器阶段
    this.setShaderStage(shaderStage);

    // 创建新的上下文，移除节点块
    const context = { ...this.context };
    delete context.nodeBlock;

    // 设置全局缓存和基础缩进
    this.cache = this.globalCache;
    this.tab = "\t";
    this.context = context;

    let result = null;

    // 根据构建阶段执行不同的逻辑
    if (this.buildStage === "generate") {
      // 在生成阶段，创建子节点流
      const flowData = this.flowChildNode(node, output);

      // 如果提供了属性名，生成赋值语句
      if (propertyName !== null) {
        flowData.code += `${this.tab + propertyName} = ${flowData.result};\n`;
      }

      // 将流代码添加到指定着色器阶段
      this.flowCode[shaderStage] = this.flowCode[shaderStage] + flowData.code;

      result = flowData;
    } else {
      // 在其他阶段，直接构建节点
      result = node.build(this);
    }

    // 恢复之前的状态
    this.setShaderStage(previousShaderStage);
    this.cache = previousCache;
    this.tab = previousTab;
    this.context = previousContext;

    return result;
  }

  /**
   * 返回包含此节点构建器所有节点属性的数组。
   * 合并普通属性和缓冲区属性。
   *
   * @return {Array<NodeAttribute>} 此构建器的节点属性数组
   */
  getAttributesArray() {
    // 合并属性和缓冲区属性数组
    return this.attributes.concat(this.bufferAttributes);
  }

  /**
   * 为给定着色器阶段返回属性定义的着色器字符串。
   * 抽象方法，需要在子类中实现。
   *
   * @abstract
   * @param {('vertex'|'fragment'|'compute'|'any')} shaderStage - 着色器阶段
   * @return {string} 属性代码段
   */
  getAttributes(/*shaderStage*/) {
    // 抽象方法警告
    console.warn("Abstract function.");
  }

  /**
   * 为给定着色器阶段返回varying定义的着色器字符串。
   * 抽象方法，需要在子类中实现。
   *
   * @abstract
   * @param {('vertex'|'fragment'|'compute'|'any')} shaderStage - 着色器阶段
   * @return {string} varying代码段
   */
  getVaryings(/*shaderStage*/) {
    // 抽象方法警告
    console.warn("Abstract function.");
  }

  /**
   * 为给定的变量类型和名称返回单个变量定义的着色器字符串。
   * 支持数组类型的变量声明。
   *
   * @param {string} type - 变量类型
   * @param {string} name - 变量名称
   * @param {?number} [count=null] - 数组长度
   * @return {string} 着色器字符串
   */
  getVar(type, name, count = null) {
    // 根据是否为数组生成不同的声明
    return `${count !== null ? this.generateArrayDeclaration(type, count) : this.getType(type)} ${name}`;
  }

  /**
   * 为给定着色器阶段返回变量定义的着色器字符串。
   * 遍历该阶段的所有变量并生成声明代码。
   *
   * @param {('vertex'|'fragment'|'compute'|'any')} shaderStage - 着色器阶段
   * @return {string} 变量代码段
   */
  getVars(shaderStage) {
    let snippet = "";

    // 获取指定阶段的变量数组
    const vars = this.vars[shaderStage];

    // 如果存在变量，生成声明代码
    if (vars !== undefined) {
      for (const variable of vars) {
        snippet += `${this.getVar(variable.type, variable.name)}; `;
      }
    }

    return snippet;
  }

  /**
   * 为给定着色器阶段返回uniform定义的着色器字符串。
   * 抽象方法，需要在子类中实现。
   *
   * @abstract
   * @param {('vertex'|'fragment'|'compute'|'any')} shaderStage - 着色器阶段
   * @return {string} uniform代码段
   */
  getUniforms(/*shaderStage*/) {
    // 抽象方法警告
    console.warn("Abstract function.");
  }

  /**
   * 为给定着色器阶段返回原生代码定义的着色器字符串。
   * 用于获取自定义代码片段的集合。
   *
   * @param {('vertex'|'fragment'|'compute'|'any')} shaderStage - 着色器阶段
   * @return {string} 原生代码段
   */
  getCodes(shaderStage) {
    // 获取指定阶段的代码数组
    const codes = this.codes[shaderStage];

    let code = "";

    // 如果存在代码，拼接所有代码片段
    if (codes !== undefined) {
      for (const nodeCode of codes) {
        code += nodeCode.code + "\n";
      }
    }

    return code;
  }

  /**
   * 返回此节点构建器的哈希值。
   * 通过连接所有着色器代码生成唯一标识。
   *
   * @return {string} 哈希值
   */
  getHash() {
    // 连接顶点、片段和计算着色器代码作为哈希
    return this.vertexShader + this.fragmentShader + this.computeShader;
  }

  /**
   * 设置当前着色器阶段。
   * 用于切换构建器的工作阶段。
   *
   * @param {?('vertex'|'fragment'|'compute'|'any')} shaderStage - 要设置的着色器阶段
   */
  setShaderStage(shaderStage) {
    // 设置当前着色器阶段
    this.shaderStage = shaderStage;
  }

  /**
   * 返回当前着色器阶段。
   * 获取构建器当前正在处理的着色器阶段。
   *
   * @return {?('vertex'|'fragment'|'compute'|'any')} 当前着色器阶段
   */
  getShaderStage() {
    // 返回当前着色器阶段
    return this.shaderStage;
  }

  /**
   * 设置当前构建阶段。
   * 用于控制节点构建的不同阶段。
   *
   * @param {?('setup'|'analyze'|'generate')} buildStage - 要设置的构建阶段
   */
  setBuildStage(buildStage) {
    // 设置当前构建阶段
    this.buildStage = buildStage;
  }

  /**
   * 返回当前构建阶段。
   * 获取构建器当前所处的构建阶段。
   *
   * @return {?('setup'|'analyze'|'generate')} 当前构建阶段
   */
  getBuildStage() {
    // 返回当前构建阶段
    return this.buildStage;
  }

  /**
   * 控制着色器阶段的代码构建。
   * 抽象方法，需要在子类中实现具体的构建逻辑。
   *
   * @abstract
   */
  buildCode() {
    // 抽象方法警告
    console.warn("Abstract function.");
  }

  /**
   * 返回当前的子构建层。
   * 获取子构建层堆栈的顶层元素。
   *
   * @return {SubBuildNode} 当前的子构建层
   */
  get subBuild() {
    // 返回子构建层数组的最后一个元素，如果为空则返回null
    return this.subBuildLayers[this.subBuildLayers.length - 1] || null;
  }

  /**
   * 向节点构建器添加子构建层。
   * 用于管理嵌套的构建上下文。
   *
   * @param {SubBuildNode} subBuild - 要添加的子构建层
   */
  addSubBuild(subBuild) {
    // 将子构建层推入堆栈
    this.subBuildLayers.push(subBuild);
  }

  /**
   * 从节点构建器移除最后一个子构建层。
   * 用于退出当前的构建上下文。
   *
   * @return {SubBuildNode} 被移除的子构建层
   */
  removeSubBuild() {
    // 从堆栈中弹出最后一个子构建层
    return this.subBuildLayers.pop();
  }

  /**
   * 为给定数据返回最接近的子构建层。
   * 在子构建层次结构中查找最匹配的层。
   *
   * @param {Node|Set|Array} data - 要获取最接近子构建层的数据
   * @return {?string} 最接近的子构建名称，如果未找到则返回null
   */
  getClosestSubBuild(data) {
    let subBuilds;

    // 根据数据类型提取子构建信息
    if (data && data.isNode) {
      if (data.isShaderCallNodeInternal) {
        // 着色器调用节点的子构建
        subBuilds = data.shaderNode.subBuilds;
      } else if (data.isStackNode) {
        // 堆栈节点的子构建
        subBuilds = [data.subBuild];
      } else {
        // 其他节点的子构建
        subBuilds = this.getDataFromNode(data, "any").subBuilds;
      }
    } else if (data instanceof Set) {
      // Set类型转换为数组
      subBuilds = [...data];
    } else {
      // 直接使用数据
      subBuilds = data;
    }

    // 如果没有子构建，返回null
    if (!subBuilds) return null;

    // 获取当前的子构建层
    const subBuildLayers = this.subBuildLayers;

    // 从后向前查找匹配的子构建层
    for (let i = subBuilds.length - 1; i >= 0; i--) {
      const subBuild = subBuilds[i];

      if (subBuildLayers.includes(subBuild)) {
        return subBuild;
      }
    }

    return null;
  }

  /**
   * 返回子构建层的输出节点。
   * 获取特定子构建的输出节点名称。
   *
   * @param {Node} node - 要获取输出的节点
   * @return {string} 输出节点名称
   */
  getSubBuildOutput(node) {
    // 获取输出节点属性
    return this.getSubBuildProperty("outputNode", node);
  }

  /**
   * 为给定属性和节点返回子构建属性名称。
   * 生成带有子构建前缀的属性名称。
   *
   * @param {string} [property=''] - 属性名称
   * @param {?Node} [node=null] - 要获取子构建的节点
   * @return {string} 子构建属性名称
   */
  getSubBuildProperty(property = "", node = null) {
    let subBuild;

    // 根据节点获取子构建或使用函数子构建
    if (node !== null) {
      subBuild = this.getClosestSubBuild(node);
    } else {
      subBuild = this.subBuildFn;
    }

    let result;

    // 如果存在子构建，添加前缀
    if (subBuild) {
      result = property ? subBuild + "_" + property : subBuild;
    } else {
      result = property;
    }

    return result;
  }

  /**
   * 控制给定对象构建的中央构建方法。
   * 这是整个节点系统的核心构建流程。
   *
   * @return {NodeBuilder} 返回此节点构建器的引用
   */
  build() {
    // 解构获取对象、材质和渲染器
    const { object, material, renderer } = this;

    // 处理材质构建
    if (material !== null) {
      // 从材质库获取节点材质
      let nodeMaterial = renderer.library.fromMaterial(material);

      // 如果材质不兼容，创建默认节点材质
      if (nodeMaterial === null) {
        console.error(`NodeMaterial: Material "${material.type}" is not compatible.`);
        nodeMaterial = new NodeMaterial();
      }

      // 构建节点材质
      nodeMaterial.build(this);
    } else {
      // 如果没有材质，添加计算流
      this.addFlow("compute", object);
    }

    // 构建阶段说明：
    // setup() -> 阶段1：创建可能的新节点和/或返回输出引用节点
    // analyze() -> 阶段2：分析节点以进行可能的优化和验证
    // generate() -> 阶段3：生成着色器

    // 遍历所有默认构建阶段
    for (const buildStage of defaultBuildStages) {
      this.setBuildStage(buildStage);

      // 处理顶点上下文
      if (this.context.vertex && this.context.vertex.isNode) {
        this.flowNodeFromShaderStage("vertex", this.context.vertex);
      }

      // 遍历所有着色器阶段
      for (const shaderStage of shaderStages) {
        this.setShaderStage(shaderStage);

        // 获取当前阶段的流节点
        const flowNodes = this.flowNodes[shaderStage];

        // 处理每个流节点
        for (const node of flowNodes) {
          if (buildStage === "generate") {
            // 在生成阶段执行节点流
            this.flowNode(node);
          } else {
            // 在其他阶段直接构建节点
            node.build(this);
          }
        }
      }
    }

    // 清除构建和着色器阶段
    this.setBuildStage(null);
    this.setShaderStage(null);

    // 阶段4：为特定输出构建代码
    this.buildCode();
    this.buildUpdateNodes();

    return this;
  }

  /**
   * 返回uniform表示，稍后用于UBO生成和渲染。
   * 根据类型创建相应的uniform对象。
   *
   * @param {NodeUniform} uniformNode - uniform节点
   * @param {string} type - 请求的类型
   * @return {Uniform} uniform对象
   */
  getNodeUniform(uniformNode, type) {
    // 标量类型
    if (type === "float" || type === "int" || type === "uint") return new NumberNodeUniform(uniformNode);
    // 二维向量类型
    if (type === "vec2" || type === "ivec2" || type === "uvec2") return new Vector2NodeUniform(uniformNode);
    // 三维向量类型
    if (type === "vec3" || type === "ivec3" || type === "uvec3") return new Vector3NodeUniform(uniformNode);
    // 四维向量类型
    if (type === "vec4" || type === "ivec4" || type === "uvec4") return new Vector4NodeUniform(uniformNode);
    // 颜色类型
    if (type === "color") return new ColorNodeUniform(uniformNode);
    // 矩阵类型
    if (type === "mat2") return new Matrix2NodeUniform(uniformNode);
    if (type === "mat3") return new Matrix3NodeUniform(uniformNode);
    if (type === "mat4") return new Matrix4NodeUniform(uniformNode);

    // 未声明的类型抛出错误
    throw new Error(`Uniform "${type}" not declared.`);
  }

  /**
   * 将给定的着色器代码片段从一种类型格式化为另一种类型。
   * 例如，此方法可用于将简单的浮点字符串 `"1.0"` 转换为
   * `vec3` 表示：`"vec3<f32>( 1.0 )"`。
   *
   * 这是类型转换的核心方法，确保不同类型之间的兼容性。
   *
   * @param {string} snippet - 着色器代码片段
   * @param {string} fromType - 源类型
   * @param {string} toType - 目标类型
   * @return {string} 更新后的着色器字符串
   */
  format(snippet, fromType, toType) {
    // 获取标准化的向量类型
    // 获取标准化的向量类型
    fromType = this.getVectorType(fromType);
    toType = this.getVectorType(toType);

    // 如果类型相同或目标类型为null或引用类型，直接返回
    if (fromType === toType || toType === null || this.isReference(toType)) {
      return snippet;
    }

    // 获取类型长度
    const fromTypeLength = this.getTypeLength(fromType);
    const toTypeLength = this.getTypeLength(toType);

    // 4x4矩阵到3x3矩阵的转换
    if (fromTypeLength === 16 && toTypeLength === 9) {
      return `${this.getType(toType)}( ${snippet}[ 0 ].xyz, ${snippet}[ 1 ].xyz, ${snippet}[ 2 ].xyz )`;
    }

    // 3x3矩阵到2x2矩阵的转换
    if (fromTypeLength === 9 && toTypeLength === 4) {
      return `${this.getType(toType)}( ${snippet}[ 0 ].xy, ${snippet}[ 1 ].xy )`;
    }

    // 源类型是矩阵类型（长度大于4）
    if (fromTypeLength > 4) {
      // @TODO: 暂时忽略矩阵类型的复杂转换
      return snippet;
    }

    // 目标类型是矩阵类型或未知类型
    if (toTypeLength > 4 || toTypeLength === 0) {
      // @TODO: 暂时忽略矩阵类型的复杂转换
      return snippet;
    }

    // 相同长度的类型转换（如vec3到ivec3）
    if (fromTypeLength === toTypeLength) {
      return `${this.getType(toType)}( ${snippet} )`;
    }

    // 从高维向量到低维向量的转换
    if (fromTypeLength > toTypeLength) {
      // 布尔类型使用all()函数，其他类型使用swizzle操作
      snippet = toType === "bool" ? `all( ${snippet} )` : `${snippet}.${"xyz".slice(0, toTypeLength)}`;

      // 递归调用以处理组件类型转换
      return this.format(snippet, this.getTypeFromLength(toTypeLength, this.getComponentType(fromType)), toType);
    }

    // 从低维向量到vec4的转换
    if (toTypeLength === 4 && fromTypeLength > 1) {
      // 先转换为vec3，然后添加1.0作为第四个分量
      return `${this.getType(toType)}( ${this.format(snippet, fromType, "vec3")}, 1.0 )`;
    }

    // 从vec2到vec3的转换
    if (fromTypeLength === 2) {
      // 添加0.0作为第三个分量
      return `${this.getType(toType)}( ${this.format(snippet, fromType, "vec2")}, 0.0 )`;
    }

    // 从标量到向量的转换，且组件类型不同
    if (fromTypeLength === 1 && toTypeLength > 1 && fromType !== this.getComponentType(toType)) {
      // 将数值转换为向量类型，例如：vec3( 1u ) -> vec3( float( 1u ) )
      snippet = `${this.getType(this.getComponentType(toType))}( ${snippet} )`;
    }

    // 标量到向量的默认转换
    return `${this.getType(toType)}( ${snippet} )`;
  }

  /**
   * 返回带有引擎当前版本的签名。
   * 用于在生成的着色器代码中添加版本信息。
   *
   * @return {string} 签名字符串
   */
  getSignature() {
    // 返回Three.js版本和节点系统标识
    return `// Three.js r${REVISION} - Node System\n`;
  }
}

export default NodeBuilder;
