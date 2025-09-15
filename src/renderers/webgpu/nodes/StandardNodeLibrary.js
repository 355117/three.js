import NodeLibrary from '../../common/nodes/NodeLibrary.js'; // 引入节点库基类

// Materials // 材质相关节点与类
import MeshPhongNodeMaterial from '../../../materials/nodes/MeshPhongNodeMaterial.js'; // Phong 材质（节点版）
import MeshStandardNodeMaterial from '../../../materials/nodes/MeshStandardNodeMaterial.js'; // 标准 PBR 材质（节点版）
import MeshPhysicalNodeMaterial from '../../../materials/nodes/MeshPhysicalNodeMaterial.js'; // 物理材质（节点版）
import MeshToonNodeMaterial from '../../../materials/nodes/MeshToonNodeMaterial.js'; // 卡通材质（节点版）
import MeshBasicNodeMaterial from '../../../materials/nodes/MeshBasicNodeMaterial.js'; // 基础材质（节点版）
import MeshLambertNodeMaterial from '../../../materials/nodes/MeshLambertNodeMaterial.js'; // Lambert 材质（节点版）
import MeshNormalNodeMaterial from '../../../materials/nodes/MeshNormalNodeMaterial.js'; // 法线材质（节点版）
import MeshMatcapNodeMaterial from '../../../materials/nodes/MeshMatcapNodeMaterial.js'; // Matcap 材质（节点版）
import LineBasicNodeMaterial from '../../../materials/nodes/LineBasicNodeMaterial.js'; // 线条基础材质（节点版）
import LineDashedNodeMaterial from '../../../materials/nodes/LineDashedNodeMaterial.js'; // 虚线材质（节点版）
import PointsNodeMaterial from '../../../materials/nodes/PointsNodeMaterial.js'; // 点材质（节点版）
import SpriteNodeMaterial from '../../../materials/nodes/SpriteNodeMaterial.js'; // 精灵材质（节点版）
import ShadowNodeMaterial from '../../../materials/nodes/ShadowNodeMaterial.js'; // 阴影材质（节点版）
//import { MeshDepthMaterial } from '../../../materials/MeshDepthMaterial.js'; // 深度材质（原版）
//import MeshDepthNodeMaterial from '../../../materials/nodes/MeshDepthNodeMaterial.js'; // 深度材质（节点版，可按需启用）
//import { MeshDistanceMaterial } from '../../../materials/MeshDistanceMaterial.js'; // 距离材质（原版）
//import MeshDistanceNodeMaterial from '../../../materials/nodes/MeshDistanceNodeMaterial.js'; // 距离材质（节点版，可按需启用）

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
 * 标准版节点库，供 {@link WebGPURenderer} 使用。
 * 将灯光、色调映射与材质映射到基于节点的实现。
 *
 * @private
 * @augments NodeLibrary
 */
class StandardNodeLibrary extends NodeLibrary { // 标准节点库，供 WebGPURenderer 使用

	/**
	 * 构造标准节点库实例。
	 */
	constructor() { // 构造标准节点库

		super(); // 调用父类构造

		this.addMaterial( MeshPhongNodeMaterial, 'MeshPhongMaterial' ); // 注册 Phong 材质
		this.addMaterial( MeshStandardNodeMaterial, 'MeshStandardMaterial' ); // 注册标准 PBR 材质
		this.addMaterial( MeshPhysicalNodeMaterial, 'MeshPhysicalMaterial' ); // 注册物理材质
		this.addMaterial( MeshToonNodeMaterial, 'MeshToonMaterial' ); // 注册卡通材质
		this.addMaterial( MeshBasicNodeMaterial, 'MeshBasicMaterial' ); // 注册基础材质
		this.addMaterial( MeshLambertNodeMaterial, 'MeshLambertMaterial' ); // 注册 Lambert 材质
		this.addMaterial( MeshNormalNodeMaterial, 'MeshNormalMaterial' ); // 注册法线材质
		this.addMaterial( MeshMatcapNodeMaterial, 'MeshMatcapMaterial' ); // 注册 Matcap 材质
		this.addMaterial( LineBasicNodeMaterial, 'LineBasicMaterial' ); // 注册线基础材质
		this.addMaterial( LineDashedNodeMaterial, 'LineDashedMaterial' ); // 注册虚线材质
		this.addMaterial( PointsNodeMaterial, 'PointsMaterial' ); // 注册点材质
		this.addMaterial( SpriteNodeMaterial, 'SpriteMaterial' ); // 注册精灵材质
		this.addMaterial( ShadowNodeMaterial, 'ShadowMaterial' ); // 注册阴影材质

		this.addLight( PointLightNode, PointLight ); // 注册点光节点
		this.addLight( DirectionalLightNode, DirectionalLight ); // 注册平行光节点
		this.addLight( RectAreaLightNode, RectAreaLight ); // 注册面光节点
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

} // 结束 StandardNodeLibrary 类

export default StandardNodeLibrary; // 默认导出标准节点库
