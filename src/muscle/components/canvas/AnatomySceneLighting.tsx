/** Three-point lighting tuned for readable muscle form on the navy canvas. */
export default function AnatomySceneLighting() {
  return (
    <>
      <ambientLight intensity={0.34} />
      <hemisphereLight args={['#fff6ee', '#1a2744', 0.42]} />
      <directionalLight position={[3.2, 7.5, 4.5]} intensity={1.75} color="#fff8f2" />
      <directionalLight position={[-3.8, 2.5, 2]} intensity={0.28} color="#c8d8f0" />
      <directionalLight position={[0.5, 1.5, -5]} intensity={0.38} color="#ffd8c8" />
    </>
  );
}
