/**
 * 层级对象
 * 将 3D 对象分配到编号为 0 到 31 的 32 个层级中的一个或多个层级
 * 内部使用位掩码存储层级信息，默认情况下所有 3D 对象都属于第 0 层
 *
 * 可用于控制可见性 - 对象必须与相机共享至少一个层级才能在该相机的视图中可见
 *
 * 所有继承自 Object3D 的类都有一个 layers 属性，该属性是此类的实例
 *
 * A layers object assigns an 3D object to 1 or more of 32
 * layers numbered `0` to `31` - internally the layers are stored as a
 * bit mask], and by default all 3D objects are a member of layer `0`.
 *
 * This can be used to control visibility - an object must share a layer with
 * a camera to be visible when that camera's view is
 * rendered.
 *
 * All classes that inherit from {@link Object3D} have an `layers` property which
 * is an instance of this class.
 */
class Layers {
  /**
   * 构造新的层级实例
   * 初始成员资格设置为第 0 层
   *
   * Constructs a new layers instance, with membership
   * initially set to layer `0`.
   */
  constructor() {
    /**
     * 位掩码，存储此层级对象当前所属的 32 个层级
     *
     * 位掩码工作原理：
     * - 使用一个 32 位整数来表示 32 个层级（0-31）
     * - 每一位代表一个层级：第 0 位代表层级 0，第 1 位代表层级 1，以此类推
     * - 位值为 1 表示属于该层级，位值为 0 表示不属于该层级
     *
     * 示例：
     * - mask = 1 (二进制: 00000001) 表示只属于层级 0
     * - mask = 3 (二进制: 00000011) 表示属于层级 0 和层级 1
     * - mask = 5 (二进制: 00000101) 表示属于层级 0 和层级 2
     *
     * A bit mask storing which of the 32 layers this layers object is currently
     * a member of.
     *
     * @type {number}
     */
    this.mask = 1 | 0; // 初始化为 1，表示默认属于第 0 层（二进制: 00000001）
  }

  /**
   * 设置为指定层级的成员，并移除所有其他层级的成员资格
   *
   * 位运算详解：
   * 1. (1 << layer): 左移运算，将数字 1 向左移动 layer 位
   *    - 例如：layer = 3 时，1 << 3 = 8 (二进制: 00001000)
   *    - 这样就在第 3 位设置了 1，其他位都是 0
   * 2. | 0: 按位或运算，确保结果是整数（JavaScript 优化技巧）
   * 3. >>> 0: 无符号右移 0 位，将结果转换为 32 位无符号整数
   *    - 确保 mask 始终是正数，避免符号位问题
   *
   * 示例：
   * - set(0): mask = 1 (二进制: 00000001) - 只属于层级 0
   * - set(3): mask = 8 (二进制: 00001000) - 只属于层级 3
   * - set(5): mask = 32 (二进制: 00100000) - 只属于层级 5
   *
   * Sets membership to the given layer, and remove membership all other layers.
   *
   * @param {number} layer - 要设置的层级 (0-31)
   */
  set(layer) {
    this.mask = ((1 << layer) | 0) >>> 0;
  }

  /**
   * 添加指定层级的成员资格
   *
   * 位运算详解：
   * 1. (1 << layer): 创建一个只有指定位为 1 的掩码
   *    - 例如：layer = 2 时，1 << 2 = 4 (二进制: 00000100)
   * 2. | 0: 确保结果是整数
   * 3. |=: 按位或赋值运算符，将新的位设置为 1，保持其他位不变
   *    - this.mask |= newBit 等价于 this.mask = this.mask | newBit
   *    - 按位或的特性：0|0=0, 0|1=1, 1|0=1, 1|1=1
   *    - 这意味着如果某位已经是 1，它保持为 1；如果是 0，则可能变为 1
   *
   * 示例：
   * - 当前 mask = 5 (二进制: 00000101，属于层级 0 和 2)
   * - enable(1): mask |= 2 (二进制: 00000010)
   * - 结果 mask = 7 (二进制: 00000111，现在属于层级 0、1、2)
   *
   * Adds membership of the given layer.
   *
   * @param {number} layer - 要启用的层级 (0-31)
   */
  enable(layer) {
    this.mask |= (1 << layer) | 0;
  }

  /**
   * 添加所有层级的成员资格
   *
   * 位运算详解：
   * 1. 0xffffffff: 十六进制表示法，等于十进制的 4294967295
   *    - 二进制表示：11111111111111111111111111111111 (32个1)
   *    - 这意味着所有 32 位都设置为 1，表示属于所有层级 (0-31)
   * 2. | 0: 确保结果是整数
   *
   * 十六进制说明：
   * - 0x 前缀表示十六进制数
   * - f 在十六进制中等于 15，二进制为 1111
   * - 所以 0xffffffff = 32 个 1 的二进制数
   *
   * 结果：mask = 4294967295，表示属于所有 32 个层级
   *
   * Adds membership to all layers.
   */
  enableAll() {
    this.mask = 0xffffffff | 0;
  }

  /**
   * 切换指定层级的成员资格
   *
   * 位运算详解：
   * 1. (1 << layer): 创建一个只有指定位为 1 的掩码
   * 2. | 0: 确保结果是整数
   * 3. ^=: 按位异或赋值运算符，实现位的切换功能
   *    - this.mask ^= toggleBit 等价于 this.mask = this.mask ^ toggleBit
   *    - 按位异或的特性：0^0=0, 0^1=1, 1^0=1, 1^1=0
   *    - 这意味着：如果某位是 0，异或 1 后变为 1；如果某位是 1，异或 1 后变为 0
   *
   * 示例：
   * - 当前 mask = 5 (二进制: 00000101，属于层级 0 和 2)
   * - toggle(1): mask ^= 2 (二进制: 00000010)
   * - 结果 mask = 7 (二进制: 00000111，现在属于层级 0、1、2)
   * - 再次 toggle(1): mask ^= 2
   * - 结果 mask = 5 (二进制: 00000101，又回到层级 0 和 2)
   *
   * Toggles the membership of the given layer.
   *
   * @param {number} layer - 要切换的层级 (0-31)
   */
  toggle(layer) {
    this.mask ^= (1 << layer) | 0;
  }

  /**
   * 移除指定层级的成员资格
   *
   * 位运算详解：
   * 1. (1 << layer): 创建一个只有指定位为 1 的掩码
   *    - 例如：layer = 2 时，1 << 2 = 4 (二进制: 00000100)
   * 2. | 0: 确保结果是整数
   * 3. ~: 按位取反运算符，将所有位翻转
   *    - ~4 = ~(00000100) = 11111011 (除了第 2 位是 0，其他位都是 1)
   * 4. &=: 按位与赋值运算符，用于清除特定位
   *    - this.mask &= clearMask 等价于 this.mask = this.mask & clearMask
   *    - 按位与的特性：0&0=0, 0&1=0, 1&0=0, 1&1=1
   *    - 与一个位为 0 的掩码进行与运算，会将对应位清零，其他位保持不变
   *
   * 示例：
   * - 当前 mask = 7 (二进制: 00000111，属于层级 0、1、2)
   * - disable(1):
   *   - (1 << 1) = 2 (二进制: 00000010)
   *   - ~2 = 11111101 (除第 1 位为 0，其他位为 1)
   *   - mask &= 11111101
   * - 结果 mask = 5 (二进制: 00000101，现在属于层级 0 和 2)
   *
   * Removes membership of the given layer.
   *
   * @param {number} layer - 要禁用的层级 (0-31)
   */
  disable(layer) {
    this.mask &= ~((1 << layer) | 0);
  }

  /**
   * 移除所有层级的成员资格
   *
   * 位运算详解：
   * - 直接将 mask 设置为 0
   * - 0 的二进制表示：00000000000000000000000000000000 (32个0)
   * - 这意味着所有位都是 0，表示不属于任何层级
   *
   * 结果：mask = 0，表示不属于任何层级
   *
   * Removes the membership from all layers.
   */
  disableAll() {
    this.mask = 0;
  }

  /**
   * 如果此层级对象与给定的层级对象至少有一个共同层级，则返回 true
   *
   * 位运算详解：
   * 1. &: 按位与运算符，用于检测共同的位
   *    - 按位与的特性：只有当两个对应位都是 1 时，结果位才是 1
   *    - 0&0=0, 0&1=0, 1&0=0, 1&1=1
   * 2. !== 0: 检查结果是否不为零
   *    - 如果两个 mask 有任何共同的位为 1，按位与的结果就不会是 0
   *    - 如果没有共同的位为 1，按位与的结果就是 0
   *
   * 示例：
   * - this.mask = 5 (二进制: 00000101，属于层级 0 和 2)
   * - layers.mask = 6 (二进制: 00000110，属于层级 1 和 2)
   * - this.mask & layers.mask = 5 & 6 = 4 (二进制: 00000100)
   * - 结果不为 0，说明有共同层级（层级 2），返回 true
   *
   * - this.mask = 1 (二进制: 00000001，属于层级 0)
   * - layers.mask = 2 (二进制: 00000010，属于层级 1)
   * - this.mask & layers.mask = 1 & 2 = 0 (二进制: 00000000)
   * - 结果为 0，说明没有共同层级，返回 false
   *
   * Returns `true` if this and the given layers object have at least one
   * layer in common.
   *
   * @param {Layers} layers - 要测试的层级对象
   * @return {boolean} 此层级对象与给定层级对象是否至少有一个共同层级
   */
  test(layers) {
    return (this.mask & layers.mask) !== 0;
  }

  /**
   * 如果给定层级已启用，则返回 true
   *
   * 位运算详解：
   * 1. (1 << layer): 创建一个只有指定位为 1 的测试掩码
   *    - 例如：layer = 3 时，1 << 3 = 8 (二进制: 00001000)
   * 2. | 0: 确保结果是整数
   * 3. &: 按位与运算，检测指定位是否为 1
   *    - this.mask & testMask 会保留 mask 中与 testMask 对应的位
   *    - 如果该位是 1，结果就是 testMask 的值；如果该位是 0，结果就是 0
   * 4. !== 0: 检查结果是否不为零
   *    - 不为零说明该位是 1，即该层级已启用
   *    - 为零说明该位是 0，即该层级未启用
   *
   * 示例：
   * - this.mask = 5 (二进制: 00000101，属于层级 0 和 2)
   * - isEnabled(2):
   *   - (1 << 2) = 4 (二进制: 00000100)
   *   - this.mask & 4 = 5 & 4 = 4 (二进制: 00000100)
   *   - 4 !== 0，返回 true（层级 2 已启用）
   * - isEnabled(1):
   *   - (1 << 1) = 2 (二进制: 00000010)
   *   - this.mask & 2 = 5 & 2 = 0 (二进制: 00000000)
   *   - 0 === 0，返回 false（层级 1 未启用）
   *
   * Returns `true` if the given layer is enabled.
   *
   * @param {number} layer - 要测试的层级 (0-31)
   * @return {boolean} 给定层级是否已启用
   */
  isEnabled(layer) {
    return (this.mask & ((1 << layer) | 0)) !== 0;
  }
}

/**
 * 导出 Layers 类
 */
export { Layers };
