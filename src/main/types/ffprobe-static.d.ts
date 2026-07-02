declare module 'ffprobe-static' {
  interface FfprobeStatic {
    readonly path: string
  }

  const ffprobeStatic: FfprobeStatic
  export default ffprobeStatic
}
