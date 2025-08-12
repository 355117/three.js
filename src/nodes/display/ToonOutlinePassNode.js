// 从TSL基础模块导入浮点数、节点对象、标准化和vec4函数
import { float, nodeObject, normalize, vec4 } from "../tsl/TSLBase.js";
// 从数学模块导入颜色类
import { Color } from "../../math/Color.js";
// 从节点材质模块导入NodeMaterial类
import NodeMaterial from "../../materials/nodes/NodeMaterial.js";
// 从相机访问器模块导入相机投影矩阵
import { cameraProjectionMatrix } from "../../nodes/accessors/Camera.js";
// 从模型节点访问器模块导入模型视图矩阵
import { modelViewMatrix } from "../../nodes/accessors/ModelNode.js";
// 从位置访问器模块导入本地位置
import { positionLocal } from "../../nodes/accessors/Position.js";
// 从法线访问器模块导入本地法线
import { normalLocal } from "../../nodes/accessors/Normal.js";
// 从常量模块导入背面渲染常量
import { BackSide } from "../../constants.js";
// 从通道节点模块导入PassNode基类
import PassNode from "./PassNode.js";

/**
 * 表示在兼容对象上产生卡通轮廓效果的渲染通道。
 * 只有材质类型为`MeshToonMaterial`和`MeshToonNodeMaterial`的3D对象
 * 才会接收轮廓效果。
 *
 * ```js
 * const postProcessing = new PostProcessing( renderer );
 *
 * const scenePass = toonOutlinePass( scene, camera );
 *
 * postProcessing.outputNode = scenePass;
 * ```
 * @augments PassNode
 */
class ToonOutlinePassNode extends PassNode {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "ToonOutlinePassNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的轮廓通道节点。
   *
   * @param {Scene} scene - 场景的引用
   * @param {Camera} camera - 相机的引用
   * @param {Node} colorNode - 定义轮廓的颜色节点
   * @param {Node} thicknessNode - 定义轮廓的厚度节点
   * @param {Node} alphaNode - 定义轮廓的透明度节点
   */
  constructor(scene, camera, colorNode, thicknessNode, alphaNode) {
    super(PassNode.COLOR, scene, camera); // 调用父类构造函数，指定为颜色通道

    /**
     * 定义轮廓的颜色节点。
     *
     * @type {Node}
     */
    this.colorNode = colorNode; // 存储颜色节点

    /**
     * 定义轮廓的厚度节点。
     *
     * @type {Node}
     */
    this.thicknessNode = thicknessNode; // 存储厚度节点

    /**
     * 定义轮廓的透明度节点。
     *
     * @type {Node}
     */
    this.alphaNode = alphaNode; // 存储透明度节点

    /**
     * 内部材质缓存。
     *
     * @private
     * @type {WeakMap<Material, NodeMaterial>}
     */
    this._materialCache = new WeakMap(); // 创建弱映射缓存
  }

  // 在每帧渲染前更新通道
  updateBefore(frame) {
    const { renderer } = frame; // 从帧对象中获取渲染器

    // 保存当前的渲染对象函数
    const currentRenderObjectFunction = renderer.getRenderObjectFunction();

    // 设置自定义的渲染对象函数
    renderer.setRenderObjectFunction((object, scene, camera, geometry, material, group, lightsNode, clippingContext) => {
      // 仅为支持的材质渲染轮廓

      // 检查材质是否为卡通材质类型
      if (material.isMeshToonMaterial || material.isMeshToonNodeMaterial) {
        // 如果材质不是线框模式
        if (material.wireframe === false) {
          // 获取轮廓材质并渲染轮廓
          const outlineMaterial = this._getOutlineMaterial(material);
          renderer.renderObject(object, scene, camera, geometry, outlineMaterial, group, lightsNode, clippingContext);
        }
      }

      // 默认渲染：渲染原始对象

      renderer.renderObject(object, scene, camera, geometry, material, group, lightsNode, clippingContext);
    });

    super.updateBefore(frame); // 调用父类的updateBefore方法

    // 恢复原始的渲染对象函数
    renderer.setRenderObjectFunction(currentRenderObjectFunction);
  }

  /**
   * 创建用于轮廓渲染的材质。
   *
   * @private
   * @return {NodeMaterial} 轮廓材质
   */
  _createMaterial() {
    const material = new NodeMaterial(); // 创建新的节点材质
    material.isMeshToonOutlineMaterial = true; // 标记为卡通轮廓材质
    material.name = "Toon_Outline"; // 设置材质名称
    material.side = BackSide; // 设置为背面渲染

    // 顶点节点设置

    const outlineNormal = normalLocal.negate(); // 获取反向的本地法线
    const mvp = cameraProjectionMatrix.mul(modelViewMatrix); // 计算模型视图投影矩阵

    const ratio = float(1.0); // TODO: 支持每个顶点的轮廓厚度比率
    const pos = mvp.mul(vec4(positionLocal, 1.0)); // 计算原始位置的投影坐标
    const pos2 = mvp.mul(vec4(positionLocal.add(outlineNormal), 1.0)); // 计算沿法线偏移后的投影坐标
    const norm = normalize(pos.sub(pos2)); // 注意：从pos减去pos2，因为BackSide的对象法线是负的

    // 设置顶点节点：原始位置加上法线方向的厚度偏移
    material.vertexNode = pos.add(norm.mul(this.thicknessNode).mul(pos.w).mul(ratio));

    // 颜色节点设置

    // 设置材质颜色节点，包含颜色和透明度
    material.colorNode = vec4(this.colorNode, this.alphaNode);

    return material; // 返回创建的材质
  }

  /**
   * 对于给定的卡通材质，此方法返回相应的轮廓材质。
   *
   * @private
   * @param {(MeshToonMaterial|MeshToonNodeMaterial)} originalMaterial - 卡通材质
   * @return {NodeMaterial} 轮廓材质
   */
  _getOutlineMaterial(originalMaterial) {
    // 从缓存中获取轮廓材质
    let outlineMaterial = this._materialCache.get(originalMaterial);

    // 如果缓存中不存在，则创建新的轮廓材质
    if (outlineMaterial === undefined) {
      outlineMaterial = this._createMaterial(); // 创建轮廓材质

      // 将新创建的轮廓材质存储到缓存中
      this._materialCache.set(originalMaterial, outlineMaterial);
    }

    return outlineMaterial; // 返回轮廓材质
  }
} // ToonOutlinePassNode类结束

// 导出ToonOutlinePassNode类作为默认导出
export default ToonOutlinePassNode;

/**
 * TSL函数，用于创建卡通轮廓通道节点。
 *
 * @tsl
 * @function
 * @param {Scene} scene - 场景的引用
 * @param {Camera} camera - 相机的引用
 * @param {Color} color - 定义轮廓的颜色
 * @param {number} [thickness=0.003] - 定义轮廓的厚度
 * @param {number} [alpha=1] - 定义轮廓的透明度
 * @returns {ToonOutlinePassNode} 返回配置好的卡通轮廓通道节点
 */
export const toonOutlinePass = (scene, camera, color = new Color(0, 0, 0), thickness = 0.003, alpha = 1) =>
  nodeObject(new ToonOutlinePassNode(scene, camera, nodeObject(color), nodeObject(thickness), nodeObject(alpha)));
