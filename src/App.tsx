import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import './App.css'

gsap.registerPlugin(useGSAP)

function SplitText({ text }: { text: string }) {
  return (
    <span aria-label={text} className="split-text">
      {text.split(' ').map((word, wordIndex) => (
        <span aria-hidden="true" className="split-word" key={`${word}-${wordIndex}`}>
          {word.split('').map((char, charIndex) => (
            <span className="split-char" key={`${char}-${charIndex}`}>
              {char}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}

function App() {
  const root = useRef<HTMLElement>(null)
  const canvasMount = useRef<HTMLDivElement>(null)
  const [replayKey, setReplayKey] = useState(0)

  useEffect(() => {
    const mount = canvasMount.current

    if (!mount) {
      return
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0.65, 7.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.95
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    const aircraft = new THREE.Group()
    aircraft.position.set(1.85, 0.28, 0)
    aircraft.rotation.set(-0.08, -0.52, 0.08)
    scene.add(aircraft)

    const loader = new GLTFLoader()
    let loadedModel: THREE.Object3D | null = null
    let isDisposed = false
    const disposeObject = (object: THREE.Object3D) => {
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) {
          return
        }

        child.geometry.dispose()

        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((material) => material.dispose())
      })
    }

    loader.load('/cessna_210a_centurion.glb', (gltf) => {
      const object = gltf.scene

      if (isDisposed) {
        disposeObject(object)

        return
      }

      loadedModel = object

      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) {
          return
        }

        child.castShadow = true
        child.receiveShadow = true
        child.geometry.computeVertexNormals()

        const materials = Array.isArray(child.material) ? child.material : [child.material]

        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
            material.color.set('#d9ddd6')
            material.metalness = 0.08
            material.roughness = 0.52
            material.envMapIntensity = 0.35
          }

          if ('envMapIntensity' in material) {
            material.envMapIntensity = 0.35
          }

          material.needsUpdate = true
        })
      })

      const bounds = new THREE.Box3().setFromObject(object)
      const size = new THREE.Vector3()
      const center = new THREE.Vector3()

      bounds.getSize(size)
      bounds.getCenter(center)

      const maxAxis = Math.max(size.x, size.y, size.z)
      const scale = 4.7 / maxAxis

      object.position.sub(center)
      object.scale.setScalar(scale)
      object.rotation.set(0, 0, 0)

      aircraft.add(object)
    })

    const ambient = new THREE.HemisphereLight('#eff9ff', '#6db8ff', 1.15)
    const keyLight = new THREE.DirectionalLight('#ffffff', 1.55)
    keyLight.position.set(2.8, 4.2, 4.8)
    const fillLight = new THREE.DirectionalLight('#b9ddff', 0.78)
    fillLight.position.set(-3.2, 1.8, 3.4)
    scene.add(ambient, keyLight, fillLight)

    const pointer = new THREE.Vector2(0, 0)
    let frameId = 0
    let clickLift = 0

    const resize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    const updatePointer = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2
    }

    const toggleScreen = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('button')) {
        return
      }

      clickLift = 1
    }

    const animate = () => {
      const idleFloat = Math.sin(performance.now() * 0.0012) * 0.035

      aircraft.rotation.y += (-0.52 + pointer.x * 0.22 - aircraft.rotation.y) * 0.06
      aircraft.rotation.x += (-0.08 + pointer.y * 0.08 - aircraft.rotation.x) * 0.06
      aircraft.rotation.z += (0.08 - pointer.x * 0.035 - aircraft.rotation.z) * 0.06
      aircraft.position.x += (1.85 + pointer.x * 0.06 - aircraft.position.x) * 0.06
      aircraft.position.y += (0.28 + idleFloat + clickLift * 0.24 - aircraft.position.y) * 0.08
      clickLift *= 0.9

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', updatePointer)
    window.addEventListener('pointerdown', toggleScreen)
    animate()

    return () => {
      isDisposed = true
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', updatePointer)
      window.removeEventListener('pointerdown', toggleScreen)
      mount.removeChild(renderer.domElement)
      if (loadedModel) {
        disposeObject(loadedModel)
      }
      renderer.dispose()
    }
  }, [])

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })

      // Start everything below its mask, then reveal it in a controlled order.
      gsap.set('.split-char', { yPercent: 112, rotate: 4 })
      gsap.set(['.portfolio-line', '.replay-button'], {
        autoAlpha: 0,
        y: 22,
      })

      tl.to(
          '.portfolio-title .split-char',
          {
            yPercent: 0,
            rotate: 0,
            duration: 1,
            stagger: { each: 0.026, from: 'center' },
          },
        )
        .to(
          ['.portfolio-line', '.replay-button'],
          { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.12 },
          '-=0.45',
        )
    },
    { scope: root, dependencies: [replayKey], revertOnUpdate: true },
  )

  return (
    <main className="portfolio-hero" ref={root}>
      <div className="plane-scene" ref={canvasMount} aria-hidden="true" />
      <section className="portfolio-intro" aria-labelledby="portfolio-title">
        <h1 className="portfolio-title" id="portfolio-title">
          <SplitText text="Hey I'm Andy" />
        </h1>
        <p className="portfolio-line">This portfolio is still being worked on. More soon.</p>
        <button className="replay-button" type="button" onClick={() => setReplayKey((key) => key + 1)}>
          Replay
        </button>
      </section>
    </main>
  )
}

export default App
