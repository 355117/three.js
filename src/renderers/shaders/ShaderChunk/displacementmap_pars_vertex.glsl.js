export default /* glsl */`
#ifdef USE_DISPLACEMENTMAP // 若启用位移贴图（顶点位移）

	uniform sampler2D displacementMap; // 位移贴图采样器
	uniform float displacementScale; // 位移幅度缩放
	uniform float displacementBias; // 位移偏移量

#endif // 结束：USE_DISPLACEMENTMAP
`;
