import NodeLibrary from '../../common/nodes/NodeLibrary.js'; // 引入节点库基类

// Lights // 灯光相关类与节点
import { PointLight } from '../../../lights/PointLight.js'; // 点光源类
import { DirectionalLight } from '../../../lights/DirectionalLight.js'; // 平行光类
import { RectAreaLight } from '../../../lights/RectAreaLight.js'; // 面光源类
import { SpotLight } from '../../../lights/SpotLight.js'; // 聚光灯类
import { AmbientLight } from '../../../lights/AmbientLight.js'; // 环境光类
import { HemisphereLight } from '../../../lights/HemisphereLight.js'; // 半球光类
import { LightProbe } from '../../../lights/LightProbe.js'; // 光照探针类
import IESSpotLight from '../../../lights/webgpu/IESSpotLight.js'; // IES 聚光灯（WebGPU 扩展）
import ProjectorLight from '../../../lights/webgpu/ProjectorLight.js'; // 投影灯（WebGPU 扩展）
import {
	PointLightNode,
	DirectionalLightNode,
	RectAreaLightNode,
	SpotLightNode,
	AmbientLightNode,
	HemisphereLightNode,
	LightProbeNode,
	IESSpotLightNode,
	ProjectorLightNode
} from '../../../nodes/Nodes.js';
// 上述导入：各类灯光对应的节点实现

// Tone Mapping // 色调映射相关
import { LinearToneMapping, ReinhardToneMapping, CineonToneMapping, ACESFilmicToneMapping, AgXToneMapping, NeutralToneMapping } from '../../../constants.js'; // 枚举：色调映射模式
import { linearToneMapping, reinhardToneMapping, cineonToneMapping, acesFilmicToneMapping, agxToneMapping, neutralToneMapping } from '../../../nodes/display/ToneMappingFunctions.js'; // 对应的节点实现函数

/**
 * 基础版的节点库，仅聚焦于灯光与色调映射功能。
 * 提供常见光源类型与色调映射方法的节点化映射。
 *
 * @private
 * @augments NodeLibrary
 */
class BasicNodeLibrary extends NodeLibrary { // 定义基础节点库，仅包含灯光和色调映射

	/**
	 * 构造基础节点库实例。
	 */
	constructor() { // 构造基础节点库

		super(); // 调用父类构造

		this.addLight( PointLightNode, PointLight ); // 注册点光源节点
		this.addLight( DirectionalLightNode, DirectionalLight ); // 注册平行光节点
		this.addLight( RectAreaLightNode, RectAreaLight ); // 注册矩形面光节点
		this.addLight( SpotLightNode, SpotLight ); // 注册聚光灯节点
		this.addLight( AmbientLightNode, AmbientLight ); // 注册环境光节点
		this.addLight( HemisphereLightNode, HemisphereLight ); // 注册半球光节点
		this.addLight( LightProbeNode, LightProbe ); // 注册光照探针节点
		this.addLight( IESSpotLightNode, IESSpotLight ); // 注册 IES 聚光灯节点
		this.addLight( ProjectorLightNode, ProjectorLight ); // 注册投影灯节点

		this.addToneMapping( linearToneMapping, LinearToneMapping ); // 线性色调映射
		this.addToneMapping( reinhardToneMapping, ReinhardToneMapping ); // Reinhard 色调映射
		this.addToneMapping( cineonToneMapping, CineonToneMapping ); // Cineon 色调映射
		this.addToneMapping( acesFilmicToneMapping, ACESFilmicToneMapping ); // ACES Filmic 色调映射
		this.addToneMapping( agxToneMapping, AgXToneMapping ); // AgX 色调映射
		this.addToneMapping( neutralToneMapping, NeutralToneMapping ); // 中性色调映射

	}

} // 结束 BasicNodeLibrary 类

export default BasicNodeLibrary; // 默认导出基础节点库
