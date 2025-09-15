export default /* glsl */`

#ifdef USE_IRIDESCENCEMAP // 若启用虹彩强度贴图

	uniform sampler2D iridescenceMap; // 虹彩强度贴图采样器

#endif // 结束：USE_IRIDESCENCEMAP

#ifdef USE_IRIDESCENCE_THICKNESSMAP // 若启用薄膜厚度贴图

	uniform sampler2D iridescenceThicknessMap; // 虹彩薄膜厚度贴图采样器

#endif // 结束：USE_IRIDESCENCE_THICKNESSMAP
`;
