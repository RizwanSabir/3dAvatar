import { useEffect,useRef } from 'react';
import './App.css';
import { Canvas, useFrame, useGraph } from '@react-three/fiber';
import { Color, Matrix4,Euler } from 'three';
import { useGLTF,OrbitControls } from '@react-three/drei';

import {FilesetResolver,FaceLandmarker} from '@mediapipe/tasks-vision'


let faceLandmarker;
let lastVideoTime=-1;
let video
let headMesh
let rotation
let blendshapes
function App() {

  const controls = useRef();

   const handleOnChange=()=>{

   }

   const setup= async() => {

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

     faceLandmarker = await FaceLandmarker.createFromOptions(
      vision,
      {baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
      },
        outputFaceBlendshapes: true,
  outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO"
      });

    video = document.getElementById("video")
    navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: false,
    }).then(function (stream) {
      video.srcObject = stream;
      console.log("Loading is complete");
      video.addEventListener("loadeddata", predict);
    });
   }


   const predict = async () => {
    let time1 = Date.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      try {
        const result = await faceLandmarker.detectForVideo(video, time1);

        if(result.facialTransformationMatrixes && result.facialTransformationMatrixes.length>0 && result.faceBlendshapes && result.faceBlendshapes.length>0){
    
        const matrix = new Matrix4().fromArray(result.facialTransformationMatrixes[0].data);
        rotation = new Euler().setFromRotationMatrix(matrix);
        blendshapes=result.faceBlendshapes[0].categories
        }
       
      } catch (error) {
        console.error('Error during detection:', error);
      }
    }
    requestAnimationFrame(predict);
  };
  

   useEffect(() => {
      setup()
   },[])


  return (
    <>
     <input type="text" placeholder='Enter your Id' onChange={handleOnChange} />
     <video autoPlay id='video'></video>
     <Canvas style={{height:400}} camera={{fov:25}}>
     <ambientLight intensity={0.5} />
     
     
        <pointLight position={[10, 10, 10]}  color={new Color(1, 1, 0)} intensity={0.5} castShadow />
        <pointLight position={[-10, 0, 10]} color={new Color(1, 0, 0)} intensity={0.5} castShadow />
        <pointLight position={[0, 0, 10]} intensity={0.5} castShadow />
        <OrbitControls ref={controls} />
        <Avatar/>
     </Canvas>
    </>
  );
}



function Avatar(){
  const avatar =useGLTF("https://models.readyplayer.me/6578802796c757fc3b52a055.glb?morphTargets=ARKit&textureAtlas=1024")
  const {nodes}=useGraph(avatar.scene)
  useEffect(() => {
     headMesh=nodes.Wolf3D_Avatar
  },[nodes])


  useFrame((_,delta) => {
    if(headMesh!==null){
      blendshapes.forEach(blendshape => {
        let index=headMesh.morphTargetDictionary[blendshape.categoryName]
        if(index>=0){
          headMesh.morphTargetInfluences[index] = blendshape.score;
        }
      });

      nodes.Head.rotation.set(rotation.x, rotation.y, rotation.z);
      nodes.Neck.rotation.set(rotation.x / 5 + 0.3, rotation.y / 5, rotation.z / 5);
      nodes.Spine2.rotation.set(rotation.x / 10, rotation.y / 10, rotation.z / 10);
     }
      
    
  })

  return <primitive object={avatar.scene} position={[0,-1.7,4]}/>
}

export default App;
