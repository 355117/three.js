// 导入颜色类，用于处理雾的颜色
import { Color } from "../math/Color.js";

/**
 * 线性雾效果类
 *
 * 此类用于定义线性雾效果，雾的密度随距离线性增长
 * 线性雾在近距离处开始显现，随着距离增加线性变浓，直到远距离处达到最大密度
 *
 * 特点：
 * - 雾密度随距离线性变化
 * - 可以精确控制雾的起始和结束距离
 * - 适用于需要明确雾效果边界的场景
 * - 计算简单，性能较好
 *
 * 使用场景：
 * - 室外场景的远景雾效果
 * - 需要明确可见距离限制的环境
 * - 大气透视效果的模拟
 *
 * 使用示例：
 * ```js
 * const scene = new THREE.Scene();
 * // 创建灰色线性雾，从距离10开始，到距离15完全遮挡
 * scene.fog = new THREE.Fog( 0xcccccc, 10, 15 );
 * ```
 */
class Fog {
  /**
   * 构造一个新的线性雾实例
   *
   * 线性雾的密度计算公式：
   * density = (distance - near) / (far - near)
   * 其中 density 被限制在 [0, 1] 范围内
   *
   * @param {number|Color} color - 雾的颜色
   *                              可以是十六进制数值（如 0xcccccc）或 Color 实例
   * @param {number} [near=1] - 雾效果开始的最小距离
   *                           距离相机小于此值的物体不受雾影响
   * @param {number} [far=1000] - 雾效果结束的最大距离
   *                             距离相机大于此值的物体完全被雾遮挡
   */
  constructor(color, near = 1, far = 1000) {
    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 Fog 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isFog = true;

    /**
     * 雾的名称
     *
     * 可选的标识符，用于调试或场景管理
     * 在复杂场景中可以通过名称来识别不同的雾实例
     *
     * @type {string}
     * @default ''
     */
    this.name = "";

    /**
     * 雾的颜色
     *
     * 定义雾的颜色，影响被雾遮挡物体的最终颜色
     * 雾的颜色会与物体原始颜色进行混合
     *
     * 颜色混合公式：
     * finalColor = mix(objectColor, fogColor, fogDensity)
     *
     * @type {Color}
     */
    this.color = new Color(color);

    /**
     * 雾效果开始距离
     *
     * 距离相机小于此值的物体不受雾影响，保持原始颜色
     * 这个值定义了清晰可见区域的边界
     *
     * 注意事项：
     * - 必须小于 far 值
     * - 值越小，雾效果开始得越早
     * - 通常设置为相机的近裁剪面附近
     *
     * @type {number}
     * @default 1
     */
    this.near = near;

    /**
     * 雾效果结束距离
     *
     * 距离相机大于此值的物体完全被雾遮挡，只显示雾的颜色
     * 这个值定义了完全不可见区域的边界
     *
     * 注意事项：
     * - 必须大于 near 值
     * - 值越大，雾效果过渡得越缓慢
     * - 通常设置为场景的可见范围边界
     *
     * @type {number}
     * @default 1000
     */
    this.far = far;
  }

  /**
   * 克隆当前雾实例
   *
   * 创建一个新的 Fog 实例，复制当前实例的所有属性值
   * 这是一个深拷贝操作，新实例与原实例完全独立
   *
   * 使用场景：
   * - 需要创建相似配置的多个雾实例
   * - 在不影响原实例的情况下修改雾参数
   * - 场景复制或模板创建
   *
   * @return {Fog} 当前实例的克隆副本
   */
  clone() {
    // 创建新的 Fog 实例，传入当前实例的颜色、近距离和远距离
    return new Fog(this.color, this.near, this.far);
  }

  /**
   * 将雾序列化为 JSON 格式
   *
   * 将雾的所有属性转换为 JSON 对象，用于数据存储、传输或场景保存
   * 颜色会被转换为十六进制数值格式以便存储
   *
   * 序列化的数据可以用于：
   * - 场景文件的保存和加载
   * - 网络传输
   * - 配置文件存储
   * - 调试和日志记录
   *
   * @param {?(Object|string)} meta - 可选的元信息，包含序列化相关的额外数据
   *                                 通常由 Three.js 的序列化系统内部使用
   * @return {Object} 表示序列化雾的 JSON 对象
   *                  包含 type、name、color、near、far 等属性
   */
  toJSON(/* meta */) {
    return {
      type: "Fog", // 类型标识符
      name: this.name, // 雾的名称
      color: this.color.getHex(), // 颜色的十六进制表示
      near: this.near, // 近距离值
      far: this.far, // 远距离值
    };
  }
}

// ===== 模块导出 =====

/**
 * 导出 Fog 类
 *
 * Fog 类用于创建线性雾效果，是 Three.js 场景渲染中重要的大气效果组件
 * 通过控制 near 和 far 参数，可以精确控制雾效果的范围和强度
 */
export { Fog };
