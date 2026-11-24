import {
  ACESFilmicToneMapping, DataTexture, EquirectangularReflectionMapping, FloatType,
  LinearSRGBColorSpace, Mesh, MeshPhysicalMaterial, PerspectiveCamera, PMREMGenerator,
  RGBAFormat, Scene, SphereGeometry, WebGLRenderer,
} from 'three'

const panels = [
  { u: .18, v: .59, w: .019, h: .25, color: [6.2, 8.8, 12] },
  { u: .36, v: .74, w: .11, h: .026, color: [4, 5.4, 7] },
  { u: .56, v: .36, w: .02, h: .16, color: [1.35, 3.2, 6.4] },
  { u: .74, v: .49, w: .021, h: .25, color: [4.3, 7.2, 9.8] },
  { u: .94, v: .28, w: .11, h: .037, color: [2.1, 4.1, 7.4] },
  { u: .04, v: .56, w: .013, h: .13, color: [3.7, 5.8, 8.2] },
  { u: .62, v: .17, w: .14, h: .02, color: [3.2, 6.1, 9.2] },
]

function studioLights() {
  const width = 256
  const height = 128
  const pixels = new Float32Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const v = y / height
      pixels[i] = .012
      pixels[i + 1] = .019
      pixels[i + 2] = .032
      pixels[i + 3] = 1
      for (const light of panels) {
        const offset = Math.abs(x / width - light.u)
        const u = Math.min(offset, 1 - offset) / light.w
        const t = Math.abs(v - light.v) / light.h
        const intensity = Math.exp(-2.5 * (u ** 4 + t ** 4))
        for (let channel = 0; channel < 3; channel++) pixels[i + channel] += intensity * light.color[channel]
      }
    }
  }
  const texture = new DataTexture(pixels, width, height, RGBAFormat, FloatType)
  texture.mapping = EquirectangularReflectionMapping
  texture.colorSpace = LinearSRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function dropGeometry() {
  const geometry = new SphereGeometry(1, 80, 56)
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const top = (y + 1) / 2
    const width = 1.16 - .58 * top ** 1.4
    const swell = 1 + .09 * Math.sin(3.4 * x - 2.8 * y + 2.3 * z) * Math.cos(2.9 * z + y)
    positions.setXYZ(i,
      x * width * swell + .21 * top ** 2 + .035 * z * y,
      1.02 * y + .05 * x * z,
      z * width * swell * .86 + .14 * top ** 2,
    )
  }
  geometry.computeVertexNormals()
  return geometry
}

export function createWaterDrop(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('webgl2', { antialias: true, alpha: false })
  if (!context) return
  const renderer = new WebGLRenderer({ canvas, context, antialias: true, alpha: false })
  renderer.setClearColor(0x000000)
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.16
  renderer.transmissionResolutionScale = .7

  const camera = new PerspectiveCamera(31, 1, .1, 30)
  camera.position.set(0, .01, 4.45)
  const scene = new Scene()
  const source = studioLights()
  const pmrem = new PMREMGenerator(renderer)
  const environment = pmrem.fromEquirectangular(source)
  scene.environment = environment.texture
  source.dispose()
  pmrem.dispose()

  const geometry = dropGeometry()
  const material = new MeshPhysicalMaterial({
    color: 0xe6f4ff,
    roughness: .045,
    transmission: 1,
    thickness: 1.55,
    ior: 1.333,
    attenuationColor: 0x8fc7ef,
    attenuationDistance: 2.6,
    dispersion: .17,
    envMapIntensity: 1.7,
  })
  const mesh = new Mesh(geometry, material)
  scene.add(mesh)

  return {
    draw(yaw: number, pitch: number, lighting: number) {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) return
      const ratio = Math.min(window.devicePixelRatio, 1.5, 700 / Math.max(width, height))
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        renderer.setDrawingBufferSize(width, height, ratio)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
      mesh.rotation.set(-.1 + pitch, .35 + yaw, -.22, 'YXZ')
      scene.environmentRotation.set(.1 - lighting * .19, .4 + lighting * .52, -.04)
      renderer.render(scene, camera)
    },
    dispose(releaseContext = false) {
      geometry.dispose()
      material.dispose()
      environment.dispose()
      renderer.dispose()
      if (releaseContext) renderer.forceContextLoss()
    },
  }
}
