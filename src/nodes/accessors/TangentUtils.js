// 导入UV坐标获取函数
import { uv as getUV } from "./UV.js";
// 导入视图空间位置
import { positionView } from "./Position.js";
// 导入视图空间法线
import { normalView } from "./Normal.js";

// 无预计算切线的法线映射
// 参考：http://www.thetenthplanet.de/archives/1180

// 获取UV坐标
const uv = getUV();

// 计算位置在x和y方向的偏导数
const q0 = positionView.dFdx();
const q1 = positionView.dFdy();
// 计算UV在x和y方向的偏导数
const st0 = uv.dFdx();
const st1 = uv.dFdy();

// 视图空间法线
const N = normalView;

// 计算垂直向量
const q1perp = q1.cross(N);
const q0perp = N.cross(q0);

// 计算切线和副切线向量
const T = q1perp.mul(st0.x).add(q0perp.mul(st1.x));
const B = q1perp.mul(st0.y).add(q0perp.mul(st1.y));

// 计算行列式和缩放因子
const det = T.dot(T).max(B.dot(B));
const scale = det.equal(0.0).select(0.0, det.inverseSqrt());

/**
 * TSL对象 - 视图空间中的切线向量，从几何体和UV导数动态计算
 * 适用于无预计算切线的法线映射
 *
 * 参考：http://www.thetenthplanet.de/archives/1180
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const tangentViewFrame = /*@__PURE__*/ T.mul(scale).toVar("tangentViewFrame");

/**
 * TSL对象 - 视图空间中的副切线向量，从几何体和UV导数动态计算
 * 与tangentViewFrame互补，用于构建切线空间基础
 *
 * 参考：http://www.thetenthplanet.de/archives/1180
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const bitangentViewFrame = /*@__PURE__*/ B.mul(scale).toVar("bitangentViewFrame");
