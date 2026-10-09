/* ============================================
   main.js  –  100% Pure Vanilla JS (0% React)
   Includes:
   - Three.js 3D Character Model (Decrypted GLTF + DRACO)
   - HDR Environment Lighting & Character Animations
   - GSAP Scroll-driven Camera & Character Timelines
   - Interactive Head Rotation (Mouse & Touch Tracking)
   - Loading Screen + Smooth Progress Counter + Welcome
   - Custom Cursor & Magnetic Icons
   - What I Do Interactive Accordion
   - Career Timeline & Smooth Navigation
   ============================================ */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

// Register GSAP plugins
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

// Bone definitions for animations
const typingBoneNames = [
  "thighL", "thighR", "shinL", "shinR", "forearmL", "forearmR",
  "handL", "handR", "f_pinky03R", "f_pinky02L", "f_pinky02R",
  "f_pinky01L", "f_pinky01R", "palm04L", "palm04R", "f_ring01L",
  "thumb01L", "thumb01R", "thumb03L", "thumb03R", "palm02L",
  "palm02R", "palm01L", "palm01R", "f_index01L", "f_index01R",
  "palm03L", "palm03R", "f_ring02L", "f_ring02R", "f_ring01R",
  "f_ring03L", "f_ring03R", "f_middle01L", "f_middle02L",
  "f_middle03L", "f_middle01R", "f_middle02R", "f_middle03R",
  "f_index02L", "f_index03L", "f_index02R", "f_index03R",
  "thumb02L", "f_pinky03L", "upper_armL", "upper_armR",
  "thumb02R", "toeL", "heel02L", "toeR", "heel02R"
];
const eyebrowBoneNames = ["eyebrow_L", "eyebrow_R"];

/* ============================================
   1. DECRYPTION (Pure Web Crypto API)
   ============================================ */
async function generateAESKey(password) {
  const passwordBuffer = new TextEncoder().encode(password);
  const hashedPassword = await crypto.subtle.digest("SHA-256", passwordBuffer);
  return crypto.subtle.importKey(
    "raw",
    hashedPassword.slice(0, 32),
    { name: "AES-CBC" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decryptFile(url, password) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  const encryptedData = await response.arrayBuffer();
  const iv = new Uint8Array(encryptedData.slice(0, 16));
  const data = encryptedData.slice(16);
  const key = await generateAESKey(password);
  return crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, data);
}

/* ============================================
   2. ANIMATION HELPERS
   ============================================ */
function filterAnimationTracks(clip, boneNames) {
  const filteredTracks = clip.tracks.filter((track) =>
    boneNames.some((boneName) => track.name.includes(boneName))
  );
  return new THREE.AnimationClip(
    clip.name + "_filtered",
    clip.duration,
    filteredTracks
  );
}

function createBoneAction(gltf, mixer, clipName, boneNames) {
  const clip = THREE.AnimationClip.findByName(gltf.animations, clipName);
  if (!clip) return null;
  const filteredClip = filterAnimationTracks(clip, boneNames);
  return mixer.clipAction(filteredClip);
}

function setupAnimations(gltf, hoverDiv) {
  const character = gltf.scene;
  const mixer = new THREE.AnimationMixer(character);

  if (gltf.animations) {
    const clipNames = ["key1", "key2", "key5", "key6"];
    clipNames.forEach((name) => {
      const clip = THREE.AnimationClip.findByName(gltf.animations, name);
      if (clip) {
        const action = mixer.clipAction(clip);
        action.play();
        action.timeScale = 1.2;
      }
    });

    const typingAction = createBoneAction(gltf, mixer, "typing", typingBoneNames);
    if (typingAction) {
      typingAction.enabled = true;
      typingAction.play();
      typingAction.timeScale = 1.2;
    }
  }

  function startIntro() {
    const introClip = gltf.animations && gltf.animations.find((clip) => clip.name === "introAnimation");
    if (introClip) {
      const introAction = mixer.clipAction(introClip);
      introAction.setLoop(THREE.LoopOnce, 1);
      introAction.clampWhenFinished = true;
      introAction.reset().play();
    }
    setTimeout(() => {
      const blink = gltf.animations && gltf.animations.find((clip) => clip.name === "Blink");
      if (blink) {
        mixer.clipAction(blink).play().fadeIn(0.5);
      }
    }, 2500);
  }

  function setupHover(hoverElem) {
    if (!hoverElem) return;
    const eyeBrowUpAction = createBoneAction(gltf, mixer, "browup", eyebrowBoneNames);
    let isHovering = false;
    if (eyeBrowUpAction) {
      eyeBrowUpAction.setLoop(THREE.LoopOnce, 1);
      eyeBrowUpAction.clampWhenFinished = true;
      eyeBrowUpAction.enabled = true;
    }

    hoverElem.addEventListener("mouseenter", () => {
      if (eyeBrowUpAction && !isHovering) {
        isHovering = true;
        eyeBrowUpAction.reset();
        eyeBrowUpAction.enabled = true;
        eyeBrowUpAction.setEffectiveWeight(4);
        eyeBrowUpAction.fadeIn(0.5).play();
      }
    });

    hoverElem.addEventListener("mouseleave", () => {
      if (eyeBrowUpAction && isHovering) {
        isHovering = false;
        eyeBrowUpAction.fadeOut(0.6);
      }
    });
  }

  if (hoverDiv) {
    setupHover(hoverDiv);
  }

  return { mixer, startIntro };
}

/* ============================================
   3. LIGHTING SETUP
   ============================================ */
function setupLighting(scene) {
  const directionalLight = new THREE.DirectionalLight(0xc7a9ff, 0);
  directionalLight.intensity = 0;
  directionalLight.position.set(-0.47, -0.32, -1);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xc2a4ff, 0, 100, 3);
  pointLight.position.set(3, 12, 4);
  pointLight.castShadow = true;
  scene.add(pointLight);

  new RGBELoader()
    .setPath("models/")
    .load("char_enviorment.hdr", function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
      scene.environmentIntensity = 0;
      scene.environmentRotation.set(5.76, 85.85, 1);
    });

  function setPointLight(screenLight) {
    if (screenLight && screenLight.material && screenLight.material.opacity > 0.9) {
      pointLight.intensity = (screenLight.material.emissiveIntensity || 0) * 20;
    } else {
      pointLight.intensity = 0;
    }
  }

  function turnOnLights() {
    gsap.to(scene, {
      environmentIntensity: 0.64,
      duration: 2,
      ease: "power2.inOut",
    });
    gsap.to(directionalLight, {
      intensity: 1,
      duration: 2,
      ease: "power2.inOut",
    });
    gsap.to(".character-rim", {
      y: "55%",
      opacity: 1,
      delay: 0.2,
      duration: 2,
    });
  }

  return { setPointLight, turnOnLights };
}

/* ============================================
   4. GSAP SCROLL TIMELINES FOR 3D MODEL
   ============================================ */
let intensityIntervalId = null;
let intensity = 0;

function setCharTimeline(character, camera) {
  if (intensityIntervalId !== null) {
    clearInterval(intensityIntervalId);
  }
  intensityIntervalId = setInterval(() => {
    intensity = Math.random();
  }, 200);

  // Set base transform state (perfectly centered on screen)
  gsap.set(".character-model", { xPercent: -50, x: "0%" });

  const tl1 = gsap.timeline({
    scrollTrigger: {
      trigger: ".landing-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  const tl2 = gsap.timeline({
    scrollTrigger: {
      trigger: ".about-section",
      start: "center 55%",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  const tl3 = gsap.timeline({
    scrollTrigger: {
      trigger: ".whatIDO",
      start: "top top",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  let screenLight = null;
  let monitor = null;

  if (character) {
    character.children.forEach((object) => {
      if (object.name === "Plane004") {
        object.children.forEach((child) => {
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = 0;
            if (child.material.name === "Material.027") {
              monitor = child;
              child.material.color.set("#FFFFFF");
            }
          }
        });
      }
      if (object.name === "screenlight") {
        if (object.material) {
          object.material.transparent = true;
          object.material.opacity = 0;
          object.material.emissive.set("#C8BFFF");
          gsap.timeline({ repeat: -1, repeatRefresh: true }).to(object.material, {
            emissiveIntensity: () => intensity * 8,
            duration: () => Math.random() * 0.6,
            delay: () => Math.random() * 0.1,
          });
        }
        screenLight = object;
      }
    });
  }

  const neckBone = character ? character.getObjectByName("spine005") : null;

  if (window.innerWidth > 1024) {
    if (character) {
      tl1
        .fromTo(character.rotation, { y: 0 }, { y: 0.7, duration: 1 }, 0)
        .to(camera.position, { z: 22 }, 0)
        .fromTo(".character-model", { xPercent: -50, x: "0%" }, { xPercent: -50, x: "-25%", duration: 1 }, 0)
        .to(".landing-container", { opacity: 0, duration: 0.4 }, 0)
        .to(".landing-container", { y: "40%", duration: 0.8 }, 0)
        .fromTo(".about-me", { y: "-50%" }, { y: "0%" }, 0);

      tl2
        .to(
          camera.position,
          { z: 75, y: 8.4, duration: 6, delay: 2, ease: "power3.inOut" },
          0
        )
        .to(".about-section", { y: "30%", duration: 6 }, 0)
        .to(".about-section", { opacity: 0, delay: 3, duration: 2 }, 0)
        .fromTo(
          ".character-model",
          { pointerEvents: "inherit" },
          { pointerEvents: "none", xPercent: -50, x: "-12%", delay: 2, duration: 5 },
          0
        )
        .to(character.rotation, { y: 0.92, x: 0.12, delay: 3, duration: 3 }, 0);

      if (neckBone) {
        tl2.to(neckBone.rotation, { x: 0.6, delay: 2, duration: 3 }, 0);
      }
      if (monitor) {
        tl2
          .to(monitor.material, { opacity: 1, duration: 0.8, delay: 3.2 }, 0)
          .fromTo(
            monitor.position,
            { y: -10, z: 2 },
            { y: 0, z: 0, delay: 1.5, duration: 3 },
            0
          );
      }
      if (screenLight) {
        tl2.to(screenLight.material, { opacity: 1, duration: 0.8, delay: 4.5 }, 0);
      }
      tl2
        .fromTo(
          ".what-box-in",
          { display: "none" },
          { display: "flex", duration: 0.1, delay: 6 },
          0
        )
        .fromTo(
          ".character-rim",
          { opacity: 1, scaleX: 1.4 },
          { opacity: 0, scale: 0, y: "-70%", duration: 5, delay: 2 },
          0.3
        );

      tl3
        .fromTo(
          ".character-model",
          { y: "0%" },
          { y: "-100%", duration: 4, ease: "none", delay: 1 },
          0
        )
        .fromTo(".whatIDO", { y: 0 }, { y: "15%", duration: 2 }, 0)
        .to(character.rotation, { x: -0.04, duration: 2, delay: 1 }, 0);
    }
  } else {
    if (character) {
      const tM2 = gsap.timeline({
        scrollTrigger: {
          trigger: ".what-box-in",
          start: "top 70%",
          end: "bottom top",
        },
      });
      tM2.to(".what-box-in", { display: "flex", duration: 0.1, delay: 0 }, 0);
    }
  }
}

function setAllTimeline() {
  const careerTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".career-section",
      start: "top 30%",
      end: "100% center",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  careerTimeline
    .fromTo(".career-timeline", { maxHeight: "10%" }, { maxHeight: "100%", duration: 0.5 }, 0)
    .fromTo(".career-timeline", { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0)
    .fromTo(".career-info-box", { opacity: 0 }, { opacity: 1, stagger: 0.1, duration: 0.5 }, 0)
    .fromTo(".career-dot", { animationIterationCount: "infinite" }, { animationIterationCount: "1", delay: 0.3, duration: 0.1 }, 0);

  if (window.innerWidth > 1024) {
    careerTimeline.fromTo(".career-section", { y: 0 }, { y: "20%", duration: 0.5, delay: 0.2 }, 0);
  } else {
    careerTimeline.fromTo(".career-section", { y: 0 }, { y: 0, duration: 0.5, delay: 0.2 }, 0);
  }
}

/* ============================================
   5. HEAD ROTATION (Mouse & Touch)
   ============================================ */
let mouse = { x: 0, y: 0 };
let interpolation = { x: 0.1, y: 0.2 };

function handleMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function handleTouchMove(event) {
  if (event.touches && event.touches[0]) {
    mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
  }
}

function handleTouchEnd() {
  setTimeout(() => {
    mouse = { x: 0, y: 0 };
    interpolation = { x: 0.03, y: 0.03 };
    setTimeout(() => {
      mouse = { x: 0, y: 0 };
      interpolation = { x: 0.1, y: 0.2 };
    }, 1000);
  }, 2000);
}

function handleHeadRotation(headBone, mouseX, mouseY, interpolationX, interpolationY) {
  if (!headBone) return;
  if (window.scrollY < 200) {
    const maxRotation = Math.PI / 6;
    headBone.rotation.y = THREE.MathUtils.lerp(
      headBone.rotation.y,
      mouseX * maxRotation,
      interpolationY
    );
    const minRotationX = -0.3;
    const maxRotationX = 0.4;
    if (mouseY > minRotationX) {
      if (mouseY < maxRotationX) {
        headBone.rotation.x = THREE.MathUtils.lerp(
          headBone.rotation.x,
          -mouseY - 0.5 * maxRotation,
          interpolationX
        );
      } else {
        headBone.rotation.x = THREE.MathUtils.lerp(
          headBone.rotation.x,
          -maxRotation - 0.5 * maxRotation,
          interpolationX
        );
      }
    } else {
      headBone.rotation.x = THREE.MathUtils.lerp(
        headBone.rotation.x,
        -minRotationX - 0.5 * maxRotation,
        interpolationX
      );
    }
  } else {
    if (window.innerWidth > 1024) {
      headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, -0.4, 0.03);
      headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, -0.3, 0.03);
    }
  }
}

/* ============================================
   6. MAIN 3D CHARACTER INITIALIZER
   ============================================ */
function initCharacterScene(onLoaded) {
  const canvasDiv = document.getElementById("characterModel");
  const hoverDiv = document.getElementById("characterHover");
  if (!canvasDiv) return;

  const rect = canvasDiv.getBoundingClientRect();
  const width = canvasDiv.clientWidth || rect.width || window.innerWidth;
  const height = canvasDiv.clientHeight || rect.height || window.innerHeight;
  const aspect = width / height;
  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  canvasDiv.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(14.5, aspect, 0.1, 1000);
  camera.position.set(0, 13.1, 24.7);
  camera.zoom = 1.1;
  camera.updateProjectionMatrix();

  let headBone = null;
  let screenLight = null;
  let mixer = null;
  let character = null;

  const clock = new THREE.Clock();
  const light = setupLighting(scene);

  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("draco/");
  loader.setDRACOLoader(dracoLoader);

  // Load decrypted 3D model
  decryptFile("models/character.enc", "Character3D#@")
    .then((decryptedBuffer) => {
      const blobUrl = URL.createObjectURL(new Blob([decryptedBuffer]));
      loader.load(
        blobUrl,
        async (gltf) => {
          character = gltf.scene;
          await renderer.compileAsync(character, camera, scene);
          character.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.frustumCulled = true;
            }
          });

          const animData = setupAnimations(gltf, hoverDiv);
          mixer = animData.mixer;

          scene.add(character);
          headBone = character.getObjectByName("spine006") || null;
          screenLight = character.getObjectByName("screenlight") || null;

          const footR = character.getObjectByName("footR");
          const footL = character.getObjectByName("footL");
          if (footR) footR.position.y = 3.36;
          if (footL) footL.position.y = 3.36;

          setCharTimeline(character, camera);
          setAllTimeline();
          dracoLoader.dispose();

          if (onLoaded) {
            onLoaded({
              turnOnLights: light.turnOnLights,
              startIntro: animData.startIntro,
            });
          }
        },
        undefined,
        (err) => {
          console.error("Error loading GLTF model:", err);
          if (onLoaded) onLoaded(null);
        }
      );
    })
    .catch((err) => {
      console.error("Decryption error:", err);
      if (onLoaded) onLoaded(null);
    });

  // Event Listeners for 3D interaction
  window.addEventListener("mousemove", handleMouseMove);

  const landingDiv = document.getElementById("landingDiv");
  if (landingDiv) {
    landingDiv.addEventListener("touchmove", handleTouchMove, { passive: true });
    landingDiv.addEventListener("touchend", handleTouchEnd);
  }

  function handleResize() {
    if (!canvasDiv) return;
    const w = canvasDiv.clientWidth || window.innerWidth;
    const h = canvasDiv.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const workTrigger = ScrollTrigger.getById("work");
    ScrollTrigger.getAll().forEach((trigger) => {
      if (trigger !== workTrigger) {
        trigger.kill();
      }
    });
    if (character) {
      setCharTimeline(character, camera);
    }
    setAllTimeline();
    ScrollTrigger.refresh();
  }

  window.addEventListener("resize", handleResize);

  // Render loop
  function animate() {
    requestAnimationFrame(animate);
    if (headBone) {
      handleHeadRotation(
        headBone,
        mouse.x,
        mouse.y,
        interpolation.x,
        interpolation.y
      );
      light.setPointLight(screenLight);
    }
    const delta = clock.getDelta();
    if (mixer) {
      mixer.update(delta);
    }
    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================
   7. ENTRANCE & UI ANIMATIONS
   ============================================ */
function initialFX() {
  document.body.style.overflowY = "auto";
  const main = document.getElementById("mainBody");
  if (main) main.classList.add("main-active");

  gsap.to("body", {
    backgroundColor: "#0b080c",
    duration: 0.5,
    delay: 1,
  });

  gsap.fromTo(
    [".landing-info h3", ".landing-intro h2", ".landing-intro h1"],
    { opacity: 0, y: 50, filter: "blur(5px)" },
    {
      opacity: 1,
      duration: 1.2,
      filter: "blur(0px)",
      ease: "power3.inOut",
      y: 0,
      stagger: 0.1,
      delay: 0.3,
    }
  );

  gsap.fromTo(
    ".landing-info-h2",
    { opacity: 0, y: 30 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power1.inOut",
      y: 0,
      delay: 0.8,
    }
  );

  gsap.fromTo(
    [".header", ".icons-section", ".nav-fade"],
    { opacity: 0 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power1.inOut",
      delay: 0.1,
    }
  );

  // Looping text swap between Developer and Designer
  setupTextLoops();
}

function setupTextLoops() {
  const h2_1 = document.querySelector(".landing-h2-1");
  const h2_2 = document.querySelector(".landing-h2-2");
  if (h2_1 && h2_2) {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });
    tl.fromTo(h2_2, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: "power3.inOut", delay: 3 }, 0)
      .fromTo(h2_1, { opacity: 1, y: 0 }, { opacity: 0, y: -40, duration: 1, ease: "power3.inOut", delay: 3 }, 0)
      .fromTo(h2_1, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: "power3.inOut", delay: 7 }, 1)
      .to(h2_2, { opacity: 0, y: -40, duration: 1, ease: "power3.inOut", delay: 7 }, 1);
  }

  const h2_info = document.querySelector(".landing-h2-info");
  const h2_info1 = document.querySelector(".landing-h2-info-1");
  if (h2_info && h2_info1) {
    const tl2 = gsap.timeline({ repeat: -1, repeatDelay: 1 });
    tl2.fromTo(h2_info1, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: "power3.inOut", delay: 3 }, 0)
       .fromTo(h2_info, { opacity: 1, y: 0 }, { opacity: 0, y: -40, duration: 1, ease: "power3.inOut", delay: 3 }, 0)
       .fromTo(h2_info, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: "power3.inOut", delay: 7 }, 1)
       .to(h2_info1, { opacity: 0, y: -40, duration: 1, ease: "power3.inOut", delay: 7 }, 1);
  }
}

/* ============================================
   8. LOADING CONTROLLER
   ============================================ */
function initLoader() {
  const percentEl = document.getElementById("loadingPercent");
  const loadingWrap = document.getElementById("loadingWrap");
  const loadingButton = document.getElementById("loadingButton");
  const loadingScreen = document.getElementById("loadingScreen") || document.getElementById("loading-screen");
  const loadingHeader = document.getElementById("loading-header");
  const loaderGame = document.getElementById("loaderGame");

  let percent = 0;
  let modelCallbacks = null;
  let isDone = false;

  // Progress increments smoothly while model downloads
  const progressInterval = setInterval(() => {
    if (percent < 85) {
      percent += Math.floor(Math.random() * 6) + 1;
      if (percentEl) percentEl.textContent = `${Math.min(percent, 85)}%`;
    }
  }, 100);

  function finishLoading(callbacks) {
    modelCallbacks = callbacks;
    clearInterval(progressInterval);

    // Fast count to 100%
    const endInterval = setInterval(() => {
      if (percent < 100) {
        percent += 2;
        if (percentEl) percentEl.textContent = `${Math.min(percent, 100)}%`;
      } else {
        clearInterval(endInterval);
        if (percentEl) percentEl.textContent = "100%";
        if (loadingButton) loadingButton.classList.add("loading-complete");

        setTimeout(() => {
          enableEnter();
        }, 800);
      }
    }, 20);
  }

  function enableEnter() {
    if (loadingWrap) {
      loadingWrap.style.cursor = "pointer";
      loadingWrap.addEventListener("click", enterSite, { once: true });
    }
    // Auto enter after 2.5s if not clicked
    setTimeout(() => {
      if (!isDone) enterSite();
    }, 2500);
  }

  function enterSite() {
    if (isDone) return;
    isDone = true;

    if (loadingWrap) loadingWrap.classList.add("loading-clicked");
    if (loaderGame) loaderGame.classList.add("loader-out");

    setTimeout(() => {
      if (loadingScreen) {
        gsap.to(loadingScreen, {
          opacity: 0,
          duration: 0.8,
          ease: "power2.inOut",
          onComplete: () => {
            loadingScreen.style.display = "none";
          },
        });
      }
      if (loadingHeader) {
        gsap.to(loadingHeader, {
          opacity: 0,
          duration: 0.8,
          ease: "power2.inOut",
          onComplete: () => {
            loadingHeader.style.display = "none";
          },
        });
      }

      // Trigger scene lights and character entrance
      initialFX();
      if (modelCallbacks && typeof modelCallbacks.turnOnLights === "function") {
        setTimeout(() => {
          modelCallbacks.turnOnLights();
          if (typeof modelCallbacks.startIntro === "function") {
            modelCallbacks.startIntro();
          }
        }, 1000);
      }
    }, 600);
  }

  // Track hover glow on button
  if (loadingWrap) {
    loadingWrap.addEventListener("mousemove", (e) => {
      const rect = loadingWrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      loadingWrap.style.setProperty("--mouse-x", `${x}px`);
      loadingWrap.style.setProperty("--mouse-y", `${y}px`);
    });
  }

  return { finishLoading };
}

/* ============================================
   9. CUSTOM CURSOR
   ============================================ */
function initCursor() {
  const cursor = document.getElementById("cursor");
  if (!cursor) return;

  window.addEventListener("mousemove", (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  });

  const interactiveElements = document.querySelectorAll(
    "a, button, [data-cursor], .what-content, .work-box, .career-info-box"
  );

  interactiveElements.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      const cursorType = el.getAttribute("data-cursor");
      if (cursorType === "disable") {
        cursor.classList.add("cursor-disable");
      } else if (cursorType === "icons") {
        cursor.classList.add("cursor-icons");
      } else {
        cursor.style.setProperty("--size", "80px");
      }
    });

    el.addEventListener("mouseleave", () => {
      cursor.classList.remove("cursor-disable", "cursor-icons");
      cursor.style.setProperty("--size", "50px");
    });
  });
}

/* ============================================
   10. MAGNETIC SOCIAL ICONS
   ============================================ */
function initSocialIcons() {
  const spans = document.querySelectorAll(".social-icons span");
  spans.forEach((span) => {
    span.addEventListener("mousemove", (e) => {
      const rect = span.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      gsap.to(span, {
        x: x * 0.4,
        y: y * 0.4,
        duration: 0.3,
        ease: "power2.out",
      });
    });

    span.addEventListener("mouseleave", () => {
      gsap.to(span, {
        x: 0,
        y: 0,
        duration: 0.7,
        ease: "elastic.out(1, 0.3)",
      });
    });
  });
}

/* ============================================
   11. WHAT I DO ACCORDION INTERACTION
   ============================================ */
function initWhatIDo() {
  const cards = document.querySelectorAll(".what-content");
  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      cards.forEach((c) => {
        if (c !== card) c.classList.add("what-sibling");
      });
      card.classList.add("what-content-active");
    });

    card.addEventListener("mouseleave", () => {
      cards.forEach((c) => {
        c.classList.remove("what-sibling", "what-content-active");
      });
    });
  });
}

/* ============================================
   12. SMOOTH NAVBAR SCROLL
   ============================================ */
function initSmoothScroll() {
  document.querySelectorAll('.header a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

/* ============================================
   13. BOOTSTRAP APPLICATION
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Start Loader
  const loader = initLoader();

  // 2. Init Three.js 3D Scene + Decrypt Character Model
  initCharacterScene((callbacks) => {
    loader.finishLoading(callbacks);
  });

  // 3. UI Enhancements
  initCursor();
  initSocialIcons();
  initWhatIDo();
  initSmoothScroll();
});
