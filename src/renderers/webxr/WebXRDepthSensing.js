import { PlaneGeometry } from '../../geometries/PlaneGeometry.js'; // 导入平面几何体，用于可视化深度的平面网格
import { ShaderMaterial } from '../../materials/ShaderMaterial.js'; // 导入自定义着色器材质，用于片元写入深度
import { Mesh } from '../../objects/Mesh.js'; // 导入网格对象，用于组合几何体和材质
import { ExternalTexture } from '../../textures/ExternalTexture.js'; // 导入外部纹理封装，承载 XR 深度纹理

const _occlusion_vertex = `
// 顶点着色器：直接将顶点坐标传递到裁剪空间
void main() { // 主函数入口

	gl_Position = vec4( position, 1.0 ); // 采用输入位置，w=1.0，直接输出裁剪空间位置

}`; // 顶点着色器源码（字符串）

const _occlusion_fragment = `
// 片元着色器：从 depthColor 纹理数组采样深度，并写入 gl_FragDepth
uniform sampler2DArray depthColor; // 深度+颜色纹理数组（两层：0=左或颜色，1=右或深度）
uniform float depthWidth; // 深度纹理宽度（用于将屏幕坐标归一化）
uniform float depthHeight; // 深度纹理高度

void main() { // 主函数入口

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight ); // 计算纹理坐标（0..2 的 x 范围）

	if ( coord.x >= 1.0 ) { // 若 x>=1，表示访问第二个切片（索引 1）

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r; // 采样切片 1 的深度并写入 gl_FragDepth

	} else { // 否则访问第一个切片（索引 0）

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r; // 采样切片 0 的深度

	}

}`; // 片元着色器源码（字符串）

/**
 * 类概要：XR 深度感知（Depth Sensing）访问管理模块。
 * - 作用：封装 XR 深度纹理的初始化、网格可视化与获取接口。
 * - 参数：无。
 * - 返回：无（类定义）。
 */
class WebXRDepthSensing {

	/**
	 * 构造函数概要：创建深度感知模块实例。
	 * - 参数：无。
	 * - 返回：WebXRDepthSensing 实例。
	 */
	constructor() {

		/**
		 * 表示用户环境深度的不可透明外部纹理。
		 * @type {?ExternalTexture}
		 */
		this.texture = null; // XR 深度纹理，初始化为 null，按需设置

		/**
		 * 用于可视化深度纹理的平面网格。
		 * @type {?Mesh}
		 */
		this.mesh = null; // 可视化网格，懒创建

		/**
		 * 深度近裁剪值（来自运行时）。
		 * @type {number}
		 */
		this.depthNear = 0; // 近裁剪距离，初始化为 0

		/**
		 * 深度远裁剪值（来自运行时）。
		 * @type {number}
		 */
		this.depthFar = 0; // 远裁剪距离，初始化为 0

	}

	/**
	 * 方法概要：初始化深度感知模块。
	 * - 参数：
	 *   - {XRWebGLDepthInformation} depthData XR 深度数据对象。
	 *   - {XRRenderState} renderState XR 渲染状态。
	 * - 返回：无。
	 */
	init( depthData, renderState ) { // 基于 XR 深度信息初始化外部纹理与深度范围

		if ( this.texture === null ) { // 若尚未创建外部纹理

			const texture = new ExternalTexture( depthData.texture ); // 以运行时提供的纹理句柄创建 ExternalTexture

			if ( ( depthData.depthNear !== renderState.depthNear ) || ( depthData.depthFar !== renderState.depthFar ) ) { // 若运行时深度范围与渲染状态不一致

				this.depthNear = depthData.depthNear; // 更新近裁剪值
				this.depthFar = depthData.depthFar; // 更新远裁剪值

			}

			this.texture = texture; // 缓存外部深度纹理

		}

	}

	/**
	 * 方法概要：返回一个用于可视化深度纹理的平面网格。
	 * - 参数：{ArrayCamera} cameraXR XR 相机（用于获取视口尺寸）。
	 * - 返回：{?Mesh} 若已初始化则返回平面网格，否则为 null。
	 */
	getMesh( cameraXR ) { // 懒创建着色器与网格并返回

		if ( this.texture !== null ) { // 仅在已有深度纹理时创建/返回网格

			if ( this.mesh === null ) { // 若网格尚未创建

				const viewport = cameraXR.cameras[ 0 ].viewport; // 取第一个子相机的视口（x,y,w,h）
				const material = new ShaderMaterial( { // 创建着色器材质
					vertexShader: _occlusion_vertex, // 设置顶点着色器
					fragmentShader: _occlusion_fragment, // 设置片元着色器
					uniforms: { // 传递 uniform 参数
						depthColor: { value: this.texture }, // 深度纹理数组
						depthWidth: { value: viewport.z }, // 视口宽度（供着色器归一化）
						depthHeight: { value: viewport.w } // 视口高度（供着色器归一化）
					}
				} );

				this.mesh = new Mesh( new PlaneGeometry( 20, 20 ), material ); // 创建 20x20 的平面网格并绑定材质

			}

		}

		return this.mesh; // 返回（可能为 null）

	}

	/**
	 * 方法概要：重置模块。
	 * - 参数：无。
	 * - 返回：无。
	 */
	reset() { // 清理纹理与网格引用

		this.texture = null; // 释放外部纹理引用
		this.mesh = null; // 释放可视化网格引用

	}

	/**
	 * 方法概要：返回表示用户环境深度的外部纹理。
	 * - 参数：无。
	 * - 返回：{?ExternalTexture} 深度纹理或 null。
	 */
	getDepthTexture() { // 获取深度纹理

		return this.texture; // 返回当前纹理引用

	}

}

export { WebXRDepthSensing }; // 导出 WebXRDepthSensing 模块
