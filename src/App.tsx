import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import About from './components/About'
import { SplitText } from './components/SplitText'
import './App.css'

gsap.registerPlugin(useGSAP)

function App() {
  const root = useRef<HTMLDivElement>(null)
  const canvasMount = useRef<HTMLDivElement>(null)
  const windCanvas = useRef<HTMLCanvasElement>(null)
  const flightProgress = useRef(0)
  const flightTarget = useRef(0)
  const [flightActive, setFlightActive] = useState(false)

  useEffect(() => {
    flightTarget.current = flightActive ? 1 : 0
  }, [flightActive])

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
    renderer.setClearColor(0x54baff, 0)
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
      const t = performance.now()
      const idleFloat = Math.sin(t * 0.0012) * 0.05
      const windX = Math.sin(t * 0.00043) * 0.022 + Math.sin(t * 0.00097) * 0.011
      const windY = Math.sin(t * 0.00061) * 0.018 + Math.sin(t * 0.00134) * 0.009
      const windRoll = Math.sin(t * 0.00052) * 0.022 + Math.sin(t * 0.00089) * 0.012
      flightProgress.current += (flightTarget.current - flightProgress.current) * 0.08
      const scrollAmount = flightProgress.current
      const cruiseX = 1.85 + pointer.x * 0.06 + windX
      const cruiseY = 0.28 + idleFloat + clickLift * 0.24 + windY
      const cruiseRotY = -0.52 + pointer.x * 0.45
      const cruiseRotX = -0.08 + pointer.y * 0.08
      const cruiseRotZ = 0.08 - pointer.x * 0.16 + windRoll

      const approachX = THREE.MathUtils.lerp(cruiseX, 1.35 + pointer.x * 0.06 + windX, scrollAmount)
      const approachY = THREE.MathUtils.lerp(cruiseY, 0.08 + idleFloat + clickLift * 0.24 + windY, scrollAmount)
      const approachRotY = THREE.MathUtils.lerp(cruiseRotY, -0.38 + pointer.x * 0.45, scrollAmount)
      const approachRotX = THREE.MathUtils.lerp(cruiseRotX, -0.12 + pointer.y * 0.08, scrollAmount)
      const approachRotZ = THREE.MathUtils.lerp(cruiseRotZ, 0.05 - pointer.x * 0.16 + windRoll, scrollAmount)
      const approachScale = THREE.MathUtils.lerp(1, 1.06, scrollAmount)

      aircraft.rotation.y += (approachRotY - aircraft.rotation.y) * 0.06
      aircraft.rotation.x += (approachRotX - aircraft.rotation.x) * 0.06
      aircraft.rotation.z += (approachRotZ - aircraft.rotation.z) * 0.06
      aircraft.position.x += (approachX - aircraft.position.x) * 0.06
      aircraft.position.y += (approachY - aircraft.position.y) * 0.08
      aircraft.scale.setScalar(approachScale)
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

  useEffect(() => {
    let wheelTotal = 0
    let settleTimer = window.setTimeout(() => undefined, 0)

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      wheelTotal = Math.max(-120, Math.min(120, wheelTotal + event.deltaY * 0.36))
      window.clearTimeout(settleTimer)

      if (wheelTotal > 34) {
        setFlightActive(true)
      }

      if (wheelTotal < -34) {
        setFlightActive(false)
      }

      settleTimer = window.setTimeout(() => {
        wheelTotal = 0
      }, 180)
    }

    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.clearTimeout(settleTimer)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [])

  useEffect(() => {
    const canvas = windCanvas.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      w = canvas.offsetWidth
      h = canvas.offsetHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    setSize()
    window.addEventListener('resize', setSize)

    type Streak = {
      x: number; y: number; len: number
      curve: number; speed: number
      lineWidth: number; opacity: number; age: number
      warpFreq: number; warpPhase: number
    }

    const streaks: Streak[] = []

    const spawn = (scatterX = false): Streak => ({
      x: scatterX ? Math.random() * (w + 200) - 100 : w + 60,
      y: Math.random() * h,
      len: 70 + Math.random() * 140,
      curve: (Math.random() - 0.5) * 58,
      speed: 0.8 + Math.random() * 1.8,
      lineWidth: 0.5 + Math.random() * 0.85,
      opacity: 0.13 + Math.random() * 0.19,
      age: 0,
      warpFreq: 0.010 + Math.random() * 0.022,
      warpPhase: Math.random() * Math.PI * 2,
    })

    for (let i = 0; i < 10; i++) streaks.push(spawn(true))

    let rafId = 0

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      if (Math.random() < 0.028 && streaks.length < 18) {
        const clusterY = Math.random() * h
        const count = Math.random() < 0.45 ? 1 : Math.random() < 0.6 ? 2 : 3
        for (let c = 0; c < count; c++) {
          const s = spawn()
          s.y = clusterY + (Math.random() - 0.5) * 38
          s.len *= 0.8 + Math.random() * 0.4
          streaks.push(s)
        }
      }

      for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i]
        s.x -= s.speed
        s.age++

        const totalLife = (w + s.len + 120) / s.speed
        const fadeFrames = Math.min(55, totalLife * 0.22)
        const fadeIn = Math.min(s.age / fadeFrames, 1)
        const fadeOut = Math.min((totalLife - s.age) / fadeFrames, 1)
        const alpha = s.opacity * fadeIn * fadeOut

        if (alpha <= 0.002 || s.x + s.len < -20) {
          streaks.splice(i, 1)
          continue
        }

        const x0 = s.x
        const x2 = s.x + s.len
        const t1 = Math.sin(s.age * s.warpFreq + s.warpPhase)
        const t2 = Math.sin(s.age * s.warpFreq + s.warpPhase + Math.PI * 0.62)
        const cp1y = s.y + s.curve * t1
        const cp2y = s.y + s.curve * t2

        const grad = ctx.createLinearGradient(x0, 0, x2, 0)
        grad.addColorStop(0,    `rgba(255,255,255,0)`)
        grad.addColorStop(0.12, `rgba(255,255,255,${alpha.toFixed(3)})`)
        grad.addColorStop(0.88, `rgba(255,255,255,${alpha.toFixed(3)})`)
        grad.addColorStop(1,    `rgba(255,255,255,0)`)

        ctx.beginPath()
        ctx.moveTo(x0, s.y)
        ctx.bezierCurveTo(x0 + s.len * 0.33, cp1y, x0 + s.len * 0.67, cp2y, x2, s.y)
        ctx.strokeStyle = grad
        ctx.lineWidth = s.lineWidth * (0.65 + 0.35 * Math.abs(t1))
        ctx.lineCap = 'round'
        ctx.stroke()
      }

      rafId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', setSize)
    }
  }, [])

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })

      gsap.set('.portfolio-title .split-char', { yPercent: 112, rotate: 4 })
      gsap.set(['.portfolio-line', '.replay-button'], { autoAlpha: 0, y: 22 })

      // About section initial state — each element animated independently on entry
      gsap.set('.about-title', { autoAlpha: 0 })
      gsap.set('.about-title .split-char', { yPercent: -115, rotate: -8, autoAlpha: 0 })
      gsap.set('.about-copy', { autoAlpha: 0, x: -14, filter: 'blur(7px)' })
      gsap.set('.about-actions', { autoAlpha: 0, y: 14, scale: 0.82 })

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
    { scope: root },
  )

  useEffect(
    () => {
      gsap.to('.portfolio-intro', {
        autoAlpha: flightActive ? 0 : 1,
        y: flightActive ? -34 : 0,
        scale: flightActive ? 0.97 : 1,
        duration: 0.9,
        ease: 'power3.inOut',
        pointerEvents: flightActive ? 'none' : 'auto',
        overwrite: 'auto',
      })

      if (flightActive) {
        // Title: chars fall from above, masked by split-word overflow:hidden
        gsap.set('.about-title', { autoAlpha: 1 })
        gsap.to('.about-title .split-char', {
          yPercent: 0,
          rotate: 0,
          autoAlpha: 1,
          duration: 0.65,
          ease: 'power4.out',
          stagger: { each: 0.07, from: 'start' },
          delay: 0.3,
          overwrite: 'auto',
        })
        // Copy: defocused + offset left → sharp and in place
        gsap.to('.about-copy', {
          autoAlpha: 1,
          x: 0,
          filter: 'blur(0px)',
          duration: 0.78,
          ease: 'power3.out',
          delay: 0.72,
          overwrite: 'auto',
        })
        // Buttons: spring scale pop
        gsap.to('.about-actions', {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: 'back.out(1.8)',
          delay: 1.0,
          overwrite: 'auto',
        })
      } else {
        // Exit: snap everything out fast
        gsap.to('.about-title', { autoAlpha: 0, duration: 0.25, ease: 'power2.in', overwrite: 'auto' })
        gsap.to(['.about-copy', '.about-actions'], {
          autoAlpha: 0,
          duration: 0.2,
          ease: 'power2.in',
          overwrite: 'auto',
        })
        // Reset chars so the animation replays cleanly next time
        gsap.set('.about-title .split-char', { yPercent: -115, rotate: -8, autoAlpha: 0, delay: 0.3 })
      }

      gsap.to('.sky-background', {
        xPercent: flightActive ? -4 : 0,
        yPercent: flightActive ? -3 : 0,
        scale: flightActive ? 1.14 : 1,
        duration: 1.25,
        ease: 'power4.inOut',
        overwrite: 'auto',
      })

      return () => {
        gsap.killTweensOf(['.portfolio-intro', '.about-scene > *', '.sky-background'])
      }
    },
    [flightActive],
  )

  return (
    <div className="portfolio-page" ref={root}>
      <main className="portfolio-hero">
        <div className="sky-background" aria-hidden="true" />
        <canvas className="wind-canvas" ref={windCanvas} aria-hidden="true" />
        <div className="plane-scene" ref={canvasMount} aria-hidden="true" />
        <section className="portfolio-intro" aria-labelledby="portfolio-title">
          <h1 className="portfolio-title" id="portfolio-title">
            <SplitText text="Hey I'm Andy" />
          </h1>
          <p className="portfolio-line">This portfolio is still being worked on. More soon.</p>
          <button className="replay-button" type="button" onClick={() => setFlightActive((active) => !active)}>
            {flightActive ? 'Reset' : 'Preview flight'}
          </button>
        </section>
        <About />
      </main>
    </div>
  )
}

export default App
