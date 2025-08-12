// Three.js 转译器
// MaterialX标准库中的HSV颜色空间转换函数
// https://github.com/AcademySoftwareFoundation/MaterialX/blob/main/libraries/stdlib/genglsl/lib/mx_hsv.glsl

// 导入TSL基础类型和函数
import { int, float, vec3, If, Fn } from "../../tsl/TSLBase.js";
// 导入运算符节点
import { add } from "../../math/OperatorNode.js";
// 导入数学函数节点
import { floor, trunc, max, min } from "../../math/MathNode.js";

/**
 * 将HSV颜色空间转换为RGB颜色空间。
 *
 * HSV（色相、饱和度、明度）是一种更直观的颜色表示方法。
 * 此函数将HSV值转换为标准的RGB值。
 *
 * @param {vec3} hsv - HSV颜色值，其中：
 *                     x = 色相（Hue，0-1范围，对应0-360度）
 *                     y = 饱和度（Saturation，0-1范围）
 *                     z = 明度（Value，0-1范围）
 * @return {vec3} 转换后的RGB颜色值（每个分量0-1范围）
 */
export const mx_hsvtorgb = /*@__PURE__*/ Fn(([hsv]) => {
  // 提取饱和度和明度分量
  const s = hsv.y; // 饱和度
  const v = hsv.z; // 明度

  // 初始化结果向量
  const result = vec3().toVar();

  // 如果饱和度接近0，则为灰度色
  If(s.lessThan(0.0001), () => {
    // 灰度色：RGB三个分量都等于明度值
    result.assign(vec3(v, v, v));
  }).Else(() => {
    // 有色彩的情况
    let h = hsv.x; // 色相
    // 将色相标准化到[0,6)范围，便于后续计算
    h = h.sub(floor(h)).mul(6.0).toVar(); // TODO: 检查节点系统缓存中是否需要.toVar()
    // 获取色相的整数部分，确定在哪个色相扇区
    const hi = int(trunc(h));
    // 获取色相的小数部分，用于插值
    const f = h.sub(float(hi));
    // 计算RGB转换所需的中间值
    const p = v.mul(s.oneMinus()); // p = v * (1 - s)
    const q = v.mul(s.mul(f).oneMinus()); // q = v * (1 - s * f)
    const t = v.mul(s.mul(f.oneMinus()).oneMinus()); // t = v * (1 - s * (1 - f))

    // 根据色相扇区（0-5）确定RGB值
    If(hi.equal(int(0)), () => {
      // 扇区0：红色到黄色
      result.assign(vec3(v, t, p));
    })
      .ElseIf(hi.equal(int(1)), () => {
        // 扇区1：黄色到绿色
        result.assign(vec3(q, v, p));
      })
      .ElseIf(hi.equal(int(2)), () => {
        // 扇区2：绿色到青色
        result.assign(vec3(p, v, t));
      })
      .ElseIf(hi.equal(int(3)), () => {
        // 扇区3：青色到蓝色
        result.assign(vec3(p, q, v));
      })
      .ElseIf(hi.equal(int(4)), () => {
        // 扇区4：蓝色到洋红
        result.assign(vec3(t, p, v));
      })
      .Else(() => {
        // 扇区5：洋红到红色
        result.assign(vec3(v, p, q));
      });
  });

  return result;
}).setLayout({
  name: "mx_hsvtorgb", // 函数名称
  type: "vec3", // 返回类型
  inputs: [{ name: "hsv", type: "vec3" }], // 输入参数：HSV颜色
});

/**
 * 将RGB颜色空间转换为HSV颜色空间。
 *
 * RGB（红、绿、蓝）是加法颜色模型，而HSV提供了更直观的颜色调整方式。
 * 此函数将RGB值转换为HSV值。
 *
 * @param {vec3} c_immutable - RGB颜色值（每个分量0-1范围）
 * @return {vec3} 转换后的HSV颜色值，其中：
 *                x = 色相（Hue，0-1范围，对应0-360度）
 *                y = 饱和度（Saturation，0-1范围）
 *                z = 明度（Value，0-1范围）
 */
export const mx_rgbtohsv = /*@__PURE__*/ Fn(([c_immutable]) => {
  // 将输入RGB颜色转换为可变变量
  const c = vec3(c_immutable).toVar();
  // 提取RGB分量
  const r = float(c.x).toVar(); // 红色分量
  const g = float(c.y).toVar(); // 绿色分量
  const b = float(c.z).toVar(); // 蓝色分量

  // 计算RGB分量的最小值和最大值
  const mincomp = float(min(r, min(g, b))).toVar(); // 最小分量
  const maxcomp = float(max(r, max(g, b))).toVar(); // 最大分量
  // 计算最大值与最小值的差值
  const delta = float(maxcomp.sub(mincomp)).toVar();

  // 声明HSV分量变量
  const h = float().toVar(), // 色相
    s = float().toVar(), // 饱和度
    v = float().toVar(); // 明度

  // 明度等于最大RGB分量值
  v.assign(maxcomp);

  // 计算饱和度
  If(maxcomp.greaterThan(0.0), () => {
    // 如果最大值大于0，饱和度 = 差值 / 最大值
    s.assign(delta.div(maxcomp));
  }).Else(() => {
    // 如果最大值为0（黑色），饱和度为0
    s.assign(0.0);
  });

  // 计算色相
  If(s.lessThanEqual(0.0), () => {
    // 如果饱和度为0（灰度色），色相未定义，设为0
    h.assign(0.0);
  }).Else(() => {
    // 根据哪个RGB分量是最大值来计算色相
    If(r.greaterThanEqual(maxcomp), () => {
      // 红色是最大值：色相在红-黄或红-洋红区间
      h.assign(g.sub(b).div(delta));
    })
      .ElseIf(g.greaterThanEqual(maxcomp), () => {
        // 绿色是最大值：色相在黄-青区间
        h.assign(add(2.0, b.sub(r).div(delta)));
      })
      .Else(() => {
        // 蓝色是最大值：色相在青-洋红区间
        h.assign(add(4.0, r.sub(g).div(delta)));
      });

    // 将色相从[0,6]范围转换为[0,1]范围
    h.mulAssign(1.0 / 6.0);

    // 确保色相为正值
    If(h.lessThan(0.0), () => {
      h.addAssign(1.0);
    });
  });

  // 返回HSV颜色值
  return vec3(h, s, v);
}).setLayout({
  name: "mx_rgbtohsv", // 函数名称
  type: "vec3", // 返回类型
  inputs: [{ name: "c", type: "vec3" }], // 输入参数：RGB颜色
});
