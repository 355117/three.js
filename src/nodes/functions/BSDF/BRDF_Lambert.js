// 从TSL基础模块导入函数构造器
import { Fn } from "../../tsl/TSLBase.js";

/**
 * Lambert双向反射分布函数（BRDF）
 *
 * Lambert BRDF是最简单的漫反射模型，假设表面在所有方向上
 * 均匀地反射光线。这是一个理想的漫反射表面模型。
 *
 * Lambert定律表明，表面的辐射亮度在所有观察角度下都是恒定的，
 * 这使得表面看起来具有均匀的亮度，不受观察角度影响。
 *
 * BRDF值 = albedo / π
 * 其中π是归一化因子，确保能量守恒。
 *
 * @param {Object} inputs - 输入参数
 * @param {Node} inputs.diffuseColor - 漫反射颜色（反照率）
 * @returns {Node} Lambert BRDF值
 */
const BRDF_Lambert = /*@__PURE__*/ Fn((inputs) => {
  return inputs.diffuseColor.mul(1 / Math.PI); // 点光源：漫反射颜色除以π进行归一化
}); // 已验证

export default BRDF_Lambert; // 导出Lambert BRDF函数
