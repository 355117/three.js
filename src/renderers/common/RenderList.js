// 导入双面渲染常量
import { DoubleSide } from "../../constants.js";

/**
 * 不透明渲染项的默认排序函数
 * 使用画家算法的稳定排序，按照以下优先级排序：
 * 1. 组顺序 (groupOrder)
 * 2. 渲染顺序 (renderOrder)
 * 3. 深度值 (z) - 从前到后
 * 4. 对象ID (id) - 确保稳定排序
 *
 * @private
 * @function
 * @param {Object} a - 第一个渲染项
 * @param {Object} b - 第二个渲染项
 * @return {number} 定义排序顺序的数值
 */
function painterSortStable(a, b) {
  // 首先按组顺序排序
  if (a.groupOrder !== b.groupOrder) {
    return a.groupOrder - b.groupOrder;

    // 然后按渲染顺序排序
  } else if (a.renderOrder !== b.renderOrder) {
    return a.renderOrder - b.renderOrder;

    // 接着按深度值排序（从前到后，z值小的在前）
  } else if (a.z !== b.z) {
    return a.z - b.z;

    // 最后按对象ID排序，确保稳定性
  } else {
    return a.id - b.id;
  }
}

/**
 * 透明渲染项的默认排序函数
 * 使用反向画家算法的稳定排序，按照以下优先级排序：
 * 1. 组顺序 (groupOrder)
 * 2. 渲染顺序 (renderOrder)
 * 3. 深度值 (z) - 从后到前（与不透明对象相反）
 * 4. 对象ID (id) - 确保稳定排序
 *
 * @private
 * @function
 * @param {Object} a - 第一个渲染项
 * @param {Object} b - 第二个渲染项
 * @return {number} 定义排序顺序的数值
 */
function reversePainterSortStable(a, b) {
  // 首先按组顺序排序
  if (a.groupOrder !== b.groupOrder) {
    return a.groupOrder - b.groupOrder;
    // 然后按渲染顺序排序
  } else if (a.renderOrder !== b.renderOrder) {
    return a.renderOrder - b.renderOrder;
    // 接着按深度值排序（从后到前，z值大的在前）
  } else if (a.z !== b.z) {
    return b.z - a.z;
    // 最后按对象ID排序，确保稳定性
  } else {
    return a.id - b.id;
  }
}

/**
 * 判断给定的透明材质是否需要双通道渲染
 * 双通道渲染用于处理具有透射效果的双面材质
 *
 * @private
 * @function
 * @param {Material} material - 透明材质
 * @return {boolean} 给定材质是否需要双通道渲染
 */
function needsDoublePass(material) {
  // 检查材质是否具有透射效果
  const hasTransmission = material.transmission > 0 || material.transmissionNode;

  // 需要双通道渲染的条件：有透射效果 + 双面材质 + 未强制单通道
  return hasTransmission && material.side === DoubleSide && material.forceSinglePass === false;
}

/**
 * 渲染列表类
 *
 * 当渲染器在渲染调用开始时分析场景时，它会将3D对象存储在渲染列表中以供进一步处理。
 * 根据3D对象的属性（如变换或材质状态），对象被维护在有序列表中以进行实际渲染。
 *
 * 渲染列表对于每个场景和相机组合都是唯一的。
 *
 * @private
 * @augments Pipeline
 */
class RenderList {
  /**
   * 构造一个渲染列表
   *
   * @param {Lighting} lighting - 光照管理组件
   * @param {Object} scene - 场景对象
   * @param {Object} camera - 用于渲染场景的相机
   */
  constructor(lighting, scene, camera) {
    /**
     * 3D对象被转换为渲染项并存储在此数组中
     * 这是渲染项的主要存储容器，支持对象重用以避免频繁的内存分配
     *
     * @type {Array<Object>}
     */
    this.renderItems = [];

    /**
     * 当前渲染项索引
     * 用于跟踪下一个可用的渲染项位置
     *
     * @type {number}
     * @default 0
     */
    this.renderItemsIndex = 0;

    /**
     * 不透明渲染项列表
     * 存储所有不透明材质的3D对象
     *
     * @type {Array<Object>}
     */
    this.opaque = [];

    /**
     * 需要双通道渲染的透明渲染项列表
     * 存储具有透射效果的透明对象（如透射材质对象）
     *
     * @type {Array<Object>}
     */
    this.transparentDoublePass = [];

    /**
     * 透明渲染项列表
     * 存储所有透明材质的3D对象
     *
     * @type {Array<Object>}
     */
    this.transparent = [];

    /**
     * 渲染包数据列表
     * 存储渲染包组的相关数据
     *
     * @type {Array<Object>}
     */
    this.bundles = [];

    /**
     * 渲染列表的光源节点
     * 此节点稍后与实际的分析光源节点相关，
     * 这些节点在着色器中计算场景的光照
     *
     * @type {LightsNode}
     */
    this.lightsNode = lighting.getNode(scene, camera);

    /**
     * 场景的光源存储在数组中
     * 此数组用于设置光源节点
     *
     * @type {Array<Light>}
     */
    this.lightsArray = [];

    /**
     * 场景对象
     * 当前渲染列表所属的场景
     *
     * @type {Object}
     */
    this.scene = scene;

    /**
     * 用于渲染场景的相机
     * 当前渲染列表使用的相机对象
     *
     * @type {Object}
     */
    this.camera = camera;

    /**
     * 执行遮挡查询测试的对象数量
     * 用于统计需要进行遮挡剔除的对象
     *
     * @type {number}
     * @default 0
     */
    this.occlusionQueryCount = 0;
  }

  /**
   * 在渲染调用开始时调用此方法
   * 在分析场景之前，它为即将到来的渲染列表生成准备内部数据结构
   *
   * @return {RenderList} 对此渲染列表的引用
   */
  begin() {
    // 重置渲染项索引
    this.renderItemsIndex = 0;

    // 清空所有渲染列表
    this.opaque.length = 0;
    this.transparentDoublePass.length = 0;
    this.transparent.length = 0;
    this.bundles.length = 0;

    // 清空光源数组
    this.lightsArray.length = 0;

    // 重置遮挡查询计数
    this.occlusionQueryCount = 0;

    return this;
  }

  /**
   * 为给定的渲染项状态返回一个渲染项
   * 状态由一系列与对象相关的参数定义
   *
   * 该方法通过保持渲染项并在后续渲染调用中重用它们来避免对象创建
   * （只是使用不同的属性值）
   *
   * @param {Object3D} object - 3D对象
   * @param {BufferGeometry} geometry - 3D对象的几何体
   * @param {Material} material - 3D对象的材质
   * @param {number} groupOrder - 当前组顺序
   * @param {number} z - 3D对象的深度值（裁剪空间中的z值）
   * @param {?Object} group - 仅与使用多个材质的对象相关。这表示来自相应 `BufferGeometry` 的组条目
   * @param {ClippingContext} clippingContext - 当前裁剪上下文
   * @return {Object} 渲染项
   */
  getNextRenderItem(object, geometry, material, groupOrder, z, group, clippingContext) {
    // 获取当前索引位置的渲染项
    let renderItem = this.renderItems[this.renderItemsIndex];

    // 如果渲染项不存在，创建新的渲染项
    if (renderItem === undefined) {
      renderItem = {
        id: object.id,
        object: object,
        geometry: geometry,
        material: material,
        groupOrder: groupOrder,
        renderOrder: object.renderOrder,
        z: z,
        group: group,
        clippingContext: clippingContext,
      };

      // 将新创建的渲染项存储在数组中
      this.renderItems[this.renderItemsIndex] = renderItem;
    } else {
      // 如果渲染项已存在，更新其属性（重用对象）
      renderItem.id = object.id;
      renderItem.object = object;
      renderItem.geometry = geometry;
      renderItem.material = material;
      renderItem.groupOrder = groupOrder;
      renderItem.renderOrder = object.renderOrder;
      renderItem.z = z;
      renderItem.group = group;
      renderItem.clippingContext = clippingContext;
    }

    // 递增索引以指向下一个位置
    this.renderItemsIndex++;

    return renderItem;
  }

  /**
   * 将给定对象作为渲染项推送到内部渲染列表中
   * 选择的列表取决于对象属性
   *
   * @param {Object3D} object - 3D对象
   * @param {BufferGeometry} geometry - 3D对象的几何体
   * @param {Material} material - 3D对象的材质
   * @param {number} groupOrder - 当前组顺序
   * @param {number} z - 3D对象的深度值（裁剪空间中的z值）
   * @param {?Object} group - 仅与使用多个材质的对象相关。这表示来自相应 `BufferGeometry` 的组条目
   * @param {ClippingContext} clippingContext - 当前裁剪上下文
   */
  push(object, geometry, material, groupOrder, z, group, clippingContext) {
    // 获取下一个可用的渲染项
    const renderItem = this.getNextRenderItem(object, geometry, material, groupOrder, z, group, clippingContext);

    // 如果对象启用了遮挡测试，增加遮挡查询计数
    if (object.occlusionTest === true) this.occlusionQueryCount++;

    // 根据材质类型将渲染项添加到相应的列表中
    if (material.transparent === true || material.transmission > 0) {
      // 如果是透明材质或有透射效果

      // 检查是否需要双通道渲染
      if (needsDoublePass(material)) this.transparentDoublePass.push(renderItem);

      // 添加到透明对象列表
      this.transparent.push(renderItem);
    } else {
      // 添加到不透明对象列表
      this.opaque.push(renderItem);
    }
  }

  /**
   * 将给定对象作为渲染项插入到内部渲染列表的开头
   * 选择的列表取决于对象属性
   *
   * @param {Object3D} object - 3D对象
   * @param {BufferGeometry} geometry - 3D对象的几何体
   * @param {Material} material - 3D对象的材质
   * @param {number} groupOrder - 当前组顺序
   * @param {number} z - 3D对象的深度值（裁剪空间中的z值）
   * @param {?Object} group - 仅与使用多个材质的对象相关。这表示来自相应 `BufferGeometry` 的组条目
   * @param {ClippingContext} clippingContext - 当前裁剪上下文
   */
  unshift(object, geometry, material, groupOrder, z, group, clippingContext) {
    // 获取下一个可用的渲染项
    const renderItem = this.getNextRenderItem(object, geometry, material, groupOrder, z, group, clippingContext);

    // 根据材质类型将渲染项插入到相应列表的开头
    if (material.transparent === true || material.transmission > 0) {
      // 如果是透明材质或有透射效果

      // 检查是否需要双通道渲染，插入到列表开头
      if (needsDoublePass(material)) this.transparentDoublePass.unshift(renderItem);

      // 插入到透明对象列表开头
      this.transparent.unshift(renderItem);
    } else {
      // 插入到不透明对象列表开头
      this.opaque.unshift(renderItem);
    }
  }

  /**
   * 将渲染包组数据推送到渲染列表中
   * 渲染包用于优化渲染性能，将相关对象组织在一起
   *
   * @param {Object} group - 包组数据
   */
  pushBundle(group) {
    this.bundles.push(group);
  }

  /**
   * 将光源推送到渲染列表中
   * 光源将用于场景的光照计算
   *
   * @param {Light} light - 光源对象
   */
  pushLight(light) {
    this.lightsArray.push(light);
  }

  /**
   * 对内部渲染列表进行排序
   * 使用自定义排序函数或默认排序函数对不同类型的对象进行排序
   *
   * @param {?function(any, any): number} customOpaqueSort - 不透明对象的自定义排序函数
   * @param {?function(any, any): number} customTransparentSort - 透明对象的自定义排序函数
   */
  sort(customOpaqueSort, customTransparentSort) {
    // 对不透明对象列表排序（如果有多个对象）
    if (this.opaque.length > 1) this.opaque.sort(customOpaqueSort || painterSortStable);

    // 对双通道透明对象列表排序（如果有多个对象）
    if (this.transparentDoublePass.length > 1) this.transparentDoublePass.sort(customTransparentSort || reversePainterSortStable);

    // 对透明对象列表排序（如果有多个对象）
    if (this.transparent.length > 1) this.transparent.sort(customTransparentSort || reversePainterSortStable);
  }

  /**
   * 在渲染列表生成完成后执行最终化任务
   * 更新光源并清理未使用的渲染项引用
   */
  finish() {
    // 更新光源节点

    // 将收集到的光源数组设置到光源节点中
    this.lightsNode.setLights(this.lightsArray);

    // 清除列表中非活动渲染项的引用

    // 遍历未使用的渲染项（从当前索引到数组末尾）
    for (let i = this.renderItemsIndex, il = this.renderItems.length; i < il; i++) {
      const renderItem = this.renderItems[i];

      // 如果渲染项的id已经为null，说明已经清理过了，跳出循环
      if (renderItem.id === null) break;

      // 清除渲染项的所有引用，避免内存泄漏
      renderItem.id = null;
      renderItem.object = null;
      renderItem.geometry = null;
      renderItem.material = null;
      renderItem.groupOrder = null;
      renderItem.renderOrder = null;
      renderItem.z = null;
      renderItem.group = null;
      renderItem.clippingContext = null;
    }
  }
}

// 导出渲染列表类
export default RenderList;
