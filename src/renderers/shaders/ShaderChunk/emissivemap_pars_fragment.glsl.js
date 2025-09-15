export default /* glsl */`
#ifdef USE_EMISSIVEMAP // 若启用自发光贴图

	uniform sampler2D emissiveMap; // 自发光贴图采样器

#endif // 结束：USE_EMISSIVEMAP
`;
