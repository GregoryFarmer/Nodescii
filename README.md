
```
 _  _         _            _ _ 
| \| |___  __| |___ ___ __(_|_)
| .` / _ \/ _` / -_|_-</ _| | |
|_|\_\___/\__,_\___/__/\__|_|_|
```

<div align="center">
  <table>
    <tr>
      <td width="100%">
        <img width="380" src="https://media.discordapp.net/attachments/1296940074562355212/1538395477534441562/demo.gif?ex=6a8285ef&is=6a81346f&hm=63126c6a600885bf1a6748e65597bd8ce6cb0840db0de318063329371ce8f7c5&=&width=512&height=288" alt="Nodescii Demo" />
      </td>
    </tr>
  </table>
</div>

# Welcome to Nodescii
Nodescii is a TypeScript-powered rendering engine for taking in video frames and outputting rendered ASCII videos. It utilizes WebGPU compute shaders, worker threads, and a custom image decoder. 

# Installation
1. Install [Git](https://git-scm.com/install/)
2. Install [Node.js v20.18.0](https://nodejs.org/en/download/current) or above.
3. Use the following Git command to clone the repository. Alternatively, you could download the source code directly.
```
git clone git@github.com:GregoryFarmer/Nodescii.git
```
4. ``cd`` into the source directory.
5. Install the dependencies:
```bat
npm install
```
6. Run ``npm run build``
7. Run ``npm run start``

# Features
* GPU-accelerated ASCII rendering. Through the use of WebGPU compute shaders, pixels are being processed graphically. This means that there is a speed advantage over CPU rendering.
* Minimal dependencies; Nodescii doesn't rely on multiple dependencies. It only relies on one: ``webgpu``. Image decoding is done through a custom-built decoder class. 
* Worker bees! Each frame is processed in their own worker thread, allowing for paralleism.
* A CPU-fallback option in case if  there is a lack of a GPU or if the client's GPU is failing.

# Compatibility
In development, the following tools were used:
```
Node v20.18.0
npm 10.8.2
```