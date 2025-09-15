export default /* glsl */`
#ifdef USE_DISPLACEMENTMAP // 若启用位移贴图

	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias ); // 沿法线方向按贴图值位移

#endif // 结束：USE_DISPLACEMENTMAP
`;
