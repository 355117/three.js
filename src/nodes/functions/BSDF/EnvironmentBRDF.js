// 导入DFG近似函数
import DFGApprox from "./DFGApprox.js";
// 从TSL基础模块导入函数构造器
import { Fn } from "../../tsl/TSLBase.js";

/**
 * 环境BRDF函数
 *
 * 用于计算基于图像的光照(IBL)中的镜面反射贡献。
 * 该函数结合了DFG近似和材质的镜面反射属性，
 * 提供了高效的环境光照计算。
 *
 * @param {Object} inputs - 输入参数
 * @param {Node} inputs.dotNV - 法线与视图方向的点积
 * @param {Node} inputs.specularColor - 镜面反射颜色
 * @param {Node} inputs.specularF90 - 掠射角镜面反射率
 * @param {Node} inputs.roughness - 表面粗糙度
 * @returns {Node} 环境BRDF值
 */
const EnvironmentBRDF = /*@__PURE__*/ Fn((inputs) => {
  const { dotNV, specularColor, specularF90, roughness } = inputs; // 解构输入参数

  const fab = DFGApprox({ dotNV, roughness }); // 计算DFG近似值
  return specularColor.mul(fab.x).add(specularF90.mul(fab.y)); // 返回：specularColor * fab.x + specularF90 * fab.y
});

export default EnvironmentBRDF; // 导出环境BRDF函数
