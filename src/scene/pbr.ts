import * as THREE from 'three'

const loader = new THREE.TextureLoader()
const cache = new Map<string, THREE.Texture>()
const base = import.meta.env.BASE_URL

/** One shared texture per file. Loads lazily and fills in when ready, so it never suspends the scene. */
function tex(file: string, srgb: boolean, repeatX: number, repeatY: number) {
  const key = `${file}|${repeatX}|${repeatY}`
  let t = cache.get(key)
  if (!t) {
    t = loader.load(`${base}textures/${file}.webp`)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeatX, repeatY)
    t.anisotropy = 8
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    cache.set(key, t)
  }
  return t
}

/** Poly Haven (CC0) PBR set at 1k: diffuse + normal + roughness. */
export function pbrSet(name: 'marble_01' | 'dark_wood' | 'painted_plaster_wall', repeatX = 1, repeatY = 1) {
  return {
    map: tex(`${name}_diff`, true, repeatX, repeatY),
    normalMap: tex(`${name}_nor`, false, repeatX, repeatY),
    roughnessMap: tex(`${name}_rough`, false, repeatX, repeatY),
  }
}

export function artTexture(file: string) {
  const key = `art|${file}`
  let t = cache.get(key)
  if (!t) {
    t = loader.load(`${base}art/${file}.webp`)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.flipY = false // glTF UV convention
    cache.set(key, t)
  }
  return t
}
