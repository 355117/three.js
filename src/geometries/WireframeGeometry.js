// 导入必要的Three.js核心模块
import { BufferGeometry } from "../core/BufferGeometry.js"; // 导入缓冲几何体基类
import { Float32BufferAttribute } from "../core/BufferAttribute.js"; // 导入32位浮点数缓冲属性类
import { Vector3 } from "../math/Vector3.js"; // 导入三维向量类

/**
 * 线框几何体类
 * 可以用作辅助对象来将几何体可视化为线框
 *
 * 使用示例：
 * ```js
 * const geometry = new THREE.SphereGeometry();
 *
 * const wireframe = new THREE.WireframeGeometry( geometry );
 *
 * const line = new THREE.LineSegments( wireframe );
 * line.material.depthWrite = false;
 * line.material.opacity = 0.25;
 * line.material.transparent = true;
 *
 * scene.add( line );
 * ```
 *
 * 注意：目前还不能序列化/反序列化此类的实例。
 *
 * @augments BufferGeometry
 */
class WireframeGeometry extends BufferGeometry {
  /**
   * 构造一个新的线框几何体
   *
   * @param {?BufferGeometry} [geometry=null] - 几何体对象
   */
  constructor(geometry = null) {
    // 调用父类构造函数
    super();

    // 设置几何体类型标识
    this.type = "WireframeGeometry";

    /**
     * 保存用于生成几何体的构造函数参数
     * 实例化后的任何修改都不会改变几何体
     *
     * @type {Object}
     */
    this.parameters = {
      geometry: geometry, // 源几何体
    };

    if (geometry !== null) {
      // 如果提供了几何体

      // 缓冲区数组

      const vertices = []; // 顶点坐标数组
      const edges = new Set(); // 边的集合（用于去重）

      // 辅助变量

      const start = new Vector3(); // 边的起始点
      const end = new Vector3(); // 边的结束点

      if (geometry.index !== null) {
        // 如果几何体有索引
        // 索引缓冲几何体

        const position = geometry.attributes.position; // 位置属性
        const indices = geometry.index; // 索引数组
        let groups = geometry.groups; // 几何体组

        if (groups.length === 0) {
          // 如果没有组，创建默认组
          groups = [{ start: 0, count: indices.count, materialIndex: 0 }];
        }

        // 创建一个包含所有边且无重复的数据结构

        for (let o = 0, ol = groups.length; o < ol; ++o) {
          // 遍历所有组
          const group = groups[o]; // 当前组

          const groupStart = group.start; // 组的起始索引
          const groupCount = group.count; // 组的索引数量

          for (let i = groupStart, l = groupStart + groupCount; i < l; i += 3) {
            // 遍历组中的三角形（每3个索引一个三角形）
            for (let j = 0; j < 3; j++) {
              // 遍历三角形的三条边
              const index1 = indices.getX(i + j); // 边的第一个顶点索引
              const index2 = indices.getX(i + ((j + 1) % 3)); // 边的第二个顶点索引

              start.fromBufferAttribute(position, index1); // 获取起始点坐标
              end.fromBufferAttribute(position, index2); // 获取结束点坐标

              if (isUniqueEdge(start, end, edges) === true) {
                // 如果是唯一边（避免重复）
                vertices.push(start.x, start.y, start.z); // 添加起始点坐标
                vertices.push(end.x, end.y, end.z); // 添加结束点坐标
              }
            }
          }
        }
      } else {
        // 非索引缓冲几何体

        const position = geometry.attributes.position; // 位置属性

        for (let i = 0, l = position.count / 3; i < l; i++) {
          // 遍历所有三角形
          for (let j = 0; j < 3; j++) {
            // 遍历三角形的三条边
            // 每个三角形有三条边，边用(index1, index2)表示
            // 例如第一个三角形有以下边：(0,1),(1,2),(2,0)

            const index1 = 3 * i + j; // 边的第一个顶点索引
            const index2 = 3 * i + ((j + 1) % 3); // 边的第二个顶点索引

            start.fromBufferAttribute(position, index1); // 获取起始点坐标
            end.fromBufferAttribute(position, index2); // 获取结束点坐标

            if (isUniqueEdge(start, end, edges) === true) {
              // 如果是唯一边（避免重复）
              vertices.push(start.x, start.y, start.z); // 添加起始点坐标
              vertices.push(end.x, end.y, end.z); // 添加结束点坐标
            }
          }
        }
      }

      // 构建几何体

      this.setAttribute("position", new Float32BufferAttribute(vertices, 3)); // 设置位置属性（每个顶点3个分量：x,y,z）
    }
  }

  /**
   * 复制方法 - 从另一个几何体复制属性
   * @param {WireframeGeometry} source - 源几何体对象
   * @return {WireframeGeometry} 返回当前对象以支持链式调用
   */
  copy(source) {
    super.copy(source); // 调用父类的复制方法

    this.parameters = Object.assign({}, source.parameters); // 深拷贝参数对象

    return this; // 返回当前对象
  }
}

/**
 * 检查边是否唯一的辅助函数
 * @param {Vector3} start - 边的起始点
 * @param {Vector3} end - 边的结束点
 * @param {Set} edges - 边的集合
 * @return {boolean} 如果边是唯一的返回true，否则返回false
 */
function isUniqueEdge(start, end, edges) {
  const hash1 = `${start.x},${start.y},${start.z}-${end.x},${end.y},${end.z}`; // 正向边的哈希
  const hash2 = `${end.x},${end.y},${end.z}-${start.x},${start.y},${start.z}`; // 反向边的哈希（重合边）

  if (edges.has(hash1) === true || edges.has(hash2) === true) {
    // 如果边已存在
    return false; // 不是唯一边
  } else {
    edges.add(hash1); // 添加正向边到集合
    edges.add(hash2); // 添加反向边到集合
    return true; // 是唯一边
  }
}

// 导出线框几何体类供外部使用
export { WireframeGeometry };
