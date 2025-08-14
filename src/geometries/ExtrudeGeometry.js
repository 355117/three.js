// 导入缓冲几何体基类
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入32位浮点数缓冲属性类，用于存储顶点数据
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入曲线相关的所有类，用于处理挤出路径
import * as Curves from "../extras/curves/Curves.js";
// 导入二维向量类，用于处理2D形状坐标
import { Vector2 } from "../math/Vector2.js";
// 导入三维向量类，用于处理3D坐标和法向量计算
import { Vector3 } from "../math/Vector3.js";
// 导入形状类，用于定义要挤出的2D形状
import { Shape } from "../extras/core/Shape.js";
// 导入形状工具类，用于形状的几何计算和处理
import { ShapeUtils } from "../extras/ShapeUtils.js";

/**
 * 挤出几何体类，用于从2D形状创建3D挤出几何体
 * 这是Three.js中最复杂的几何体之一，支持多种高级功能：
 * - 基本挤出：将2D形状沿Z轴挤出指定深度
 * - 路径挤出：沿指定的3D路径挤出形状
 * - 斜角处理：在挤出的边缘添加斜角效果
 * - 多形状支持：同时处理多个形状
 * - 自定义UV生成：支持自定义纹理坐标生成
 *
 * 使用示例：
 * ```js
 * const length = 12, width = 8;
 *
 * const shape = new THREE.Shape();
 * shape.moveTo( 0,0 );
 * shape.lineTo( 0, width );
 * shape.lineTo( length, width );
 * shape.lineTo( length, 0 );
 * shape.lineTo( 0, 0 );
 *
 * const geometry = new THREE.ExtrudeGeometry( shape );
 * const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
 * const mesh = new THREE.Mesh( geometry, material ) ;
 * scene.add( mesh );
 * ```
 *
 * @augments BufferGeometry
 */
class ExtrudeGeometry extends BufferGeometry {
  /**
   * 构造一个新的挤出几何体
   *
   * @param {Shape|Array<Shape>} [shapes] - 要挤出的形状或形状数组，默认为一个正方形
   * @param {ExtrudeGeometry~Options} [options] - 挤出设置选项对象
   */
  constructor(shapes = new Shape([new Vector2(0.5, 0.5), new Vector2(-0.5, 0.5), new Vector2(-0.5, -0.5), new Vector2(0.5, -0.5)]), options = {}) {
    // 调用父类BufferGeometry的构造函数
    super();

    // 设置几何体类型标识
    this.type = "ExtrudeGeometry";

    /**
     * 保存构造函数参数的对象
     * 这些参数用于生成几何体，实例化后的任何修改都不会改变几何体
     * 主要用于序列化、调试和重新创建几何体
     *
     * @type {Object}
     */
    this.parameters = {
      shapes: shapes, // 输入的形状或形状数组
      options: options, // 挤出选项配置
    };

    // 确保shapes是数组格式，如果传入单个形状则转换为数组
    shapes = Array.isArray(shapes) ? shapes : [shapes];

    // 保存当前实例的引用，用于内部函数访问
    const scope = this;

    // 主要的数据存储数组
    const verticesArray = []; // 存储所有顶点坐标的数组
    const uvArray = []; // 存储所有UV纹理坐标的数组

    // 遍历所有形状，为每个形状生成挤出几何体
    for (let i = 0, l = shapes.length; i < l; i++) {
      const shape = shapes[i]; // 当前处理的形状
      addShape(shape); // 调用内部函数处理单个形状
    }

    // 构建最终的几何体

    this.setAttribute("position", new Float32BufferAttribute(verticesArray, 3)); // 设置顶点位置属性
    this.setAttribute("uv", new Float32BufferAttribute(uvArray, 2)); // 设置UV纹理坐标属性

    this.computeVertexNormals(); // 自动计算顶点法向量

    // 内部函数定义

    /**
     * 处理单个形状的挤出逻辑
     * 这是ExtrudeGeometry的核心函数，处理所有的挤出计算
     *
     * @param {Shape} shape - 要处理的形状对象
     */
    function addShape(shape) {
      const placeholder = []; // 占位符数组，用于存储中间计算结果

      // 解析和设置挤出选项参数

      const curveSegments = options.curveSegments !== undefined ? options.curveSegments : 12; // 曲线分段数，影响曲线的平滑度
      const steps = options.steps !== undefined ? options.steps : 1; // 挤出步数，影响挤出方向的分段
      const depth = options.depth !== undefined ? options.depth : 1; // 挤出深度

      let bevelEnabled = options.bevelEnabled !== undefined ? options.bevelEnabled : true; // 是否启用斜角
      let bevelThickness = options.bevelThickness !== undefined ? options.bevelThickness : 0.2; // 斜角厚度
      let bevelSize = options.bevelSize !== undefined ? options.bevelSize : bevelThickness - 0.1; // 斜角大小
      let bevelOffset = options.bevelOffset !== undefined ? options.bevelOffset : 0; // 斜角偏移
      let bevelSegments = options.bevelSegments !== undefined ? options.bevelSegments : 3; // 斜角分段数

      const extrudePath = options.extrudePath; // 挤出路径，如果指定则沿路径挤出

      const uvgen = options.UVGenerator !== undefined ? options.UVGenerator : WorldUVGenerator; // UV坐标生成器

      // 路径挤出相关变量初始化

      let extrudePts, // 挤出路径上的点数组
        extrudeByPath = false; // 是否沿路径挤出的标志
      let splineTube, binormal, normal, position2; // 路径挤出所需的几何变量

      // 如果指定了挤出路径，则进行路径挤出设置
      if (extrudePath) {
        extrudePts = extrudePath.getSpacedPoints(steps); // 获取路径上等间距分布的点

        extrudeByPath = true; // 设置路径挤出标志
        bevelEnabled = false; // 路径挤出不支持斜角，禁用斜角功能

        // 设置TNB（切线-法线-副法线）坐标系变量
        // TNB坐标系用于沿路径正确定向挤出的形状

        // TODO1 - 检查样条曲线是否闭合的功能待实现

        splineTube = extrudePath.computeFrenetFrames(steps, false); // 计算路径的Frenet标架

        // console.log(splineTube, 'splineTube', splineTube.normals.length, 'steps', steps, 'extrudePts', extrudePts.length);

        binormal = new Vector3(); // 副法线向量
        normal = new Vector3(); // 法线向量
        position2 = new Vector3(); // 位置向量
      }

      // 如果未启用斜角，则重置所有斜角相关参数

      if (!bevelEnabled) {
        bevelSegments = 0; // 斜角分段数设为0
        bevelThickness = 0; // 斜角厚度设为0
        bevelSize = 0; // 斜角大小设为0
        bevelOffset = 0; // 斜角偏移设为0
      }

      // 形状数据初始化

      const shapePoints = shape.extractPoints(curveSegments); // 从形状中提取点，包括主形状和孔洞

      let vertices = shapePoints.shape; // 主形状的顶点数组
      const holes = shapePoints.holes; // 孔洞的顶点数组

      // 检查顶点顺序，确保为逆时针方向（Three.js的标准）
      const reverse = !ShapeUtils.isClockWise(vertices);

      if (reverse) {
        vertices = vertices.reverse(); // 如果是顺时针，则反转为逆时针

        // 同时检查孔洞的方向，确保与主形状方向一致
        // 孔洞应该与主形状方向相反

        for (let h = 0, hl = holes.length; h < hl; h++) {
          const ahole = holes[h]; // 当前孔洞

          if (ShapeUtils.isClockWise(ahole)) {
            holes[h] = ahole.reverse(); // 如果孔洞是顺时针，则反转
          }
        }
      }

      /**
       * 合并距离过近的重叠点
       * 将索引相邻且距离在阈值范围内的点合并，直接修改原数组
       * 阈值距离是经验值，根据点坐标的大小进行缩放
       *
       * @param {Array<Vector2>} points - 要处理的点数组
       */
      function mergeOverlappingPoints(points) {
        const THRESHOLD = 1e-10; // 基础阈值距离
        const THRESHOLD_SQ = THRESHOLD * THRESHOLD; // 阈值距离的平方，用于避免开方运算
        let prevPos = points[0]; // 前一个点的位置

        for (let i = 1; i <= points.length; i++) {
          const currentIndex = i % points.length; // 当前点的索引（循环处理）
          const currentPos = points[currentIndex]; // 当前点的位置
          const dx = currentPos.x - prevPos.x; // X方向的距离差
          const dy = currentPos.y - prevPos.y; // Y方向的距离差
          const distSq = dx * dx + dy * dy; // 距离的平方

          // 根据点坐标的大小计算缩放因子，处理不同尺度的几何体
          const scalingFactorSqrt = Math.max(Math.abs(currentPos.x), Math.abs(currentPos.y), Math.abs(prevPos.x), Math.abs(prevPos.y));
          const thresholdSqScaled = THRESHOLD_SQ * scalingFactorSqrt * scalingFactorSqrt; // 缩放后的阈值

          if (distSq <= thresholdSqScaled) {
            points.splice(currentIndex, 1); // 删除重叠的点
            i--; // 调整索引
            continue;
          }

          prevPos = currentPos; // 更新前一个点的位置
        }
      }

      // 对主形状和所有孔洞应用重叠点合并
      mergeOverlappingPoints(vertices);
      holes.forEach(mergeOverlappingPoints);

      const numHoles = holes.length; // 孔洞数量

      /* 顶点处理 */

      const contour = vertices; // contour保存外轮廓点，vertices将包含所有点（外轮廓+孔洞）

      // 将所有孔洞的顶点添加到主顶点数组中
      for (let h = 0; h < numHoles; h++) {
        const ahole = holes[h]; // 当前孔洞

        vertices = vertices.concat(ahole); // 将孔洞顶点合并到主顶点数组
      }

      /**
       * 按指定方向和大小缩放点
       *
       * @param {Vector2} pt - 原始点
       * @param {Vector2} vec - 缩放方向向量
       * @param {number} size - 缩放大小
       * @return {Vector2} 缩放后的新点
       */
      function scalePt2(pt, vec, size) {
        if (!vec) console.error("THREE.ExtrudeGeometry: vec does not exist");

        return pt.clone().addScaledVector(vec, size); // 克隆原点并沿指定方向缩放
      }

      const vlen = vertices.length; // 总顶点数量

      // 计算点移动方向的函数

      /**
       * 计算斜角向量
       * 为输入点inPt计算对应的新轮廓上的点inPt'，该点向左偏移1个单位长度
       * 如果沿轮廓顺时针行走，新轮廓在旧轮廓外侧
       *
       * inPt'是两条平行线的交点，这两条线分别平行于inPt的两个相邻边，
       * 且在左侧距离为1个单位
       *
       * @param {Vector2} inPt - 当前点
       * @param {Vector2} inPrev - 前一个点
       * @param {Vector2} inNext - 下一个点
       * @return {Vector2} 斜角向量
       */
      function getBevelVec(inPt, inPrev, inNext) {
        // 计算inPt对应的新轮廓上的点inPt'
        // 新点向左偏移1个单位长度（标准化向量的长度）
        // 如果沿轮廓顺时针行走，新轮廓在旧轮廓外侧
        //
        // inPt'是两条平行线的交点，这两条线分别平行于inPt的两个相邻边，
        // 且在左侧距离为1个单位

        let v_trans_x, v_trans_y, shrink_by; // inPt的最终平移向量

        // 几何算法的优秀参考资料（这里：直线-直线相交）
        // http://geomalgorithms.com/a05-_intersect-1.html

        const v_prev_x = inPt.x - inPrev.x, // 前一条边的X分量
          v_prev_y = inPt.y - inPrev.y; // 前一条边的Y分量
        const v_next_x = inNext.x - inPt.x, // 下一条边的X分量
          v_next_y = inNext.y - inPt.y; // 下一条边的Y分量

        const v_prev_lensq = v_prev_x * v_prev_x + v_prev_y * v_prev_y; // 前一条边长度的平方

        // 检查边是否共线
        const collinear0 = v_prev_x * v_next_y - v_prev_y * v_next_x; // 叉积，用于判断共线

        if (Math.abs(collinear0) > Number.EPSILON) {
          // 边不共线的情况

          // 计算向量长度用于标准化

          const v_prev_len = Math.sqrt(v_prev_lensq); // 前一条边的长度
          const v_next_len = Math.sqrt(v_next_x * v_next_x + v_next_y * v_next_y); // 下一条边的长度

          // 将相邻点按单位向量向左偏移

          const ptPrevShift_x = inPrev.x - v_prev_y / v_prev_len; // 前一个点向左偏移后的X坐标
          const ptPrevShift_y = inPrev.y + v_prev_x / v_prev_len; // 前一个点向左偏移后的Y坐标

          const ptNextShift_x = inNext.x - v_next_y / v_next_len; // 下一个点向左偏移后的X坐标
          const ptNextShift_y = inNext.y + v_next_x / v_next_len; // 下一个点向左偏移后的Y坐标

          // 计算v_prev到交点的缩放因子

          const sf = ((ptNextShift_x - ptPrevShift_x) * v_next_y - (ptNextShift_y - ptPrevShift_y) * v_next_x) / (v_prev_x * v_next_y - v_prev_y * v_next_x);

          // 从inPt到交点的向量

          v_trans_x = ptPrevShift_x + v_prev_x * sf - inPt.x; // 平移向量的X分量
          v_trans_y = ptPrevShift_y + v_prev_y * sf - inPt.y; // 平移向量的Y分量

          // 不要标准化！否则尖角会变得难看
          // 但要防止疯狂的尖刺
          const v_trans_lensq = v_trans_x * v_trans_x + v_trans_y * v_trans_y; // 平移向量长度的平方
          if (v_trans_lensq <= 2) {
            return new Vector2(v_trans_x, v_trans_y); // 返回合理范围内的平移向量
          } else {
            shrink_by = Math.sqrt(v_trans_lensq / 2); // 计算收缩因子以限制尖刺
          }
        } else {
          // 处理共线边的特殊情况

          let direction_eq = false; // 假设：方向相反

          // 检查两条边的方向是否相同
          if (v_prev_x > Number.EPSILON) {
            if (v_next_x > Number.EPSILON) {
              direction_eq = true; // 两条边都向右
            }
          } else {
            if (v_prev_x < -Number.EPSILON) {
              if (v_next_x < -Number.EPSILON) {
                direction_eq = true; // 两条边都向左
              }
            } else {
              if (Math.sign(v_prev_y) === Math.sign(v_next_y)) {
                direction_eq = true; // Y方向相同
              }
            }
          }

          if (direction_eq) {
            // 直线序列的情况
            // console.log("Warning: lines are a straight sequence");
            v_trans_x = -v_prev_y; // 垂直于边的方向
            v_trans_y = v_prev_x; // 垂直于边的方向
            shrink_by = Math.sqrt(v_prev_lensq); // 使用边长作为收缩因子
          } else {
            // 直线尖刺的情况
            // console.log("Warning: lines are a straight spike");
            v_trans_x = v_prev_x; // 沿边的方向
            v_trans_y = v_prev_y; // 沿边的方向
            shrink_by = Math.sqrt(v_prev_lensq / 2); // 使用一半边长作为收缩因子
          }
        }

        return new Vector2(v_trans_x / shrink_by, v_trans_y / shrink_by); // 返回标准化的平移向量
      }

      // 计算轮廓上每个点的移动向量
      const contourMovements = [];

      // 遍历轮廓上的每个点，计算其斜角向量
      for (let i = 0, il = contour.length, j = il - 1, k = i + 1; i < il; i++, j++, k++) {
        if (j === il) j = 0; // 循环到开始
        if (k === il) k = 0; // 循环到开始

        //  (j)---(i)---(k)  点的连接关系
        // console.log('i,j,k', i, j , k)

        contourMovements[i] = getBevelVec(contour[i], contour[j], contour[k]); // 计算当前点的斜角向量
      }

      // 计算孔洞的移动向量
      const holesMovements = [];
      let oneHoleMovements,
        verticesMovements = contourMovements.concat(); // 复制轮廓移动向量

      // 遍历每个孔洞
      for (let h = 0, hl = numHoles; h < hl; h++) {
        const ahole = holes[h]; // 当前孔洞

        oneHoleMovements = []; // 当前孔洞的移动向量数组

        // 遍历孔洞上的每个点
        for (let i = 0, il = ahole.length, j = il - 1, k = i + 1; i < il; i++, j++, k++) {
          if (j === il) j = 0; // 循环到开始
          if (k === il) k = 0; // 循环到开始

          //  (j)---(i)---(k)  点的连接关系
          oneHoleMovements[i] = getBevelVec(ahole[i], ahole[j], ahole[k]); // 计算孔洞点的斜角向量
        }

        holesMovements.push(oneHoleMovements); // 添加到孔洞移动向量集合
        verticesMovements = verticesMovements.concat(oneHoleMovements); // 合并到总移动向量数组
      }

      // 三角剖分结果
      let faces;

      // 根据是否有斜角选择不同的处理方式
      if (bevelSegments === 0) {
        // 无斜角：直接对形状进行三角剖分
        faces = ShapeUtils.triangulateShape(contour, holes);
      } else {
        // 有斜角：需要生成收缩的轮廓和扩展的孔洞
        const contractedContourVertices = []; // 收缩后的轮廓顶点
        const expandedHoleVertices = []; // 扩展后的孔洞顶点

        // 循环处理斜角分段，1个用于前面，1个用于后面

        for (let b = 0; b < bevelSegments; b++) {
          //for ( b = bevelSegments; b > 0; b -- ) {

          const t = b / bevelSegments; // 当前分段的参数（0到1）
          const z = bevelThickness * Math.cos((t * Math.PI) / 2); // Z坐标：使用余弦函数创建平滑过渡
          const bs = bevelSize * Math.sin((t * Math.PI) / 2) + bevelOffset; // 斜角大小：使用正弦函数

          // 收缩形状轮廓

          for (let i = 0, il = contour.length; i < il; i++) {
            const vert = scalePt2(contour[i], contourMovements[i], bs); // 按斜角大小缩放点

            v(vert.x, vert.y, -z); // 添加顶点到几何体
            if (t === 0) contractedContourVertices.push(vert); // 保存第一层的收缩顶点
          }

          // 扩展孔洞

          for (let h = 0, hl = numHoles; h < hl; h++) {
            const ahole = holes[h]; // 当前孔洞
            oneHoleMovements = holesMovements[h]; // 获取当前孔洞的移动向量
            const oneHoleVertices = []; // 当前孔洞的顶点数组
            for (let i = 0, il = ahole.length; i < il; i++) {
              const vert = scalePt2(ahole[i], oneHoleMovements[i], bs); // 按斜角大小缩放孔洞点

              v(vert.x, vert.y, -z); // 添加顶点到几何体
              if (t === 0) oneHoleVertices.push(vert); // 保存第一层的扩展顶点
            }

            if (t === 0) expandedHoleVertices.push(oneHoleVertices); // 保存扩展后的孔洞顶点
          }
        }

        // 对收缩后的轮廓和扩展后的孔洞进行三角剖分
        faces = ShapeUtils.triangulateShape(contractedContourVertices, expandedHoleVertices);
      }

      const flen = faces.length; // 三角形面的数量

      const bs = bevelSize + bevelOffset; // 最终的斜角大小

      // 生成背面顶点

      for (let i = 0; i < vlen; i++) {
        // 根据是否启用斜角选择顶点：启用斜角则缩放，否则使用原始顶点
        const vert = bevelEnabled ? scalePt2(vertices[i], verticesMovements[i], bs) : vertices[i];

        if (!extrudeByPath) {
          // 简单挤出：直接在Z=0平面上放置顶点
          v(vert.x, vert.y, 0);
        } else {
          // 路径挤出：使用Frenet标架变换顶点
          // v( vert.x, vert.y + extrudePts[ 0 ].y, extrudePts[ 0 ].x );

          normal.copy(splineTube.normals[0]).multiplyScalar(vert.x); // 法线方向的分量
          binormal.copy(splineTube.binormals[0]).multiplyScalar(vert.y); // 副法线方向的分量

          position2.copy(extrudePts[0]).add(normal).add(binormal); // 计算最终位置

          v(position2.x, position2.y, position2.z); // 添加变换后的顶点
        }
      }

      // 添加分步顶点...
      // 包括正面顶点

      for (let s = 1; s <= steps; s++) {
        for (let i = 0; i < vlen; i++) {
          // 根据是否启用斜角选择顶点
          const vert = bevelEnabled ? scalePt2(vertices[i], verticesMovements[i], bs) : vertices[i];

          if (!extrudeByPath) {
            // 简单挤出：沿Z轴线性分布顶点
            v(vert.x, vert.y, (depth / steps) * s);
          } else {
            // 路径挤出：沿路径的每个步骤变换顶点
            // v( vert.x, vert.y + extrudePts[ s - 1 ].y, extrudePts[ s - 1 ].x );

            normal.copy(splineTube.normals[s]).multiplyScalar(vert.x); // 当前步骤的法线分量
            binormal.copy(splineTube.binormals[s]).multiplyScalar(vert.y); // 当前步骤的副法线分量

            position2.copy(extrudePts[s]).add(normal).add(binormal); // 计算当前步骤的位置

            v(position2.x, position2.y, position2.z); // 添加变换后的顶点
          }
        }
      }

      // 添加斜角分段平面

      //for ( b = 1; b <= bevelSegments; b ++ ) {
      for (let b = bevelSegments - 1; b >= 0; b--) {
        // 从最后一个斜角分段开始，向前处理
        const t = b / bevelSegments; // 当前分段的参数
        const z = bevelThickness * Math.cos((t * Math.PI) / 2); // Z坐标
        const bs = bevelSize * Math.sin((t * Math.PI) / 2) + bevelOffset; // 斜角大小

        // 收缩形状

        for (let i = 0, il = contour.length; i < il; i++) {
          const vert = scalePt2(contour[i], contourMovements[i], bs); // 缩放轮廓点
          v(vert.x, vert.y, depth + z); // 添加到正面斜角位置
        }

        // 扩展孔洞

        for (let h = 0, hl = holes.length; h < hl; h++) {
          const ahole = holes[h]; // 当前孔洞
          oneHoleMovements = holesMovements[h]; // 当前孔洞的移动向量

          for (let i = 0, il = ahole.length; i < il; i++) {
            const vert = scalePt2(ahole[i], oneHoleMovements[i], bs); // 缩放孔洞点

            if (!extrudeByPath) {
              // 简单挤出：直接放置在正面斜角位置
              v(vert.x, vert.y, depth + z);
            } else {
              // 路径挤出：使用路径终点位置
              v(vert.x, vert.y + extrudePts[steps - 1].y, extrudePts[steps - 1].x + z);
            }
          }
        }
      }

      /* 面的生成 */

      // 顶面和底面

      buildLidFaces();

      // 侧面

      buildSideFaces();

      ///// 内部函数定义

      /**
       * 构建顶盖和底盖面的函数
       * 根据是否启用斜角采用不同的处理方式
       */
      function buildLidFaces() {
        const start = verticesArray.length / 3; // 当前顶点数组的起始索引

        if (bevelEnabled) {
          // 启用斜角的情况
          let layer = 0; // steps + 1
          let offset = vlen * layer; // 底面顶点的偏移量

          // 底面

          for (let i = 0; i < flen; i++) {
            const face = faces[i]; // 当前三角形面
            f3(face[2] + offset, face[1] + offset, face[0] + offset); // 反向绕序创建底面
          }

          layer = steps + bevelSegments * 2; // 顶面层的索引
          offset = vlen * layer; // 顶面顶点的偏移量

          // 顶面

          for (let i = 0; i < flen; i++) {
            const face = faces[i]; // 当前三角形面
            f3(face[0] + offset, face[1] + offset, face[2] + offset); // 正向绕序创建顶面
          }
        } else {
          // 未启用斜角的情况

          // 底面

          for (let i = 0; i < flen; i++) {
            const face = faces[i]; // 当前三角形面
            f3(face[2], face[1], face[0]); // 反向绕序创建底面
          }

          // 顶面

          for (let i = 0; i < flen; i++) {
            const face = faces[i]; // 当前三角形面
            f3(face[0] + vlen * steps, face[1] + vlen * steps, face[2] + vlen * steps); // 正向绕序创建顶面
          }
        }

        scope.addGroup(start, verticesArray.length / 3 - start, 0); // 添加顶盖和底盖的材质组
      }

      // 为形状的Z侧面创建面

      /**
       * 构建侧面的函数
       * 连接顶面和底面之间的所有层，形成挤出体的侧壁
       */
      function buildSideFaces() {
        const start = verticesArray.length / 3; // 侧面顶点的起始索引
        let layeroffset = 0; // 层偏移量
        sidewalls(contour, layeroffset); // 构建外轮廓的侧壁
        layeroffset += contour.length; // 更新偏移量

        // 为每个孔洞构建侧壁
        for (let h = 0, hl = holes.length; h < hl; h++) {
          const ahole = holes[h]; // 当前孔洞
          sidewalls(ahole, layeroffset); // 构建孔洞的侧壁

          //, true
          layeroffset += ahole.length; // 更新偏移量
        }

        scope.addGroup(start, verticesArray.length / 3 - start, 1); // 添加侧面的材质组
      }

      /**
       * 构建轮廓侧壁的函数
       *
       * @param {Array} contour - 轮廓点数组
       * @param {number} layeroffset - 层偏移量
       */
      function sidewalls(contour, layeroffset) {
        let i = contour.length; // 轮廓点数量

        // 从最后一个点开始，向前遍历
        while (--i >= 0) {
          const j = i; // 当前点索引
          let k = i - 1; // 前一个点索引
          if (k < 0) k = contour.length - 1; // 循环到最后一个点

          //console.log('b', i,j, i-1, k,vertices.length);

          // 遍历所有层（包括斜角层）
          for (let s = 0, sl = steps + bevelSegments * 2; s < sl; s++) {
            const slen1 = vlen * s; // 当前层的顶点偏移
            const slen2 = vlen * (s + 1); // 下一层的顶点偏移

            // 计算四边形的四个顶点索引
            const a = layeroffset + j + slen1, // 当前层当前点
              b = layeroffset + k + slen1, // 当前层前一点
              c = layeroffset + k + slen2, // 下一层前一点
              d = layeroffset + j + slen2; // 下一层当前点

            f4(a, b, c, d); // 创建四边形面
          }
        }
      }

      /**
       * 添加顶点到占位符数组的函数
       *
       * @param {number} x - X坐标
       * @param {number} y - Y坐标
       * @param {number} z - Z坐标
       */
      function v(x, y, z) {
        placeholder.push(x); // 添加X坐标
        placeholder.push(y); // 添加Y坐标
        placeholder.push(z); // 添加Z坐标
      }

      /**
       * 创建三角形面的函数
       *
       * @param {number} a - 第一个顶点索引
       * @param {number} b - 第二个顶点索引
       * @param {number} c - 第三个顶点索引
       */
      function f3(a, b, c) {
        addVertex(a); // 添加第一个顶点
        addVertex(b); // 添加第二个顶点
        addVertex(c); // 添加第三个顶点

        const nextIndex = verticesArray.length / 3; // 下一个顶点的索引
        const uvs = uvgen.generateTopUV(scope, verticesArray, nextIndex - 3, nextIndex - 2, nextIndex - 1); // 生成UV坐标

        addUV(uvs[0]); // 添加第一个顶点的UV坐标
        addUV(uvs[1]); // 添加第二个顶点的UV坐标
        addUV(uvs[2]); // 添加第三个顶点的UV坐标
      }

      /**
       * 创建四边形面的函数（分解为两个三角形）
       *
       * @param {number} a - 第一个顶点索引
       * @param {number} b - 第二个顶点索引
       * @param {number} c - 第三个顶点索引
       * @param {number} d - 第四个顶点索引
       */
      function f4(a, b, c, d) {
        // 第一个三角形：a-b-d
        addVertex(a); // 添加第一个顶点
        addVertex(b); // 添加第二个顶点
        addVertex(d); // 添加第四个顶点

        // 第二个三角形：b-c-d
        addVertex(b); // 添加第二个顶点
        addVertex(c); // 添加第三个顶点
        addVertex(d); // 添加第四个顶点

        const nextIndex = verticesArray.length / 3; // 下一个顶点的索引
        const uvs = uvgen.generateSideWallUV(scope, verticesArray, nextIndex - 6, nextIndex - 3, nextIndex - 2, nextIndex - 1); // 生成侧壁UV坐标

        // 第一个三角形的UV坐标
        addUV(uvs[0]); // 添加第一个顶点的UV坐标
        addUV(uvs[1]); // 添加第二个顶点的UV坐标
        addUV(uvs[3]); // 添加第四个顶点的UV坐标

        // 第二个三角形的UV坐标
        addUV(uvs[1]); // 添加第二个顶点的UV坐标
        addUV(uvs[2]); // 添加第三个顶点的UV坐标
        addUV(uvs[3]); // 添加第四个顶点的UV坐标
      }

      /**
       * 添加顶点到顶点数组的函数
       *
       * @param {number} index - 占位符数组中的顶点索引
       */
      function addVertex(index) {
        verticesArray.push(placeholder[index * 3 + 0]); // 添加X坐标
        verticesArray.push(placeholder[index * 3 + 1]); // 添加Y坐标
        verticesArray.push(placeholder[index * 3 + 2]); // 添加Z坐标
      }

      /**
       * 添加UV坐标到UV数组的函数
       *
       * @param {Vector2} vector2 - UV坐标向量
       */
      function addUV(vector2) {
        uvArray.push(vector2.x); // 添加U坐标
        uvArray.push(vector2.y); // 添加V坐标
      }
    }
  }

  /**
   * 复制另一个ExtrudeGeometry实例的属性到当前实例
   *
   * @param {ExtrudeGeometry} source - 要复制的源几何体对象
   * @return {ExtrudeGeometry} 返回当前实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法，复制基础属性
    super.copy(source);

    // 复制构造参数对象
    this.parameters = Object.assign({}, source.parameters);

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 将几何体序列化为JSON格式
   *
   * @return {Object} 序列化后的JSON对象
   */
  toJSON() {
    const data = super.toJSON(); // 调用父类的toJSON方法

    const shapes = this.parameters.shapes; // 获取形状参数
    const options = this.parameters.options; // 获取选项参数

    return toJSON(shapes, options, data); // 调用外部toJSON函数
  }

  /**
   * 从JSON对象创建ExtrudeGeometry实例的工厂方法
   * 用于反序列化，将序列化的JSON数据重新构建为几何体对象
   *
   * @param {Object} data - 包含序列化几何体数据的JSON对象
   * @param {Array<Shape>} shapes - 形状数组
   * @return {ExtrudeGeometry} 返回新创建的挤出几何体实例
   */
  static fromJSON(data, shapes) {
    const geometryShapes = []; // 几何体形状数组

    // 遍历数据中的形状索引，获取对应的形状对象
    for (let j = 0, jl = data.shapes.length; j < jl; j++) {
      const shape = shapes[data.shapes[j]]; // 根据索引获取形状

      geometryShapes.push(shape); // 添加到几何体形状数组
    }

    const extrudePath = data.options.extrudePath; // 获取挤出路径数据

    // 如果存在挤出路径，则重新构建路径对象
    if (extrudePath !== undefined) {
      data.options.extrudePath = new Curves[extrudePath.type]().fromJSON(extrudePath);
    }

    // 使用重构的形状和选项创建新的ExtrudeGeometry实例
    return new ExtrudeGeometry(geometryShapes, data.options);
  }
}

/**
 * 世界坐标UV生成器
 * 提供默认的UV坐标生成方法，用于顶面和侧壁的纹理映射
 */
const WorldUVGenerator = {
  /**
   * 生成顶面UV坐标的函数
   *
   * @param {ExtrudeGeometry} geometry - 几何体对象（未使用，保持接口一致性）
   * @param {Array} vertices - 顶点数组
   * @param {number} indexA - 第一个顶点索引
   * @param {number} indexB - 第二个顶点索引
   * @param {number} indexC - 第三个顶点索引
   * @return {Array<Vector2>} UV坐标数组
   */
  generateTopUV: function (geometry, vertices, indexA, indexB, indexC) {
    const a_x = vertices[indexA * 3]; // 第一个顶点的X坐标
    const a_y = vertices[indexA * 3 + 1]; // 第一个顶点的Y坐标
    const b_x = vertices[indexB * 3]; // 第二个顶点的X坐标
    const b_y = vertices[indexB * 3 + 1]; // 第二个顶点的Y坐标
    const c_x = vertices[indexC * 3]; // 第三个顶点的X坐标
    const c_y = vertices[indexC * 3 + 1]; // 第三个顶点的Y坐标

    // 直接使用XY坐标作为UV坐标
    return [new Vector2(a_x, a_y), new Vector2(b_x, b_y), new Vector2(c_x, c_y)];
  },

  /**
   * 生成侧壁UV坐标的函数
   *
   * @param {ExtrudeGeometry} geometry - 几何体对象（未使用，保持接口一致性）
   * @param {Array} vertices - 顶点数组
   * @param {number} indexA - 第一个顶点索引
   * @param {number} indexB - 第二个顶点索引
   * @param {number} indexC - 第三个顶点索引
   * @param {number} indexD - 第四个顶点索引
   * @return {Array<Vector2>} UV坐标数组
   */
  generateSideWallUV: function (geometry, vertices, indexA, indexB, indexC, indexD) {
    const a_x = vertices[indexA * 3]; // 第一个顶点的X坐标
    const a_y = vertices[indexA * 3 + 1]; // 第一个顶点的Y坐标
    const a_z = vertices[indexA * 3 + 2]; // 第一个顶点的Z坐标
    const b_x = vertices[indexB * 3]; // 第二个顶点的X坐标
    const b_y = vertices[indexB * 3 + 1]; // 第二个顶点的Y坐标
    const b_z = vertices[indexB * 3 + 2]; // 第二个顶点的Z坐标
    const c_x = vertices[indexC * 3]; // 第三个顶点的X坐标
    const c_y = vertices[indexC * 3 + 1]; // 第三个顶点的Y坐标
    const c_z = vertices[indexC * 3 + 2]; // 第三个顶点的Z坐标
    const d_x = vertices[indexD * 3]; // 第四个顶点的X坐标
    const d_y = vertices[indexD * 3 + 1]; // 第四个顶点的Y坐标
    const d_z = vertices[indexD * 3 + 2]; // 第四个顶点的Z坐标

    // 根据边的主要方向选择合适的坐标作为UV
    if (Math.abs(a_y - b_y) < Math.abs(a_x - b_x)) {
      // 如果X方向变化更大，使用X和Z坐标
      return [new Vector2(a_x, 1 - a_z), new Vector2(b_x, 1 - b_z), new Vector2(c_x, 1 - c_z), new Vector2(d_x, 1 - d_z)];
    } else {
      // 如果Y方向变化更大，使用Y和Z坐标
      return [new Vector2(a_y, 1 - a_z), new Vector2(b_y, 1 - b_z), new Vector2(c_y, 1 - c_z), new Vector2(d_y, 1 - d_z)];
    }
  },
};

/**
 * 将形状和选项序列化为JSON的辅助函数
 *
 * @param {Shape|Array<Shape>} shapes - 形状或形状数组
 * @param {Object} options - 挤出选项
 * @param {Object} data - 基础几何体数据
 * @return {Object} 序列化后的数据对象
 */
function toJSON(shapes, options, data) {
  data.shapes = []; // 初始化形状数组

  // 处理形状数据
  if (Array.isArray(shapes)) {
    // 如果是形状数组，遍历每个形状
    for (let i = 0, l = shapes.length; i < l; i++) {
      const shape = shapes[i]; // 当前形状

      data.shapes.push(shape.uuid); // 添加形状的UUID
    }
  } else {
    // 如果是单个形状，直接添加UUID
    data.shapes.push(shapes.uuid);
  }

  // 复制选项对象
  data.options = Object.assign({}, options);

  // 如果存在挤出路径，序列化路径对象
  if (options.extrudePath !== undefined) data.options.extrudePath = options.extrudePath.toJSON();

  return data; // 返回序列化后的数据
}

/**
 * 表示几何体构造函数的选项类型
 *
 * @typedef {Object} ExtrudeGeometry~Options
 * @property {number} [curveSegments=12] - 曲线上的点数，影响曲线的平滑程度
 * @property {number} [steps=1] - 沿挤出样条深度细分分段的点数
 * @property {number} [depth=1] - 挤出形状的深度
 * @property {boolean} [bevelEnabled=true] - 是否对形状进行斜角处理
 * @property {number} [bevelThickness=0.2] - 斜角深入原始形状的程度
 * @property {number} [bevelSize=bevelThickness-0.1] - 斜角从形状轮廓延伸的距离
 * @property {number} [bevelOffset=0] - 斜角从形状轮廓开始的距离
 * @property {number} [bevelSegments=3] - 斜角层数
 * @property {?Curves} [extrudePath=null] - 形状应沿其挤出的3D样条路径，路径挤出不支持斜角
 * @property {Object} [UVGenerator] - 提供自定义UV生成函数的对象
 **/

// 导出ExtrudeGeometry类，使其可以被其他模块导入和使用
export { ExtrudeGeometry };
