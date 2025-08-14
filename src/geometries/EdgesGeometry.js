// 导入缓冲几何体基类
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入32位浮点数缓冲属性类
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入角度转弧度的常量
import { DEG2RAD } from "../math/MathUtils.js";
// 导入三角形类
import { Triangle } from "../math/Triangle.js";
// 导入三维向量类
import { Vector3 } from "../math/Vector3.js";

// 创建可重用的向量对象，用于性能优化
const _v0 = /*@__PURE__*/ new Vector3(); // 第一个顶点向量
const _v1 = /*@__PURE__*/ new Vector3(); // 第二个顶点向量
const _normal = /*@__PURE__*/ new Vector3(); // 法向量
const _triangle = /*@__PURE__*/ new Triangle(); // 三角形对象

/**
 * 可用作辅助对象来查看几何体的边缘。
 * 此类从现有几何体中提取边缘线段，用于线框渲染。
 *
 * ```js
 * const geometry = new THREE.BoxGeometry();
 * const edges = new THREE.EdgesGeometry( geometry );
 * const line = new THREE.LineSegments( edges );
 * scene.add( line );
 * ```
 *
 * 注意：目前还无法序列化/反序列化此类的实例。
 *
 * @augments BufferGeometry
 */
class EdgesGeometry extends BufferGeometry {
  /**
   * 构造一个新的边缘几何体。
   *
   * @param {?BufferGeometry} [geometry=null] - 源几何体。
   * @param {number} [thresholdAngle=1] - 只有当相邻面的法向量之间的角度（以度为单位）
   * 超过此值时，边缘才会被渲染。
   */
  constructor(geometry = null, thresholdAngle = 1) {
    // 调用父类构造函数
    super();

    // 设置几何体类型标识
    this.type = "EdgesGeometry";

    /**
     * 保存用于生成几何体的构造函数参数。
     * 实例化后的任何修改都不会改变几何体。
     *
     * @type {Object}
     */
    this.parameters = {
      geometry: geometry, // 保存源几何体
      thresholdAngle: thresholdAngle, // 保存阈值角度
    };

    // 如果提供了源几何体，则开始处理边缘提取
    if (geometry !== null) {
      // 设置精度点数，用于顶点坐标的哈希计算
      const precisionPoints = 4;
      // 计算精度倍数，用于将浮点数转换为整数进行哈希
      const precision = Math.pow(10, precisionPoints);
      // 将阈值角度转换为余弦值，用于快速角度比较
      const thresholdDot = Math.cos(DEG2RAD * thresholdAngle);

      // 获取几何体的索引属性（如果存在）
      const indexAttr = geometry.getIndex();
      // 获取几何体的位置属性
      const positionAttr = geometry.getAttribute("position");
      // 计算索引总数：如果有索引属性则使用其count，否则使用位置属性的count
      const indexCount = indexAttr ? indexAttr.count : positionAttr.count;

      // 用于存储当前三角形的三个顶点索引
      const indexArr = [0, 0, 0];
      // 三角形顶点的键名数组
      const vertKeys = ["a", "b", "c"];
      // 用于存储三个顶点的哈希值
      const hashes = new Array(3);

      // 存储边缘数据的对象，键为边缘哈希，值为边缘信息
      const edgeData = {};
      // 存储最终顶点坐标的数组
      const vertices = [];

      // 遍历所有三角形（每3个索引为一个三角形）
      for (let i = 0; i < indexCount; i += 3) {
        // 如果几何体有索引属性，从索引属性中获取顶点索引
        if (indexAttr) {
          indexArr[0] = indexAttr.getX(i); // 第一个顶点索引
          indexArr[1] = indexAttr.getX(i + 1); // 第二个顶点索引
          indexArr[2] = indexAttr.getX(i + 2); // 第三个顶点索引
        } else {
          // 如果没有索引属性，直接使用连续的索引
          indexArr[0] = i;
          indexArr[1] = i + 1;
          indexArr[2] = i + 2;
        }

        // 从三角形对象中解构出三个顶点
        const { a, b, c } = _triangle;
        // 从位置属性中读取三个顶点的坐标
        a.fromBufferAttribute(positionAttr, indexArr[0]);
        b.fromBufferAttribute(positionAttr, indexArr[1]);
        c.fromBufferAttribute(positionAttr, indexArr[2]);
        // 计算三角形的法向量
        _triangle.getNormal(_normal);

        // 为每个顶点创建哈希值，用于边缘检测
        // 将坐标乘以精度后四舍五入，然后转换为字符串哈希
        hashes[0] = `${Math.round(a.x * precision)},${Math.round(a.y * precision)},${Math.round(a.z * precision)}`;
        hashes[1] = `${Math.round(b.x * precision)},${Math.round(b.y * precision)},${Math.round(b.z * precision)}`;
        hashes[2] = `${Math.round(c.x * precision)},${Math.round(c.y * precision)},${Math.round(c.z * precision)}`;

        // 跳过退化的三角形（两个或更多顶点重合）
        if (hashes[0] === hashes[1] || hashes[1] === hashes[2] || hashes[2] === hashes[0]) {
          continue;
        }

        // 遍历三角形的每条边
        for (let j = 0; j < 3; j++) {
          // 获取构成边的第一个和下一个顶点
          const jNext = (j + 1) % 3; // 使用模运算确保索引循环
          const vecHash0 = hashes[j]; // 第一个顶点的哈希值
          const vecHash1 = hashes[jNext]; // 第二个顶点的哈希值
          const v0 = _triangle[vertKeys[j]]; // 第一个顶点坐标
          const v1 = _triangle[vertKeys[jNext]]; // 第二个顶点坐标

          // 创建边的哈希键（顺序）
          const hash = `${vecHash0}_${vecHash1}`;
          // 创建边的反向哈希键（逆序）
          const reverseHash = `${vecHash1}_${vecHash0}`;

          // 检查是否存在反向边（相邻面共享的边）
          if (reverseHash in edgeData && edgeData[reverseHash]) {
            // 如果找到了相邻边，检查两个面之间的角度是否超过阈值
            // 如果角度超过阈值，则将此边添加到顶点数组中
            if (_normal.dot(edgeData[reverseHash].normal) <= thresholdDot) {
              vertices.push(v0.x, v0.y, v0.z); // 添加第一个顶点坐标
              vertices.push(v1.x, v1.y, v1.z); // 添加第二个顶点坐标
            }

            // 删除已处理的边数据，避免重复处理
            edgeData[reverseHash] = null;
          } else if (!(hash in edgeData)) {
            // 如果这是一条新边，将其添加到边数据中
            edgeData[hash] = {
              index0: indexArr[j], // 第一个顶点的索引
              index1: indexArr[jNext], // 第二个顶点的索引
              normal: _normal.clone(), // 克隆当前面的法向量
            };
          }
        }
      }

      // 遍历所有剩余的未匹配边，并将它们添加到顶点数组中
      // 这些是几何体边界上的边（只属于一个面的边）
      for (const key in edgeData) {
        if (edgeData[key]) {
          // 解构出边的两个顶点索引
          const { index0, index1 } = edgeData[key];
          // 从位置属性中读取第一个顶点坐标
          _v0.fromBufferAttribute(positionAttr, index0);
          // 从位置属性中读取第二个顶点坐标
          _v1.fromBufferAttribute(positionAttr, index1);

          // 将边的两个顶点坐标添加到顶点数组中
          vertices.push(_v0.x, _v0.y, _v0.z);
          vertices.push(_v1.x, _v1.y, _v1.z);
        }
      }

      // 设置几何体的位置属性，每个顶点包含3个坐标分量
      this.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    }
  }

  /**
   * 复制源几何体的属性到当前几何体。
   *
   * @param {EdgesGeometry} source - 要复制的源几何体。
   * @return {EdgesGeometry} 返回当前几何体实例，支持链式调用。
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 复制构造参数
    this.parameters = Object.assign({}, source.parameters);

    // 返回当前实例，支持链式调用
    return this;
  }
}

// 导出边缘几何体类
export { EdgesGeometry };
