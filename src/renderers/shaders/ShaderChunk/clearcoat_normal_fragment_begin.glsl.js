export default /* glsl */`
#ifdef USE_CLEARCOAT // 如果启用了清漆层（clearcoat）

	vec3 clearcoatNormal = nonPerturbedNormal; // 清漆层初始法线采用未扰动的表面法线

#endif // 结束：USE_CLEARCOAT 条件
`;
